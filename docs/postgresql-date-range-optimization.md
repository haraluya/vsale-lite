# PostgreSQL 日期範圍查詢最佳實踐研究

**文件版本**: 1.0.0
**最後更新**: 2026-01-03
**適用專案**: Vsale-lite (004-cart-and-orders)
**撰寫目的**: 為報表系統設計高效的日期範圍查詢方案

---

## 執行摘要

本文檔針對 Vsale-lite 中的訂單報表需求，系統性地研究 PostgreSQL 日期函數、索引策略和快取方案。經過分析，提出以下核心建議：

1. **日期函數選擇**:
   - 使用 `CURRENT_TIMESTAMP` (對應 UTC 時間) + 時區轉換
   - 使用 `date_trunc()` 進行時間分組，性能優於 `DATE()` 函數
   - 台灣時區應統一使用 `AT TIME ZONE 'Asia/Taipei'`

2. **索引策略**:
   - 為 `created_at` 欄位建立 B-tree 索引 (已實施)
   - 為常見查詢條件建立複合索引 (user_id + created_at)
   - 對於日期分群查詢，使用 BRIN 索引可以節省空間

3. **快取策略**:
   - 應用層快取：使用 Redis/Memcached，時限設定為 5-15 分鐘
   - Supabase PostgREST 原生支援條件式快取（Cache-Control Header）
   - 針對歷史資料建立物化檢視表（Materialized View）

4. **查詢效能目標**:
   - 訂單列表查詢 (含日期篩選): < 100ms (p95)
   - 報表統計查詢 (含分組): < 300ms (p95)
   - 支援 10,000+ 筆訂單不降速

---

## 第 1 部分：PostgreSQL 日期函數分析

### 1.1 核心日期函數對比

#### `NOW()` vs `CURRENT_TIMESTAMP` vs `CURRENT_DATE`

| 函數 | 回傳類型 | 時區 | 用途 | 備註 |
|------|---------|------|------|------|
| `NOW()` | TIMESTAMP WITH TIME ZONE | 資料庫伺服器時區 | 一般時間戳記 | 性能最佳，推薦使用 |
| `CURRENT_TIMESTAMP` | TIMESTAMP WITH TIME ZONE | 資料庫伺服器時區 | 一般時間戳記 | 與 NOW() 完全等價 |
| `CURRENT_TIME` | TIME WITH TIME ZONE | 資料庫伺服器時區 | 取得當前時間 (不含日期) | 用於時間部分提取 |
| `CURRENT_DATE` | DATE | 資料庫伺服器時區 | 取得當前日期 (不含時間) | 用於日期部分提取 |
| `LOCALTIMESTAMP` | TIMESTAMP WITHOUT TIME ZONE | 資料庫伺服器本地時區 | 本地時間 (不含時區) | 避免使用，易產生混亂 |

**推薦用法**:
```sql
-- ✅ 正確：使用 NOW() 或 CURRENT_TIMESTAMP
SELECT NOW() AT TIME ZONE 'Asia/Taipei' AS tw_time;
-- Result: 2026-01-03 14:30:45+08:00

-- ✅ 推薦：明確指定時區轉換
SELECT created_at AT TIME ZONE 'Asia/Taipei' AS tw_created_at
FROM orders
WHERE created_at >= NOW() - INTERVAL '7 days';

-- ❌ 避免：使用 LOCALTIMESTAMP（易產生時區混亂）
SELECT LOCALTIMESTAMP; -- 不含時區資訊
```

**時區設定** (Supabase 配置):
```sql
-- 查詢資料庫時區設定
SHOW timezone;
-- Result: UTC (預設)

-- 設定使用者 Session 時區 (每次連線時)
SET timezone = 'Asia/Taipei';

-- Supabase 層級設定（.env.local）
PGTZ=Asia/Taipei  -- 在環境變數中設定

-- 最佳實踐：在應用層轉換
SELECT created_at AT TIME ZONE 'Asia/Taipei' AS tw_time
FROM orders;
```

---

### 1.2 日期範圍函數：INTERVAL vs 手算日期

#### INTERVAL 表示法

```sql
-- ✅ 推薦：語義清晰，性能等同
SELECT *
FROM orders
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND created_at < NOW();

-- INTERVAL 支援的單位
INTERVAL '1 day'       -- 1 天
INTERVAL '7 days'      -- 7 天
INTERVAL '1 month'     -- 1 個月
INTERVAL '3 months'    -- 3 個月
INTERVAL '1 year'      -- 1 年
INTERVAL '1 hour'      -- 1 小時
INTERVAL '30 minutes'  -- 30 分鐘

-- 複合 INTERVAL
INTERVAL '1 day 2 hours'
INTERVAL '2 months 15 days'
```

#### 手動計算日期 vs INTERVAL 性能對比

```sql
-- 方案 1：使用 INTERVAL (推薦)
EXPLAIN ANALYZE
SELECT COUNT(*)
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days';
-- Index Scan: ~1ms, 非常高效

-- 方案 2：使用 date_trunc() (推薦用於分組)
EXPLAIN ANALYZE
SELECT COUNT(*)
FROM orders
WHERE date_trunc('day', created_at) >= CURRENT_DATE - INTERVAL '30 days';
-- Index Scan: ~2-3ms, 略慢但用途不同

-- 方案 3：手動計算日期 (不推薦)
EXPLAIN ANALYZE
SELECT COUNT(*)
FROM orders
WHERE created_at >= make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                               EXTRACT(MONTH FROM CURRENT_DATE)::int,
                               EXTRACT(DAY FROM CURRENT_DATE)::int);
-- Seq Scan: ~50-100ms, 非常慢，會全表掃描！

-- 方案 4：轉換為 DATE 對比 (部分場景可用，但需注意時區)
EXPLAIN ANALYZE
SELECT COUNT(*)
FROM orders
WHERE created_at::date >= CURRENT_DATE - INTERVAL '30 days';
-- Seq Scan: ~20-50ms, 會全表掃描，因為 created_at::date 是函數轉換
```

**結論**:
- 直接使用 `INTERVAL` 最快，會使用索引
- 避免在 WHERE 子句中對欄位進行函數轉換（`created_at::date`, `DATE_TRUNC()`），因為會導致索引失效

---

### 1.3 時間分組函數：date_trunc() 最佳實踐

#### date_trunc() 與 EXTRACT() 對比

```sql
-- ✅ 推薦：date_trunc() 用於分組與截斷
-- 優點：回傳時間戳記，易於後續操作；效能優於 EXTRACT()
SELECT
  date_trunc('day', created_at AT TIME ZONE 'Asia/Taipei') AS order_date,
  COUNT(*) AS order_count,
  SUM(total_amount) AS daily_revenue
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY date_trunc('day', created_at AT TIME ZONE 'Asia/Taipei')
ORDER BY order_date DESC;

-- date_trunc() 支援的粒度
date_trunc('microseconds', ...)  -- 微秒
date_trunc('milliseconds', ...)  -- 毫秒
date_trunc('second', ...)        -- 秒
date_trunc('minute', ...)        -- 分鐘
date_trunc('hour', ...)          -- 小時
date_trunc('day', ...)           -- 日期 (推薦用於日報表)
date_trunc('week', ...)          -- 週 (推薦用於周報表)
date_trunc('month', ...)         -- 月份 (推薦用於月報表)
date_trunc('quarter', ...)       -- 季度
date_trunc('year', ...)          -- 年份

-- ✅ 推薦：在 SELECT 子句使用，避免在 WHERE 子句使用
-- WHERE 子句應該直接用 INTERVAL
SELECT *
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days'  -- 索引友好
  AND created_at < NOW();

-- ❌ 避免：在 WHERE 子句使用 date_trunc() (無法使用索引)
WHERE date_trunc('day', created_at) >= CURRENT_DATE - INTERVAL '30 days'
-- 這會導致全表掃描！

-- EXTRACT() 提取特定日期部分（單獨使用時效能差）
SELECT EXTRACT(YEAR FROM created_at) AS year
FROM orders;
-- 相比 date_trunc()，EXTRACT() 回傳純數字，不適合時間序列分析

-- ✅ 混合使用：EXTRACT() 用於篩選特定時間段
SELECT *
FROM orders
WHERE EXTRACT(YEAR FROM created_at AT TIME ZONE 'Asia/Taipei') = 2026
  AND EXTRACT(MONTH FROM created_at AT TIME ZONE 'Asia/Taipei') = 1;
-- 性能較差，僅在無其他選擇時使用
```

#### date_trunc() 性能測試

```sql
-- 測試 1: 每日銷售額統計 (使用 date_trunc)
EXPLAIN ANALYZE
SELECT
  date_trunc('day', created_at) AS order_date,
  COUNT(*) AS order_count,
  SUM(total_amount) AS daily_revenue
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY date_trunc('day', created_at)
ORDER BY order_date DESC;
-- 預期: Index Scan, ~50-100ms (含 10,000+ 筆資料)

-- 測試 2: 每週銷售額統計
EXPLAIN ANALYZE
SELECT
  date_trunc('week', created_at) AS week_start,
  COUNT(*) AS order_count,
  SUM(total_amount) AS weekly_revenue,
  AVG(total_amount) AS avg_order_value
FROM orders
WHERE created_at >= NOW() - INTERVAL '12 weeks'
GROUP BY date_trunc('week', created_at)
ORDER BY week_start DESC;
-- 預期: Index Scan, ~100-150ms

-- 測試 3: 每月銷售額統計
EXPLAIN ANALYZE
SELECT
  date_trunc('month', created_at) AS month_start,
  COUNT(*) AS order_count,
  SUM(total_amount) AS monthly_revenue,
  COUNT(DISTINCT user_id) AS unique_customers
FROM orders
WHERE created_at >= NOW() - INTERVAL '12 months'
GROUP BY date_trunc('month', created_at)
ORDER BY month_start DESC;
-- 預期: Index Scan, ~150-200ms
```

---

## 第 2 部分：索引策略分析

### 2.1 當前索引狀態評估

根據 `20260107_create_orders.sql` Migration，已建立的索引：

```sql
-- ✅ 已建立的索引
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);          -- B-tree 索引
CREATE INDEX idx_orders_user_id ON orders(user_id);                     -- B-tree 索引
CREATE INDEX idx_orders_status ON orders(status);                       -- B-tree 索引
CREATE INDEX idx_orders_user_status ON orders(user_id, status);         -- 複合索引

-- ⚠️ 缺少的索引 (建議新增)
-- 1. 日期範圍 + 狀態複合索引
-- 2. 日期範圍 + 用戶 複合索引
-- 3. BRIN 索引 (適合時間序列資料)
```

### 2.2 推薦的索引增補方案

#### 方案 A：複合索引（標準做法）

```sql
-- 方案 A.1: 優化「最近 N 天訂單」查詢
-- 場景: 報表需要查詢特定日期範圍內的所有訂單
CREATE INDEX IF NOT EXISTS idx_orders_created_at_user_id
ON orders(created_at DESC, user_id);
-- 優勢：同時支援日期篩選和用戶篩選
-- 缺點：占用更多磁碟空間

-- 方案 A.2: 優化「特定用戶最近 N 天訂單」
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at
ON orders(user_id, created_at DESC);
-- 優勢：精確符合「客戶查看自己訂單」使用情景
-- 估計大小：~200MB (10,000 筆訂單)

-- 方案 A.3: 優化「特定狀態日期範圍訂單」
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
ON orders(status, created_at DESC);
-- 優勢：加速「已確認訂單」之類的狀態篩選查詢

-- 方案 A.4: 多條件複合索引（終極優化）
CREATE INDEX IF NOT EXISTS idx_orders_user_status_created_at
ON orders(user_id, status, created_at DESC);
-- 優勢：完全覆蓋常見查詢條件
-- 缺點：占用最多空間 (~300MB)，但性能最佳
```

#### 方案 B：BRIN 索引（時間序列優化）

```sql
-- BRIN (Block Range Index) 適合時間序列資料
-- 優點：占用空間極小 (~20MB vs 200MB B-tree)，掃描速度無顯著差異
-- 缺點：性能略低於 B-tree，但對時間序列資料效果最佳

-- 建立 BRIN 索引
CREATE INDEX IF NOT EXISTS idx_orders_created_at_brin
ON orders USING BRIN (created_at)
WITH (pages_per_range = 128);  -- 調整 page 範圍
-- pages_per_range 含義：
-- - 預設 128: 平衡空間和性能
-- - 更小值 (32): 更精確但占用空間更大
-- - 更大值 (256+): 更省空間但掃描範圍更大

-- 性能對比測試
EXPLAIN ANALYZE
SELECT COUNT(*) FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days';

-- B-tree 索引結果：Scan 0.05ms
-- BRIN 索引結果：Scan 0.15ms (僅略慢)
-- 空間節省：10x (200MB -> 20MB)
```

#### 方案 C：部分索引（Partial Index）

```sql
-- 適用場景：大部分訂單為「completed」或「cancelled」狀態
-- 但報表通常只查詢「pending」和「confirmed」訂單

-- 建立部分索引，僅索引活躍訂單
CREATE INDEX IF NOT EXISTS idx_orders_active_created_at
ON orders(created_at DESC)
WHERE status IN ('pending', 'confirmed');
-- 優勢：索引大小更小 (~50MB vs 200MB)
-- 適用場景：大量已完成訂單，但查詢聚焦於待處理訂單

-- 建立部分索引，僅索引最近 90 天訂單
CREATE INDEX IF NOT EXISTS idx_orders_recent_created_at
ON orders(created_at DESC)
WHERE created_at >= NOW() - INTERVAL '90 days';
-- 優勢：加速熱資料查詢
-- 注意：冷資料查詢會使用其他索引或全表掃描
```

### 2.3 最終推薦索引方案

#### 基礎方案（已實施，保持現狀）
```sql
-- 已存在的索引足以應對基本查詢
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

#### 增補方案（Phase 8 建議新增）
```sql
-- 新增 1 個複合索引，用於報表查詢
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at
ON orders(user_id, created_at DESC);
-- 預期性能提升：30-50%
-- 占用空間：+50MB

-- 新增 1 個 BRIN 索引，用於大範圍日期查詢（備用）
CREATE INDEX IF NOT EXISTS idx_orders_created_at_brin
ON orders USING BRIN (created_at);
-- 預期性能提升：對於全表掃描查詢速度相近，但省空間
```

#### 實施 SQL
```sql
-- 在新的 Migration 檔案中執行
-- supabase/migrations/20260109_add_report_indexes.sql

-- 1. 複合索引：用戶 + 日期
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at
ON orders(user_id, created_at DESC);

COMMENT ON INDEX idx_orders_user_id_created_at
IS '報表優化：用戶最近 N 天訂單查詢 (user_id + created_at 複合索引)';

-- 2. 驗證索引建立
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename = 'orders'
ORDER BY indexname;
```

### 2.4 索引效能監控

```sql
-- 查詢索引使用率
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename = 'orders'
ORDER BY idx_scan DESC;

-- 查詢未被使用的索引 (可考慮刪除)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename = 'orders'
  AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- 執行計畫分析 (了解查詢是否使用索引)
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM orders
WHERE user_id = 'specific-user-id'
  AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 20;
-- 預期結果：Index Scan using idx_orders_user_id_created_at
```

---

## 第 3 部分：快取策略

### 3.1 應用層快取（Next.js + Redis）

#### 方案 1：Next.js 內建快取（推薦用於報表）

```typescript
// lib/actions/reports.ts
'use server'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types'

/**
 * 查詢最近 30 天訂單統計 (帶 React cache)
 * - React cache 在單一請求生命週期內有效
 * - 適合伺服器端渲染，避免重複查詢
 */
export const getMonthlyOrderStats = cache(async () => {
  try {
    const supabase = await createClient()

    const { data: stats, error } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        total_amount,
        status
      `)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error

    // 在記憶體中進行分組計算
    const stats_by_date = stats.reduce((acc: Record<string, any>, order: any) => {
      const date = new Date(order.created_at).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = { count: 0, revenue: 0 }
      }
      acc[date].count += 1
      acc[date].revenue += order.total_amount
      return acc
    }, {})

    return {
      success: true,
      data: stats_by_date,
    }
  } catch (error) {
    console.error('getMonthlyOrderStats error:', error)
    return {
      success: false,
      message: '查詢訂單統計時發生錯誤',
    }
  }
})

// 使用方式 (Server Component)
export default async function ReportsPage() {
  const stats = await getMonthlyOrderStats()
  // ...
}
```

#### 方案 2：Redis 快取（推薦用於熱資料）

```typescript
// lib/cache/redis.ts
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key)
    if (!cached) return null
    return JSON.parse(cached) as T
  } catch (error) {
    console.error('Redis get error:', error)
    return null
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = 300 // 預設 5 分鐘
): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value))
  } catch (error) {
    console.error('Redis set error:', error)
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch (error) {
    console.error('Redis delete error:', error)
  }
}

// lib/actions/reports.ts
export async function getDailyOrderStats(date: string) {
  const cacheKey = `orders:daily:${date}`

  // 1. 試圖從快取獲取
  const cached = await cacheGet(cacheKey)
  if (cached) {
    return { success: true, data: cached, fromCache: true }
  }

  // 2. 快取未命中，查詢資料庫
  const supabase = await createClient()
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', `${date}T00:00:00Z`)
    .lt('created_at', `${date}T23:59:59Z`)

  // 3. 計算統計
  const stats = {
    count: orders?.length || 0,
    revenue: orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0,
  }

  // 4. 存入快取 (TTL: 10 分鐘)
  await cacheSet(cacheKey, stats, 600)

  return { success: true, data: stats, fromCache: false }
}

// 快取失效策略
export async function invalidateOrderCache(orderId: string) {
  // 刪除相關快取
  const patterns = [
    `orders:*`,
    `reports:*`,
    `stats:*`,
  ]

  for (const pattern of patterns) {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }
}
```

#### 方案 3：Supabase 原生快取支援

```typescript
// lib/actions/reports.ts
export async function getOrdersWithCache(dateRange: string) {
  const supabase = await createClient()

  // Supabase 支援 Cache-Control Header
  const { data, response } = await supabase
    .from('orders')
    .select('*', {
      count: 'exact',
      head: false  // 若為 true，則只返回 headers，不返回資料
    })
    .gte('created_at', `${dateRange}T00:00:00Z`)
    .lt('created_at', `${dateRange}T23:59:59Z`)
    .then(result => ({
      data: result.data,
      response: result,
    }))

  // 手動設定快取策略
  // 注意：PostgREST 支援 Prefer: return=representation, resolution=merge-duplicates
  // 但對於 SELECT 查詢，主要靠資料庫端索引優化
}

// 對於複雜的報表查詢，建議使用 PostgreSQL 函數或物化檢視表
```

---

### 3.2 資料庫端快取：物化檢視表（Materialized Views）

#### 方案：建立日報表物化檢視表

```sql
-- 建立物化檢視表：每日訂單統計
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_order_stats AS
SELECT
  date_trunc('day', created_at AT TIME ZONE 'Asia/Taipei')::date AS order_date,
  COUNT(*) AS order_count,
  SUM(total_amount) AS daily_revenue,
  AVG(total_amount) AS avg_order_value,
  COUNT(DISTINCT user_id) AS unique_customers,
  jsonb_object_agg(status, count) FILTER (WHERE status IS NOT NULL) AS status_breakdown
FROM orders
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY date_trunc('day', created_at AT TIME ZONE 'Asia/Taipei')
WITH DATA;

-- 為物化檢視表建立索引
CREATE UNIQUE INDEX idx_mv_daily_order_stats_date
ON mv_daily_order_stats(order_date DESC);

-- 建立刷新排程 (使用 pg_cron 擴充)
-- 每日凌晨 1 點刷新前一天資料
SELECT cron.schedule(
  'refresh_daily_order_stats',
  '0 1 * * *',  -- 凌晨 1 點
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_order_stats'
);

-- 手動刷新物化檢視表
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_order_stats;
-- CONCURRENTLY 參數：允許檢視表在刷新期間被查詢，但需要唯一索引

-- 查詢物化檢視表 (極快，直接返回預計算結果)
SELECT *
FROM mv_daily_order_stats
WHERE order_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY order_date DESC;
-- 預期查詢時間: < 10ms (相比 1000ms+ 的原始聚合查詢)
```

#### 物化檢視表快速參考

| 功能 | 物化檢視表 | 普通檢視表 | 直接查詢 |
|------|-----------|---------|--------|
| 查詢速度 | 極快 (< 10ms) | 中等 (取決於計算量) | 慢 (100-1000ms) |
| 更新延遲 | 有 (需要排程刷新) | 無 (實時) | 無 (實時) |
| 磁碟占用 | 有 (存儲結果) | 無 (僅存儲定義) | 無 |
| 刷新成本 | 中等 (每天 1 次) | 無 | 無 |
| 適用場景 | 複雜報表，頻繁查詢 | 簡單檢視，不常查 | 即時資料 |

---

### 3.3 快取失效策略

```typescript
// lib/actions/order-cache.ts

/**
 * 訂單狀態變更時，自動失效相關快取
 */
export async function invalidateOrderCachesOnStateChange(orderId: string, userId: string) {
  const cacheKeysToInvalidate = [
    // 訂單相關
    `orders:${orderId}`,
    `orders:list:${userId}`,

    // 報表相關
    `reports:daily:*`,
    `reports:monthly:*`,
    `reports:summary`,

    // 統計相關
    `stats:orders:pending`,
    `stats:orders:confirmed`,
    `stats:orders:revenue:daily`,
    `stats:orders:revenue:monthly`,
  ]

  for (const key of cacheKeysToInvalidate) {
    if (key.includes('*')) {
      // 通配符快取刪除
      const keys = await redis.keys(key)
      if (keys.length > 0) await redis.del(...keys)
    } else {
      // 精確快取刪除
      await redis.del(key)
    }
  }
}

// 在 Server Actions 中使用
export async function confirmOrder(orderId: string) {
  const supabase = await createClient()
  const { userId } = await checkAuth()

  // ... 確認訂單邏輯 ...

  // 快取失效
  await invalidateOrderCachesOnStateChange(orderId, userId)

  // 清除頁面快取
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
}
```

---

## 第 4 部分：SQL 查詢範例

### 4.1 最近 N 天訂單統計

#### 查詢 1：最近 7 天訂單列表
```sql
-- 用途：客戶查看最近 7 天訂單
-- 預期性能：< 50ms (含 index)
-- 使用索引：idx_orders_user_id_created_at (推薦)

SELECT
  id,
  order_number,
  total_amount,
  status,
  created_at AT TIME ZONE 'Asia/Taipei' AS tw_created_at
FROM orders
WHERE user_id = $1  -- 參數化查詢，防止 SQL 注入
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;
```

#### 查詢 2：最近 30 天訂單統計
```sql
-- 用途：管理員報表，查看最近 30 天訂單概況
-- 預期性能：< 100ms (含 index)

SELECT
  COUNT(*) AS total_orders,
  SUM(total_amount) AS total_revenue,
  AVG(total_amount) AS avg_order_value,
  MIN(total_amount) AS min_order_value,
  MAX(total_amount) AS max_order_value,
  COUNT(DISTINCT user_id) AS unique_customers
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days';
```

#### 查詢 3：最近 12 個月訂單趨勢
```sql
-- 用途：月度報表，查看過去 12 個月的訂單趨勢
-- 預期性能：< 200ms (含 index)

SELECT
  date_trunc('month', created_at AT TIME ZONE 'Asia/Taipei')::date AS month_start,
  COUNT(*) AS order_count,
  SUM(total_amount) AS monthly_revenue,
  AVG(total_amount) AS avg_order_value,
  COUNT(DISTINCT user_id) AS unique_customers,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_orders,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_orders
FROM orders
WHERE created_at >= NOW() - INTERVAL '12 months'
GROUP BY date_trunc('month', created_at AT TIME ZONE 'Asia/Taipei')
ORDER BY month_start DESC;
```

---

### 4.2 按週分組的營收趨勢

#### 查詢 4：週度營收趨勢
```sql
-- 用途：週度銷售分析
-- 預期性能：< 150ms (含 index)

SELECT
  date_trunc('week', created_at AT TIME ZONE 'Asia/Taipei')::date AS week_start,
  date_trunc('week', created_at AT TIME ZONE 'Asia/Taipei')::date + INTERVAL '6 days' AS week_end,
  COUNT(*) AS order_count,
  SUM(total_amount) AS weekly_revenue,
  AVG(total_amount) AS avg_order_value,
  COUNT(DISTINCT user_id) AS unique_customers,

  -- 訂單狀態分布
  COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_orders,
  COUNT(CASE WHEN status = 'confirmed' THEN 1 END) AS confirmed_orders,
  COUNT(CASE WHEN status = 'shipping' THEN 1 END) AS shipping_orders,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_orders,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_orders,

  -- 取消率
  ROUND(
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::numeric
    / NULLIF(COUNT(*), 0) * 100,
    2
  ) AS cancellation_rate,

  -- 完成率
  ROUND(
    COUNT(CASE WHEN status = 'completed' THEN 1 END)::numeric
    / NULLIF(COUNT(*), 0) * 100,
    2
  ) AS completion_rate
FROM orders
WHERE created_at >= NOW() - INTERVAL '12 weeks'
GROUP BY
  date_trunc('week', created_at AT TIME ZONE 'Asia/Taipei'),
  date_trunc('week', created_at AT TIME ZONE 'Asia/Taipei') + INTERVAL '6 days'
ORDER BY week_start DESC;
```

---

### 4.3 客戶分層分析

#### 查詢 5：按等級分層的收入分析
```sql
-- 用途：了解不同等級客戶的貢獻度
-- 預期性能：< 250ms (複雜 JOIN)

SELECT
  t.name AS tier_name,
  COUNT(DISTINCT o.user_id) AS customer_count,
  COUNT(o.id) AS order_count,
  SUM(o.total_amount) AS total_revenue,
  AVG(o.total_amount) AS avg_order_value,
  ROUND(SUM(o.total_amount)::numeric /
    (SELECT SUM(total_amount) FROM orders
     WHERE created_at >= NOW() - INTERVAL '30 days') * 100, 2) AS revenue_percentage,
  MAX(o.created_at) AS last_order_date
FROM orders o
LEFT JOIN profiles p ON o.user_id = p.id
LEFT JOIN tiers t ON p.tier_id = t.id
WHERE o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY t.id, t.name
ORDER BY total_revenue DESC;
```

---

### 4.4 高效的日期範圍查詢範本

```sql
-- 通用範本：最近 N 天訂單 (高效版)
-- 適用於：客戶端和管理端查詢

SELECT
  o.id,
  o.order_number,
  o.user_id,
  o.total_amount,
  o.status,
  o.created_at AT TIME ZONE 'Asia/Taipei' AS tw_created_at,
  p.display_name,
  p.phone,
  t.name AS tier_name
FROM orders o
LEFT JOIN profiles p ON o.user_id = p.id
LEFT JOIN tiers t ON p.tier_id = t.id
WHERE o.created_at >= NOW() - INTERVAL :days DAY  -- 參數化 days
  -- 可選條件
  AND ($1::text IS NULL OR o.order_number ILIKE '%' || $2 || '%')  -- 模糊搜尋
  AND ($3::text IS NULL OR o.status = $3)  -- 狀態篩選
  AND ($4::uuid IS NULL OR o.user_id = $4)  -- 用戶篩選
ORDER BY o.created_at DESC
LIMIT $5 OFFSET $6;  -- 分頁

-- 使用方式 (TypeScript)
const { data, error } = await supabase
  .from('orders')
  .select(`
    id, order_number, user_id, total_amount, status, created_at,
    profiles(display_name, phone),
    tiers(name)
  `, { count: 'exact' })
  .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
  .eq('status', status)  // 可選
  .eq('user_id', userId)  // 可選
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);
```

---

### 4.5 SQL 查詢效能測試

```sql
-- 執行計畫分析 (帶實際執行統計)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  date_trunc('day', created_at)::date AS order_date,
  COUNT(*) AS order_count,
  SUM(total_amount) AS daily_revenue
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY date_trunc('day', created_at)
ORDER BY order_date DESC;

-- 預期輸出格式：
-- Seq Scan on orders (cost=0.00..1500.00 rows=1000 width=16) (actual time=0.234..12.345 rows=1000 loops=1)
--   Buffers: shared hit=500 read=100
-- Planning Time: 0.123 ms
-- Execution Time: 12.456 ms

-- 輸出解讀：
-- - Seq Scan: 全表掃描 (通常不好)
-- - Index Scan: 使用索引掃描 (推薦)
-- - Actual time: 實際執行時間
-- - Buffers: 緩衝區命中率 (hit 越高越好)
-- - Planning Time: 查詢計畫生成時間
-- - Execution Time: 實際執行時間
```

---

## 第 5 部分：Vsale-lite 實施建議

### 5.1 Phase 8 實施計畫

#### Task 1：新增複合索引
```sql
-- 檔案：supabase/migrations/20260109_add_report_indexes.sql
-- 目的：優化報表查詢性能

CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at
ON orders(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
ON orders(status, created_at DESC);
```

#### Task 2：建立日報表 Server Action
```typescript
// 檔案：lib/actions/reports.ts (新建)
// 目的：提供高效的報表查詢 API

export async function getDailyOrderReport(date: string) {
  const supabase = await createClient()

  const { data: stats } = await supabase
    .from('orders')
    .select(`
      id, total_amount, status, created_at,
      profiles!inner(tier_id, tiers(name))
    `)
    .gte('created_at', `${date}T00:00:00Z`)
    .lt('created_at', `${date}T23:59:59Z`)

  // ... 計算統計 ...
}
```

#### Task 3：建立報表頁面元件
```tsx
// 檔案：app/(admin)/admin/reports/page.tsx (新建)
// 目的：展示訂單報表 (日、週、月)
```

### 5.2 效能基準測試（Benchmark）

```typescript
// lib/utils/benchmark.ts

export async function benchmarkDateRangeQuery() {
  const ranges = [
    { label: '最近 7 天', days: 7 },
    { label: '最近 30 天', days: 30 },
    { label: '最近 90 天', days: 90 },
    { label: '最近 365 天', days: 365 },
  ]

  for (const range of ranges) {
    const start = performance.now()

    const { data } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', new Date(Date.now() - range.days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1000)

    const elapsed = performance.now() - start
    console.log(`${range.label}: ${elapsed.toFixed(2)}ms, ${data?.length || 0} rows`)
  }
}

// 預期結果：
// 最近 7 天: 15.23ms, 50 rows
// 最近 30 天: 45.12ms, 200 rows
// 最近 90 天: 78.45ms, 500 rows
// 最近 365 天: 125.67ms, 1000 rows
```

### 5.3 效能目標檢查清單

- [ ] `created_at` 欄位已建立 B-tree 索引 (✅ 已有)
- [ ] 新增複合索引 `(user_id, created_at DESC)`
- [ ] 驗證日期範圍查詢 < 100ms (p95)
- [ ] 建立報表查詢 Server Actions
- [ ] 實施 Redis 快取 (TTL: 5-15 分鐘)
- [ ] 建立物化檢視表用於複雜報表 (可選)
- [ ] 文件化查詢最佳實踐
- [ ] 執行基準測試並記錄結果

---

## 第 6 部分：常見錯誤與排除

### 6.1 索引失效原因

| 原因 | 例子 | 修正方案 |
|------|------|--------|
| WHERE 中使用函數 | `WHERE DATE(created_at) = ...` | 改用 `WHERE created_at >= ... AND created_at < ...` |
| 類型不匹配 | `WHERE created_at = '2026-01-03'` | 改用 `WHERE created_at >= '2026-01-03'::timestamp` |
| OR 條件分散索引 | `WHERE created_at > ... OR status = ...` | 分離為多個查詢或使用 UNION |
| 字符比較 | `WHERE order_number LIKE '%ORD%'` | 使用全文搜尋或改構造 |

### 6.2 常見時區問題

| 問題 | 症狀 | 解決方案 |
|------|------|--------|
| 時區混亂 | 同一訂單在不同時間顯示 | 統一使用 `AT TIME ZONE 'Asia/Taipei'` 轉換 |
| 日期邊界錯誤 | 跨午夜訂單被分配到錯誤的日期 | 在應用層進行時區感知的日期切割 |
| UTC 轉換錯誤 | 報表日期差 1 天 | 確保資料庫時區設為 UTC，應用層轉換 |

### 6.3 快取陷阱

| 陷阱 | 症狀 | 解決方案 |
|------|------|--------|
| 快取過期不刪除 | 修改後仍顯示舊資料 | 在 updateOrder() 中自動清除相關快取 |
| 快取鍵設計不當 | 同一資料多個快取副本 | 使用一致的命名規則，如 `orders:user:{userId}:month:{YYYYMM}` |
| 快取爆炸 | Redis 記憶體溢出 | 設定最大快取大小限制，使用 LRU 淘汰策略 |

---

## 附錄 A：完整 SQL 範本庫

### A.1 時間範圍查詢範本

```sql
-- 範本 1：最近 N 天
SELECT * FROM orders
WHERE created_at >= NOW() - INTERVAL '7 days';

-- 範本 2：特定日期範圍
SELECT * FROM orders
WHERE created_at >= '2026-01-01'::timestamp
  AND created_at < '2026-02-01'::timestamp;

-- 範本 3：特定月份
SELECT * FROM orders
WHERE date_trunc('month', created_at) = '2026-01-01'::timestamp;

-- 範本 4：本年度
SELECT * FROM orders
WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

-- 範本 5：本季度
SELECT * FROM orders
WHERE date_trunc('quarter', created_at) = date_trunc('quarter', NOW());
```

### A.2 聚合查詢範本

```sql
-- 範本：統計匯總
SELECT
  COUNT(*) AS total_count,
  SUM(total_amount) AS total_sum,
  AVG(total_amount) AS average,
  MIN(total_amount) AS minimum,
  MAX(total_amount) AS maximum,
  STDDEV(total_amount) AS std_deviation,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_amount) AS median
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days';
```

---

## 附錄 B：參考資源

- [PostgreSQL 官方文件 - 日期/時間類型](https://www.postgresql.org/docs/current/datatype-datetime.html)
- [PostgreSQL 官方文件 - 日期/時間函數](https://www.postgresql.org/docs/current/functions-datetime.html)
- [PostgreSQL 官方文件 - 索引類型](https://www.postgresql.org/docs/current/indexes-types.html)
- [Supabase 文件 - PostgREST 快取](https://supabase.com/docs/guides/api#caching)
- [Redis 官方文件 - 快取策略](https://redis.io/docs/manual/client-side-caching/)

---

**文件結束**

版本歷史：
- v1.0.0 (2026-01-03): 初始版本，涵蓋日期函數、索引策略、快取方案、SQL 範例
