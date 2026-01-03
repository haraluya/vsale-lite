# PostgreSQL Views vs Materialized Views 研究報告
## 在 Vsale-lite 報表系統中的應用

**研究日期**: 2026-01-03
**撰寫者**: Claude Code
**適用範圍**: 005-reports-analytics 功能開發
**研究狀態**: 完成

---

## Executive Summary (執行摘要)

針對 Vsale-lite 的報表與分析系統 (005-reports-analytics)，我們研究了 PostgreSQL 中 Views (一般檢視) 與 Materialized Views (物化檢視) 在三種場景中的應用。

### 核心建議

**針對您的場景，建議採用混合策略**:

| 報表類型 | 資料更新頻率 | 推薦方案 | 原因 |
|---------|-----------|--------|------|
| **銷售報表** | 新訂單每日 10-100 筆 | 一般 Views | 資料量小，查詢邏輯簡單，即時性優先 |
| **庫存分析** | 實時變化 | 一般 Views | 庫存變動頻繁，需要實時反映 |
| **客戶統計** | 新增/修改每日 1-5 筆 | Materialized View + 排程 REFRESH | 計算複雜，更新頻率低，可接受延遲 |

---

## 1. 理論基礎

### 1.1 一般 Views (Regular Views)

**定義**: 一個虛擬表，儲存查詢邏輯而非實際資料。每次查詢都執行底層的 SQL。

**特性**:
```sql
CREATE VIEW sales_summary AS
SELECT
  DATE(o.created_at) as order_date,
  COUNT(*) as total_orders,
  SUM(o.total_amount) as daily_revenue
FROM orders o
WHERE o.status = 'confirmed'
GROUP BY DATE(o.created_at)
ORDER BY order_date DESC;
```

**優點**:
- ✅ 資料永遠最新（即時性完美）
- ✅ 儲存空間極小（不儲存中間結果）
- ✅ 邏輯一致性好（變動自動反映）
- ✅ 適合資料變化頻繁的場景

**缺點**:
- ❌ 每次查詢都要執行完整運算
- ❌ 複雜聚合查詢可能效能較慢
- ❌ 不支援索引
- ❌ 大資料集查詢可能超時

**查詢效能特性**:
```
資料量       查詢時間   說明
------------------------------------------
1,000筆      < 50ms    即時回應
10,000筆     50-150ms  可接受延遲
100,000筆    200-500ms 接近上限
1,000,000筆  > 1000ms  需要優化或改用 Materialized View
```

---

### 1.2 Materialized Views (物化檢視)

**定義**: 將檢視的查詢結果實際儲存在資料庫中，形成一個實體表。

**特性**:
```sql
CREATE MATERIALIZED VIEW sales_summary_materialized AS
SELECT
  DATE(o.created_at) as order_date,
  COUNT(*) as total_orders,
  SUM(o.total_amount) as daily_revenue
FROM orders o
WHERE o.status = 'confirmed'
GROUP BY DATE(o.created_at)
ORDER BY order_date DESC;

-- 需要定期更新
REFRESH MATERIALIZED VIEW CONCURRENTLY sales_summary_materialized;
```

**優點**:
- ✅ 查詢極快（預先計算）
- ✅ 可建立索引提升查詢速度
- ✅ 適合複雜聚合、大資料集
- ✅ 負載穩定（不隨查詢複雜度變化）
- ✅ Supabase 完全支援

**缺點**:
- ❌ 資料會有延遲（需定期 REFRESH）
- ❌ 占用磁碟空間（儲存完整結果）
- ❌ 更新期間可能鎖表
- ❌ 需要維護 REFRESH 策略
- ❌ 多個 Materialized Views 會增加維護成本

**資料延遲特性**:
```
REFRESH 頻率      資料最大延遲   維護成本    適用場景
----------------------------------------------------------
每分鐘            1 分鐘        高         實時交易系統
每 5 分鐘          5 分鐘        中         訂單監控
每 30 分鐘         30 分鐘       低         報表系統
每日一次          24 小時       極低       歷史分析
```

---

## 2. Supabase 支援度分析

### 2.1 Supabase 對 Views 的支援

**完整支援** ✅

- 建立/修改/刪除 Views
- 透過 Supabase Studio SQL Editor 執行
- 可在 RLS 中直接引用 Views

**範例**: 在 migration 中建立 View
```sql
-- supabase/migrations/20260110_sales_views.sql
CREATE OR REPLACE VIEW vw_daily_sales AS
SELECT
  DATE(o.created_at) as order_date,
  COUNT(*) as order_count,
  SUM(o.total_amount) as revenue
FROM orders o
WHERE o.status IN ('confirmed', 'shipping', 'completed')
GROUP BY DATE(o.created_at)
ORDER BY order_date DESC;

-- RLS Policy 應用到 View
ALTER TABLE vw_daily_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view sales summary"
  ON vw_daily_sales FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

---

### 2.2 Supabase 對 Materialized Views 的支援

**完整支援** ✅

- 建立/刪除 Materialized Views
- 支援 `REFRESH MATERIALIZED VIEW` 指令
- 支援 `REFRESH MATERIALIZED VIEW CONCURRENTLY`（避免完全鎖定）
- 可透過 Supabase Functions 自動化 REFRESH

**RLS 與 Materialized Views 的互動**:
```sql
-- ⚠️ 重要：Materialized View 不支援 RLS 直接應用
-- 解決方案：1. 在 View 層面過濾資料
--          2. 在 Server Action 層面過濾資料
--          3. 建立多個受限的 Materialized Views

-- 方案 1: 在建立時過濾（推薦）
CREATE MATERIALIZED VIEW mv_admin_sales_summary AS
SELECT
  o.id,
  o.order_number,
  DATE(o.created_at) as order_date,
  COUNT(*) OVER (PARTITION BY DATE(o.created_at)) as daily_orders,
  SUM(o.total_amount) OVER (PARTITION BY DATE(o.created_at)) as daily_revenue
FROM orders o
WHERE o.status IN ('confirmed', 'shipping', 'completed');
-- 資料限制在 Server Action 層

-- 方案 2: Server Action 層面驗證
export async function getAdminSalesData() {
  const { role } = await checkAuth(); // 確保僅管理員能存取
  if (role !== 'admin') return { success: false, message: '無權限' };

  // 查詢 Materialized View
  const { data } = await supabase.from('mv_admin_sales_summary').select();
  return data;
}
```

**Supabase 中 REFRESH 的自動化方式**:

```sql
-- 方案 A: PostgreSQL Extension (pg_cron) - Supabase 支援
-- 注意：需要在 Supabase 後台啟用 pg_cron extension

-- 首先啟用 extension（需要 Supabase 管理員權限）
-- SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';

-- 方案 B: PostgreSQL Function + 主動呼叫（推薦用於 Supabase）
CREATE OR REPLACE FUNCTION refresh_sales_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_sales_summary;
  RAISE NOTICE 'Sales summary refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- 方案 C: Next.js Scheduled Task（在應用層控制）
// app/api/cron/refresh-views/route.ts
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('refresh_sales_summary');

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true, timestamp: new Date() });
}

// 透過 Firebase Cloud Scheduler 每日凌晨 2 點觸發
// URL: https://your-app.com/api/cron/refresh-views
// Authorization: Bearer YOUR_CRON_SECRET
```

**Supabase 中 CONCURRENT REFRESH 的限制**:

```sql
-- 標準 REFRESH（會鎖表）
REFRESH MATERIALIZED VIEW mv_admin_sales_summary;
-- 持續時間：可能 5-30 秒
-- 影響：查詢會被堵塞

-- CONCURRENT REFRESH（推薦）
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_sales_summary;
-- 持續時間：較長但允許讀操作
-- 前置條件：View 必須有 UNIQUE INDEX
-- 影響：最小化查詢中斷

-- 建立唯一索引（支援 CONCURRENT REFRESH）
CREATE UNIQUE INDEX idx_sales_summary_date
  ON mv_admin_sales_summary(order_date);
```

---

## 3. 場景分析

### 場景 1: 銷售報表（訂單統計、營收分析）

**需求特徵**:
- 資料更新頻率：日均 10-100 筆新訂單
- 查詢頻率：管理員每小時查詢 5-10 次
- 查詢複雜度：中等（含 JOIN、GROUP BY）
- 即時性要求：高（需要最新訂單狀態）
- 資料量：100-1000 筆訂單/月

**推薦方案: 一般 Views** ⭐⭐⭐⭐⭐

**原因**:
1. 資料更新頻繁（每日 10-100 筆），需要即時反映
2. 查詢複雜度適中，不需要提前計算
3. 資料量小（日均查詢 < 1000 筆），一般 Views 性能足夠
4. 維護成本低（無需 REFRESH 策略）

**實作範例**:

```sql
-- supabase/migrations/20260110_sales_views.sql

-- View 1: 日銷售統計
CREATE OR REPLACE VIEW vw_daily_sales_summary AS
SELECT
  DATE(o.created_at)::date as order_date,
  COUNT(*) as total_orders,
  COUNT(CASE WHEN o.status = 'confirmed' THEN 1 END) as confirmed_orders,
  COALESCE(SUM(CASE WHEN o.status IN ('confirmed', 'shipping', 'completed')
                    THEN o.total_amount ELSE 0 END), 0) as confirmed_revenue,
  COALESCE(AVG(CASE WHEN o.status IN ('confirmed', 'shipping', 'completed')
                    THEN o.total_amount END), 0) as avg_order_value
FROM orders o
WHERE o.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE(o.created_at)
ORDER BY order_date DESC;

-- View 2: 訂單狀態分佈
CREATE OR REPLACE VIEW vw_order_status_distribution AS
SELECT
  o.status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM orders), 2) as percentage,
  COALESCE(SUM(o.total_amount), 0) as total_amount
FROM orders o
WHERE o.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY o.status
ORDER BY count DESC;

-- View 3: 熱銷商品排行 (Top 20)
CREATE OR REPLACE VIEW vw_top_products AS
SELECT
  oi.product_id,
  oi.product_name_snapshot,
  COUNT(*) as order_count,
  SUM(oi.quantity) as total_quantity,
  COALESCE(SUM(oi.subtotal), 0) as total_revenue,
  ROUND(COALESCE(AVG(oi.deal_price), 0), 2) as avg_price
FROM order_items oi
WHERE oi.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY oi.product_id, oi.product_name_snapshot
ORDER BY total_revenue DESC
LIMIT 20;

-- View 4: 營收趨勢 (按周)
CREATE OR REPLACE VIEW vw_weekly_revenue_trend AS
SELECT
  DATE_TRUNC('week', o.created_at)::date as week_start,
  COUNT(*) as orders,
  COALESCE(SUM(o.total_amount), 0) as revenue,
  COALESCE(AVG(o.total_amount), 0) as avg_order_value
FROM orders o
WHERE o.status IN ('confirmed', 'shipping', 'completed')
  AND o.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('week', o.created_at)
ORDER BY week_start DESC;
```

**Server Action 實作**:

```typescript
// lib/actions/analytics.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'

export async function getSalesOverview(dateRange?: {
  startDate: string
  endDate: string
}) {
  try {
    const { role } = await checkAuth()
    if (role !== 'admin') {
      return { success: false, message: '無權限' }
    }

    const supabase = await createClient()

    // 查詢 Views（不涉及 RLS，因為已在查詢時過濾）
    const { data: dailySales } = await supabase
      .from('vw_daily_sales_summary')
      .select('*')
      .order('order_date', { ascending: false })
      .limit(30)

    const { data: topProducts } = await supabase
      .from('vw_top_products')
      .select('*')
      .limit(20)

    const { data: statusDist } = await supabase
      .from('vw_order_status_distribution')
      .select('*')

    return {
      success: true,
      data: {
        dailySales,
        topProducts,
        statusDistribution: statusDist,
      }
    }
  } catch (error) {
    console.error('getSalesOverview error:', error)
    return {
      success: false,
      message: '查詢銷售報表失敗'
    }
  }
}
```

**效能預測**:
```
View 查詢性能分析（基於 1 年、~30,000 筆訂單）
--------------------------------------------------
vw_daily_sales_summary: ~80ms     (計算 365 天聚合)
vw_order_status_distribution: ~50ms  (5 種狀態分組)
vw_top_products: ~120ms           (21 次排序與限制)
合計: ~250ms (p95)                 ✅ 符合 < 500ms 目標
```

---

### 場景 2: 庫存分析（庫存水位、缺貨預警）

**需求特徵**:
- 資料更新頻率：訂單確認時庫存變化（高頻）
- 查詢頻率：管理員每 10-30 分鐘查詢 1 次
- 查詢複雜度：低（簡單 JOIN 和計算）
- 即時性要求：極高（需要實時庫存狀態）
- 資料量：100-200 件商品

**推薦方案: 一般 Views** ⭐⭐⭐⭐⭐

**原因**:
1. 庫存變動頻繁且隨時發生，延遲不可接受
2. 資料量小（商品數有限），查詢速度快
3. 負庫存支援需要實時計算
4. 不涉及複雜聚合，View 性能完全足夠

**實作範例**:

```sql
-- supabase/migrations/20260110_inventory_views.sql

-- View 1: 庫存水位監控
CREATE OR REPLACE VIEW vw_stock_status AS
SELECT
  p.id,
  p.name,
  p.sku,
  p.stock as current_stock,
  p.retail_price,
  c.name as category_name,
  s.name as series_name,
  CASE
    WHEN p.stock > 10 THEN 'in_stock'
    WHEN p.stock > 0 THEN 'low_stock'
    WHEN p.stock = 0 THEN 'out_of_stock'
    ELSE 'negative_stock'
  END as stock_status,
  CASE
    WHEN p.stock > 10 THEN '庫存充足'
    WHEN p.stock > 0 THEN '庫存不足'
    WHEN p.stock = 0 THEN '缺貨中'
    ELSE '欠貨'
  END as stock_label
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN series s ON p.series_id = s.id
WHERE p.status = 'active'
ORDER BY p.stock ASC;

-- View 2: 缺貨預警清單
CREATE OR REPLACE VIEW vw_low_stock_alert AS
SELECT
  p.id,
  p.name,
  p.sku,
  p.stock,
  c.name as category_name,
  s.code as series_code,
  CASE
    WHEN p.stock < 0 THEN '緊急：負庫存'
    WHEN p.stock = 0 THEN '警告：缺貨'
    WHEN p.stock <= 5 THEN '提醒：庫存即將不足'
    ELSE '正常'
  END as alert_level
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN series s ON p.series_id = s.id
WHERE p.status = 'active'
  AND p.stock <= 5
ORDER BY p.stock ASC;

-- View 3: 商品庫存週轉分析
CREATE OR REPLACE VIEW vw_stock_turnover_rate AS
SELECT
  p.id,
  p.name,
  p.stock,
  COUNT(oi.id)::float as orders_last_30days,
  SUM(oi.quantity)::float as units_sold_last_30days,
  CASE
    WHEN COUNT(oi.id) = 0 THEN 0
    ELSE ROUND((SUM(oi.quantity)::float / ABS(p.stock + 0.1)) * 100, 2)
  END as turnover_rate,
  ROUND(DATE_PART('day', NOW() - MIN(oi.created_at))::float /
        NULLIF(COUNT(oi.id), 0), 1) as days_per_order
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
  AND oi.created_at >= NOW() - INTERVAL '30 days'
WHERE p.status = 'active'
GROUP BY p.id, p.name, p.stock
ORDER BY units_sold_last_30days DESC;
```

**Server Action 實作**:

```typescript
// lib/actions/analytics.ts
'use server'

export async function getInventoryStatus() {
  try {
    const { role } = await checkAuth()
    if (role !== 'admin') {
      return { success: false, message: '無權限' }
    }

    const supabase = await createClient()

    // 查詢即時庫存狀態
    const { data: stockStatus, error: stockError } = await supabase
      .from('vw_stock_status')
      .select('*')
      .order('current_stock', { ascending: true })

    // 查詢缺貨預警
    const { data: lowStockAlerts, error: alertError } = await supabase
      .from('vw_low_stock_alert')
      .select('*')
      .order('stock', { ascending: true })

    // 查詢週轉率分析
    const { data: turnoverRates, error: turnoverError } = await supabase
      .from('vw_stock_turnover_rate')
      .select('*')
      .limit(20)

    if (stockError || alertError || turnoverError) {
      throw new Error('查詢庫存資料失敗')
    }

    return {
      success: true,
      data: {
        stockStatus,
        lowStockAlerts,
        turnoverRates,
        criticalCount: (lowStockAlerts || []).filter(
          item => item.alert_level.includes('緊急')
        ).length,
      }
    }
  } catch (error) {
    console.error('getInventoryStatus error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢庫存分析失敗'
    }
  }
}
```

**效能預測**:
```
View 查詢性能分析（基於 100-200 件商品）
--------------------------------------------------
vw_stock_status: ~30ms           (簡單 JOIN + CASE)
vw_low_stock_alert: ~25ms        (單層過濾)
vw_stock_turnover_rate: ~150ms   (複雜 LEFT JOIN + GROUP BY)
合計: ~205ms (p95)                ✅ 符合 < 500ms 目標
```

---

### 場景 3: 客戶分析（等級分佈、購買行為、客單價）

**需求特徵**:
- 資料更新頻率：低（新客戶每日 1-5 筆，購買歷史不變）
- 查詢頻率：管理員每天查詢 2-3 次
- 查詢複雜度：高（多層 JOIN、複雜聚合、複雜計算）
- 即時性要求：中等（日更新即可）
- 資料量：1,000+ 客戶 × 12 個月歷史 = 大規模聚合

**推薦方案: Materialized View + 定時 REFRESH** ⭐⭐⭐⭐

**原因**:
1. 計算複雜（客戶 → 訂單 → 訂單明細 → 價格 → 統計）
2. 更新頻率低（可接受日延遲）
3. 資料量大（聚合涉及數千行記錄）
4. 維護成本可控（每日一次刷新）

**實作範例**:

```sql
-- supabase/migrations/20260110_customer_analytics.sql

-- 步驟 1: 建立 Materialized View (複雜計算)
CREATE MATERIALIZED VIEW mv_customer_stats AS
SELECT
  p.id,
  p.phone,
  p.display_name,
  t.id as tier_id,
  t.name as tier_name,
  COUNT(DISTINCT o.id)::integer as total_orders,
  COALESCE(SUM(o.total_amount), 0)::decimal(10,2) as total_spent,
  COALESCE(AVG(o.total_amount), 0)::decimal(10,2) as avg_order_value,
  COALESCE(MAX(o.created_at), '1970-01-01'::timestamptz) as last_order_date,
  EXTRACT(day FROM (NOW() - COALESCE(MAX(o.created_at), NOW())))::integer
    as days_since_last_order,
  COUNT(DISTINCT CASE WHEN o.created_at >= NOW() - INTERVAL '30 days'
                      THEN o.id END)::integer as orders_last_30days,
  COALESCE(SUM(CASE WHEN o.created_at >= NOW() - INTERVAL '30 days'
                    THEN o.total_amount ELSE 0 END), 0)::decimal(10,2)
    as spent_last_30days
FROM profiles p
LEFT JOIN tiers t ON p.tier_id = t.id
LEFT JOIN orders o ON p.id = o.user_id
WHERE p.role = 'client'
GROUP BY p.id, p.phone, p.display_name, t.id, t.name;

-- 建立唯一索引（支援 CONCURRENT REFRESH）
CREATE UNIQUE INDEX idx_customer_stats_id ON mv_customer_stats(id);

-- 步驟 2: 建立 Materialized View (等級分佈)
CREATE MATERIALIZED VIEW mv_tier_distribution AS
SELECT
  t.id,
  t.name as tier_name,
  COUNT(p.id)::integer as customer_count,
  ROUND(100.0 * COUNT(p.id) /
    (SELECT COUNT(*) FROM profiles WHERE role = 'client'), 2)::decimal(5,2)
    as percentage,
  COALESCE(SUM(COALESCE(s.total_spent, 0)), 0)::decimal(10,2)
    as total_tier_revenue,
  COALESCE(AVG(COALESCE(s.avg_order_value, 0)), 0)::decimal(10,2)
    as avg_customer_value
FROM tiers t
LEFT JOIN profiles p ON t.id = p.tier_id AND p.role = 'client'
LEFT JOIN mv_customer_stats s ON p.id = s.id
GROUP BY t.id, t.name;

CREATE UNIQUE INDEX idx_tier_distribution_id ON mv_tier_distribution(id);

-- 步驟 3: 建立 REFRESH 函數
CREATE OR REPLACE FUNCTION refresh_customer_analytics()
RETURNS void AS $$
DECLARE
  start_time TIMESTAMPTZ;
BEGIN
  start_time := NOW();

  -- CONCURRENT REFRESH 允許讀操作繼續進行
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tier_distribution;

  -- 記錄到日誌表（可選）
  RAISE NOTICE 'Customer analytics refreshed. Duration: %ms',
    EXTRACT(millisecond FROM (NOW() - start_time))::integer;
END;
$$ LANGUAGE plpgsql;
```

**自動化 REFRESH 策略**:

```typescript
// app/api/cron/refresh-analytics/route.ts
// 透過 Firebase Cloud Scheduler 每日凌晨 2 點呼叫

import { createClient as createServerClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  // 驗證 Cron 請求
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // 需要管理員權限
    )

    // 執行 REFRESH
    const { error } = await supabase.rpc('refresh_customer_analytics')

    if (error) {
      console.error('REFRESH failed:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500 }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date(),
        message: 'Customer analytics refreshed successfully'
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Cron error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    )
  }
}

// Firebase Cloud Scheduler 設定
// - 名稱: refresh-customer-analytics
// - 頻率: 0 2 * * * (每日凌晨 2 點，UTC)
// - URL: https://your-app.com/api/cron/refresh-analytics
// - HTTP 方法: POST
// - 認證標頭:
//   - 標頭: Authorization
//   - 值: Bearer YOUR_CRON_SECRET (存放在 .env.production)
```

**Server Action 實作**:

```typescript
// lib/actions/analytics.ts
'use server'

export async function getCustomerAnalytics(params?: {
  tierId?: string
  sortBy?: 'spent' | 'orders' | 'recent'
}) {
  try {
    const { role } = await checkAuth()
    if (role !== 'admin') {
      return { success: false, message: '無權限' }
    }

    const supabase = await createClient()

    // 查詢客戶統計（來自 Materialized View）
    let query = supabase
      .from('mv_customer_stats')
      .select('*')

    // 依等級篩選
    if (params?.tierId) {
      query = query.eq('tier_id', params.tierId)
    }

    // 排序選項
    const sortMap = {
      spent: { column: 'total_spent', ascending: false },
      orders: { column: 'total_orders', ascending: false },
      recent: { column: 'last_order_date', ascending: false },
    }
    const sort = sortMap[params?.sortBy || 'spent']
    query = query.order(sort.column, { ascending: sort.ascending })

    const { data: customerStats, error: statsError } = await query

    // 查詢等級分佈（來自 Materialized View）
    const { data: tierDistribution, error: tierError } = await supabase
      .from('mv_tier_distribution')
      .select('*')
      .order('customer_count', { ascending: false })

    if (statsError || tierError) {
      throw new Error('查詢客戶資料失敗')
    }

    return {
      success: true,
      data: {
        customers: customerStats || [],
        tierDistribution: tierDistribution || [],
        totalCustomers: customerStats?.length || 0,
        totalRevenue: customerStats?.reduce(
          (sum, c) => sum + (c.total_spent || 0), 0
        ) || 0,
      }
    }
  } catch (error) {
    console.error('getCustomerAnalytics error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢客戶分析失敗'
    }
  }
}
```

**效能預測**:
```
Materialized View 查詢性能分析
--------------------------------------------------
建立時間（首次）: ~2-5 秒     (複雜 6-way JOIN + GROUP BY)
查詢時間（刷新後): ~15ms      (已預先計算，直接掃表)
刷新時間: ~3-8 秒            (CONCURRENT REFRESH，非阻塞)
資料延遲: < 24 小時          (日一次刷新)

vs 一般 View：
一般 View 查詢: ~2-3 秒       (每次都要計算)
Materialized View: ~15ms      (快 133-200 倍)
```

---

## 4. Supabase RLS 與 Views 的注意事項

### 4.1 RLS 在一般 Views 上的應用

**情況 1: 在 View 建立時過濾資料（推薦）**

```sql
-- 方案 A: 管理員專用 View（無需 RLS）
CREATE VIEW vw_admin_sales AS
SELECT
  o.id,
  o.order_number,
  o.total_amount,
  p.phone,
  p.display_name,
  t.name as tier_name
FROM orders o
JOIN profiles p ON o.user_id = p.id
JOIN tiers t ON p.tier_id = t.id
WHERE TRUE;  -- 無過濾，因為此 View 僅在 Server Action 中被管理員使用

-- Server Action 負責權限檢查
export async function getAdminOrderReport() {
  const { role } = await checkAuth();
  if (role !== 'admin') return { success: false };

  const { data } = await supabase.from('vw_admin_sales').select();
  return data;
}

-- 方案 B: 客戶專用 View（含 RLS）
CREATE VIEW vw_customer_orders AS
SELECT
  o.id,
  o.order_number,
  o.total_amount,
  o.status,
  o.created_at
FROM orders o
WHERE o.user_id = auth.uid();

-- 為 View 啟用 RLS
ALTER VIEW vw_customer_orders ENABLE ROW LEVEL SECURITY;

-- View 會自動應用客戶層級的過濾
-- 查詢時 auth.uid() 會被自動替換為當前使用者 ID
```

**情況 2: 在 Server Action 層過濾（更推薦）**

```typescript
// lib/actions/analytics.ts
export async function getOrderReport(params?: { startDate?: string }) {
  try {
    const { userId, role } = await checkAuth()
    const supabase = await createClient()

    if (role !== 'admin') {
      return { success: false, message: '無權限' }
    }

    // 只有管理員才能查詢此 View
    const { data } = await supabase
      .from('vw_admin_sales')
      .select('*')
      .gte('created_at', params?.startDate || '2025-01-01')

    return { success: true, data }
  } catch (error) {
    return { success: false, message: '查詢失敗' }
  }
}
```

### 4.2 RLS 在 Materialized Views 上的應用

**重要**: Materialized Views **不支援直接 RLS 應用**

```sql
-- ❌ 錯誤：無法在 Materialized View 上啟用 RLS
-- ALTER MATERIALIZED VIEW mv_customer_stats ENABLE ROW LEVEL SECURITY;
-- 錯誤: Materialized views do not support the RLS feature

-- ✅ 正確方案 1: View 中預先過濾資料
CREATE MATERIALIZED VIEW mv_admin_customer_stats AS
SELECT
  -- 此時已經過濾為管理員可見的資料
  p.id, p.phone, p.display_name,
  COUNT(o.id) as order_count
FROM profiles p
LEFT JOIN orders o ON p.id = o.user_id
WHERE p.role = 'client'  -- 隱含過濾
GROUP BY p.id, p.phone, p.display_name;

-- ✅ 正確方案 2: Server Action 層負責權限檢查
export async function getCustomerStats() {
  const { role } = await checkAuth()

  // 權限檢查在 Server Action 層
  if (role !== 'admin') {
    return { success: false, message: '無權限' }
  }

  // 查詢 Materialized View（無需 RLS，因已過濾）
  const { data } = await supabase
    .from('mv_admin_customer_stats')
    .select('*')

  return { success: true, data }
}
```

---

## 5. 決策矩陣

### 應使用 Views (一般檢視) 的條件

```
✅ 使用 Views 當：
  - 資料更新頻率 > 每小時一次
  - 查詢複雜度低（簡單 JOIN + GROUP BY）
  - 資料量 < 10,000 筆
  - 即時性要求高（< 5 分鐘延遲不可接受）
  - 維護人力有限
  - 查詢響應時間 < 500ms 可接受

✅ 最適合的場景：
  - 訂單實時監控
  - 庫存水位追蹤
  - 客戶登入後的即時統計
  - 管理員即時儀表板
```

### 應使用 Materialized Views 的條件

```
✅ 使用 Materialized Views 當：
  - 資料更新頻率 < 每天一次
  - 查詢複雜度高（多層 JOIN、複雜聚合）
  - 資料量 > 100,000 筆
  - 可接受 24 小時資料延遲
  - 查詢速度是首要考慮
  - 團隊有能力維護 REFRESH 策略

✅ 最適合的場景：
  - 月度/周度報表
  - 複雜的客戶分析
  - 歷史趨勢分析
  - 批量資料匯出
```

### Vsale-lite 最終決策

| 功能 | 推薦 | 原因 | 預期性能 |
|------|------|------|---------|
| **銷售報表** | Views | 更新頻繁、邏輯簡單、資料量小 | ~250ms |
| **庫存分析** | Views | 實時性要求極高 | ~200ms |
| **客戶分析** | Materialized View | 計算複雜、更新低頻、資料量大 | ~15ms 查詢 + 日刷新 |
| **訂單監控** | Views | 實時互動 | ~100ms |
| **歷史分析** | Materialized View | 複雜計算 | ~50ms 查詢 |

---

## 6. 實作檢查清單

### 6.1 Views 實作清單

```sql
-- [ ] 建立 Migration 檔案: supabase/migrations/20260110_sales_views.sql
-- [ ] 定義 5-10 個視圖供銷售報表使用
-- [ ] 定義 3-5 個視圖供庫存分析使用
-- [ ] 測試所有視圖的查詢效能 (應 < 300ms)
-- [ ] 驗證 RLS 在視圖上的行為
-- [ ] 建立索引優化視圖查詢
-- [ ] 撰寫 Server Actions 包裝視圖查詢
-- [ ] 在 types/analytics.ts 定義視圖回傳型別
```

### 6.2 Materialized Views 實作清單

```sql
-- [ ] 建立 Migration 檔案: supabase/migrations/20260111_customer_analytics.sql
-- [ ] 定義 2-3 個 Materialized View 供客戶分析使用
-- [ ] 在每個 View 上建立 UNIQUE INDEX
-- [ ] 建立 refresh_customer_analytics() 函數
-- [ ] 測試 CONCURRENT REFRESH (應 < 10 秒)
-- [ ] 設置 Firebase Cloud Scheduler 自動刷新
-- [ ] 設置告警若 REFRESH 失敗
-- [ ] 驗證 REFRESH 期間仍可查詢
-- [ ] 撰寫 Server Actions 查詢 Materialized Views
-- [ ] 在 types/analytics.ts 定義回傳型別
```

### 6.3 效能驗證清單

```bash
-- [ ] 本地環境建立測試資料 (1 年訂單量)
-- [ ] 執行 Views 查詢並測量時間
--     pnpm exec psql -h 127.0.0.1 -p 54322 -U postgres -d postgres \
--       -c "EXPLAIN ANALYZE SELECT * FROM vw_daily_sales_summary;"

-- [ ] 執行 Materialized Views REFRESH 並測量時間
--     SELECT refresh_customer_analytics();

-- [ ] 在 REFRESH 期間進行查詢測試
--     確保讀操作不被阻塞

-- [ ] 壓力測試：並發 50 個查詢
--     確保響應時間穩定 < 500ms

-- [ ] 驗證資料一致性
--     比較 View 和 Materialized View 的結果
```

---

## 7. 常見問題 (FAQ)

### Q1: 能否在 Supabase 中使用 pg_cron 自動化 REFRESH?

**A**: Supabase 支援 pg_cron extension，但需要在 Supabase 後台手動啟用。

**限制**:
- 需要 Supabase 管理員權限
- 某些專案版本可能不支援
- 建議使用 Firebase Cloud Scheduler 更可靠

**替代方案** (推薦):
```typescript
// app/api/cron/refresh-views/route.ts
// 透過 Firebase Cloud Scheduler 觸發
// 更易於監控和告警
```

---

### Q2: Materialized View 可以透過 RLS 過濾不同客戶的資料嗎?

**A**: 不行。Materialized Views 不支援 RLS。

**解決方案**:
1. 建立多個專用 Materialized Views（管理員用、客戶用）
2. 在 Server Action 層進行權限檢查
3. 使用一般 Views 而不是 Materialized Views

---

### Q3: 如果 REFRESH 期間資料不一致怎麼辦?

**A**: 使用 `REFRESH MATERIALIZED VIEW CONCURRENTLY` 最小化不一致時間。

**工作原理**:
```sql
-- 標準 REFRESH（獨佔鎖，查詢被阻塞）
REFRESH MATERIALIZED VIEW mv_customer_stats;
-- 期間：任何查詢都被阻塞

-- CONCURRENT REFRESH（共享鎖，允許讀）
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_stats;
-- 期間：查詢可以繼續，但可能讀到部分刷新的資料
-- 此模式要求建立 UNIQUE INDEX
```

---

### Q4: 如何監控 REFRESH 的成功與失敗?

**A**: 建立告警和日誌機制。

```typescript
// app/api/cron/refresh-analytics/route.ts
async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const { error } = await supabase.rpc('refresh_customer_analytics')

    if (error) {
      // 發送告警
      await notifySlack({
        color: 'danger',
        title: 'Analytics REFRESH Failed',
        message: error.message
      })
      return new Response(JSON.stringify({ error }), { status: 500 })
    }

    const duration = Date.now() - startTime

    // 記錄成功
    console.log(`REFRESH completed in ${duration}ms`)

    // 若超過閾值則發送警告
    if (duration > 10000) {
      await notifySlack({
        color: 'warning',
        title: 'Analytics REFRESH Slow',
        message: `Took ${duration}ms (threshold: 10s)`
      })
    }

    return new Response(JSON.stringify({ success: true, duration }))
  } catch (error) {
    await notifySlack({
      color: 'danger',
      title: 'Analytics REFRESH Error',
      message: error.message
    })
    return new Response(JSON.stringify({ error }), { status: 500 })
  }
}
```

---

### Q5: 在生產環境中如何安全地執行 REFRESH?

**A**: 使用 Service Role 和 CONCURRENT REFRESH。

```typescript
// 使用 Service Role Key (有完整權限)
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY  // 僅在伺服器端使用
)

// 設置超時防止無限等待
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 30000)

try {
  const { error } = await supabase.rpc('refresh_customer_analytics')
} finally {
  clearTimeout(timeout)
}
```

---

## 8. 最佳實踐建議

### 8.1 索引策略

```sql
-- 為常見查詢建立索引
CREATE INDEX idx_orders_created_at_status
  ON orders(created_at DESC, status);

CREATE INDEX idx_order_items_product_id
  ON order_items(product_id);

CREATE INDEX idx_products_stock
  ON products(stock)
  WHERE status = 'active';

-- 為 Materialized View 建立唯一索引（支援 CONCURRENT REFRESH）
CREATE UNIQUE INDEX idx_customer_stats_pk
  ON mv_customer_stats(id);
```

### 8.2 查詢最佳化

```sql
-- ❌ 避免：在 View 中使用子查詢
CREATE VIEW vw_slow AS
SELECT o.id,
  (SELECT SUM(quantity) FROM order_items oi WHERE oi.order_id = o.id) as qty
FROM orders o;

-- ✅ 推薦：使用 JOIN 和窗口函數
CREATE VIEW vw_fast AS
SELECT o.id,
  SUM(oi.quantity) OVER (PARTITION BY oi.order_id) as qty
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id;
```

### 8.3 監控與告警

```typescript
// 在 Server Action 中監控查詢時間
export async function getAnalyticsWithMonitoring() {
  const startTime = performance.now()

  const { data, error } = await supabase
    .from('vw_daily_sales_summary')
    .select('*')

  const duration = performance.now() - startTime

  // 告警若查詢太慢
  if (duration > 500) {
    console.warn(`Slow query detected: ${duration}ms`, {
      view: 'vw_daily_sales_summary',
      duration
    })
  }

  return { data, error, duration }
}
```

---

## 9. 總結與建議

### 對 Vsale-lite 的最終建議

**階段 1: 快速上線（推薦）**
1. 建立 5-10 個簡單的 Views 支援銷售和庫存報表
2. 實作基本 Server Actions 查詢 Views
3. 搭配 Recharts 進行視覺化
4. 預期投入: 2-3 天開發

**階段 2: 效能優化（後續）**
1. 根據實際使用情況監控查詢速度
2. 若查詢超過 500ms，優化索引或改用 Materialized Views
3. 為客戶分析建立 Materialized Views + 自動 REFRESH
4. 預期投入: 1-2 天開發

**階段 3: 擴展功能（未來）**
1. 新增複雜分析功能（預測、對比等）
2. 建立動態 Materialized Views（按月/按客戶等級）
3. 實作快取層（Redis）進一步加速
4. 預期投入: 3-5 天開發

### 立即執行項目

```sql
-- 建立檔案: supabase/migrations/20260110_analytics_views.sql

-- 1. 銷售報表視圖 (Views)
CREATE OR REPLACE VIEW vw_daily_sales_summary AS ...
CREATE OR REPLACE VIEW vw_top_products AS ...
CREATE OR REPLACE VIEW vw_order_status_distribution AS ...

-- 2. 庫存分析視圖 (Views)
CREATE OR REPLACE VIEW vw_stock_status AS ...
CREATE OR REPLACE VIEW vw_low_stock_alert AS ...

-- 3. 客戶分析視圖 (Materialized View)
CREATE MATERIALIZED VIEW mv_customer_stats AS ...
CREATE UNIQUE INDEX idx_customer_stats_id ON mv_customer_stats(id);

-- 4. REFRESH 函數
CREATE OR REPLACE FUNCTION refresh_customer_analytics() AS ...
```

```typescript
// 建立檔案: lib/actions/analytics.ts

export async function getSalesOverview() { ... }
export async function getInventoryStatus() { ... }
export async function getCustomerAnalytics() { ... }
```

```typescript
// 設置 Cron: Firebase Cloud Scheduler
// 名稱: refresh-customer-analytics
// 頻率: 每日凌晨 2 點
// URL: https://your-app.com/api/cron/refresh-analytics
```

---

## 參考資料

### PostgreSQL 官方文件
- [Views](https://www.postgresql.org/docs/current/sql-createview.html)
- [Materialized Views](https://www.postgresql.org/docs/current/sql-creatematerializedview.html)
- [REFRESH MATERIALIZED VIEW](https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html)

### Supabase 文件
- [Supabase Database](https://supabase.com/docs/guides/database)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/functions)

### 相關技術
- [Recharts 文件](https://recharts.org/en-US/)
- [Firebase Cloud Scheduler](https://firebase.google.com/docs/functions/schedule-functions)
- [PostgreSQL Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html)

---

**文件版本**: 1.0.0
**最後更新**: 2026-01-03
**狀態**: 完成，可用於實作
