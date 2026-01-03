# 訂單報表系統 - 效能最佳化指南

**目的**: 在 Phase 8 (Polish & Cross-Cutting Concerns) 中實施訂單報表功能時的效能優化方案

**相關文件**: `/docs/postgresql-date-range-optimization.md` (詳細研究)

---

## 快速參考

### 核心建議

1. **索引優化** (完成度：70%)
   - ✅ `created_at` 索引已存在
   - ⚠️ 需新增複合索引 `(user_id, created_at DESC)`
   - ⚠️ 需新增 `(status, created_at DESC)` 用於狀態篩選

2. **查詢最佳實踐**
   - 使用 `INTERVAL` 而非函數轉換
   - 用 `date_trunc()` 進行分組，**不用在 WHERE 子句**
   - 參數化查詢，防止 SQL 注入

3. **快取策略**
   - 短期快取 (5-15 分鐘): Redis / Node.js cache
   - 預先計算: 物化檢視表 (Materialized Views)
   - 失效管理: 訂單狀態變更時自動刪除相關快取

---

## Phase 8 實施任務

### Task 1: 新增報表索引 (15 分鐘)

**檔案**: `supabase/migrations/20260109_add_report_indexes.sql`

```sql
-- 複合索引 1：用戶 + 日期 (客戶查看自己訂單)
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at
ON orders(user_id, created_at DESC);
COMMENT ON INDEX idx_orders_user_id_created_at
IS '用戶訂單查詢優化: 客戶最近 N 天訂單列表';

-- 複合索引 2：狀態 + 日期 (報表篩選)
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
ON orders(status, created_at DESC);
COMMENT ON INDEX idx_orders_status_created_at
IS '狀態報表優化: 特定狀態日期範圍查詢';

-- 驗證索引建立
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename = 'orders'
ORDER BY indexname;
```

### Task 2: 建立報表 Server Actions (45 分鐘)

**檔案**: `lib/actions/reports.ts` (新建)

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import type { ActionResult } from '@/types'

/**
 * 日報表：訂單統計
 * - 查詢特定日期的訂單統計
 * - 包含訂單數、收入、平均訂單金額
 * - 包含狀態分布
 */
export async function getDailyOrderReport(
  date: string  // YYYY-MM-DD
): Promise<ActionResult<{
  order_date: string
  order_count: number
  total_revenue: number
  avg_order_value: number
  unique_customers: number
  status_breakdown: Record<string, number>
}>> {
  try {
    const supabase = await createClient()
    await checkAuth()

    const startOfDay = `${date}T00:00:00Z`
    const endOfDay = `${date}T23:59:59Z`

    // 1. 查詢訂單資料
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, total_amount, status, user_id')
      .gte('created_at', startOfDay)
      .lt('created_at', endOfDay)

    if (error) throw error

    if (!orders || orders.length === 0) {
      return {
        success: true,
        data: {
          order_date: date,
          order_count: 0,
          total_revenue: 0,
          avg_order_value: 0,
          unique_customers: 0,
          status_breakdown: {},
        },
      }
    }

    // 2. 計算統計
    const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0)
    const uniqueCustomers = new Set(orders.map(o => o.user_id)).size
    const statusBreakdown = orders.reduce((acc: Record<string, number>, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1
      return acc
    }, {})

    return {
      success: true,
      data: {
        order_date: date,
        order_count: orders.length,
        total_revenue: totalRevenue,
        avg_order_value: totalRevenue / orders.length,
        unique_customers: uniqueCustomers,
        status_breakdown: statusBreakdown,
      },
    }
  } catch (error) {
    console.error('getDailyOrderReport error:', error)
    return {
      success: false,
      message: '查詢日報表時發生錯誤',
    }
  }
}

/**
 * 週報表：按週分組營收趨勢
 */
export async function getWeeklyOrderTrend(
  startDate: string,  // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
): Promise<ActionResult<{
  week_start: string
  week_end: string
  order_count: number
  weekly_revenue: number
  avg_order_value: number
  unique_customers: number
  completion_rate: number  // %
}[]>> {
  try {
    const supabase = await createClient()
    await checkAuth()

    const { data, error } = await supabase
      .rpc('get_weekly_order_trend', {
        p_start_date: startDate,
        p_end_date: endDate,
      })

    if (error) throw error

    return {
      success: true,
      data: data || [],
    }
  } catch (error) {
    console.error('getWeeklyOrderTrend error:', error)
    return {
      success: false,
      message: '查詢週報表時發生錯誤',
    }
  }
}

/**
 * 月報表：訂單統計與年度對比
 */
export async function getMonthlyOrderReport(
  year: number,
  month: number
): Promise<ActionResult<{
  month: string
  order_count: number
  total_revenue: number
  avg_order_value: number
  unique_customers: number
  yoy_growth: number  // 與去年同月相比，%
}>> {
  try {
    const supabase = await createClient()
    await checkAuth()

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

    // 本月資料
    const { data: currentMonth } = await supabase
      .rpc('get_monthly_stats', {
        p_start_date: startDate,
        p_end_date: endDate,
      })

    // 去年同月資料 (用於 YoY 對比)
    const lastYearStart = `${year - 1}-${String(month).padStart(2, '0')}-01`
    const lastYearEnd = `${year}-${String(month).padStart(2, '0')}-01`

    const { data: lastYearMonth } = await supabase
      .rpc('get_monthly_stats', {
        p_start_date: lastYearStart,
        p_end_date: lastYearEnd,
      })

    const current = currentMonth?.[0] || {}
    const lastYear = lastYearMonth?.[0] || {}

    const yoyGrowth = lastYear.total_revenue
      ? ((current.total_revenue - lastYear.total_revenue) / lastYear.total_revenue * 100)
      : 0

    return {
      success: true,
      data: {
        month: startDate,
        order_count: current.order_count || 0,
        total_revenue: current.total_revenue || 0,
        avg_order_value: current.avg_order_value || 0,
        unique_customers: current.unique_customers || 0,
        yoy_growth: yoyGrowth,
      },
    }
  } catch (error) {
    console.error('getMonthlyOrderReport error:', error)
    return {
      success: false,
      message: '查詢月報表時發生錯誤',
    }
  }
}
```

### Task 3: 建立 PostgreSQL 報表函數 (30 分鐘)

**檔案**: `supabase/migrations/20260110_add_report_functions.sql`

```sql
-- ================================================================
-- 報表相關 PostgreSQL Functions
-- ================================================================

-- 函數 1：取得週報表資料
CREATE OR REPLACE FUNCTION get_weekly_order_trend(
  p_start_date TEXT,
  p_end_date TEXT
)
RETURNS TABLE (
  week_start DATE,
  week_end DATE,
  order_count BIGINT,
  weekly_revenue DECIMAL,
  avg_order_value DECIMAL,
  unique_customers BIGINT,
  completion_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (date_trunc('week', o.created_at AT TIME ZONE 'Asia/Taipei'))::DATE AS week_start,
    ((date_trunc('week', o.created_at AT TIME ZONE 'Asia/Taipei'))::DATE + INTERVAL '6 days')::DATE AS week_end,
    COUNT(o.id)::BIGINT,
    SUM(o.total_amount)::DECIMAL,
    AVG(o.total_amount)::DECIMAL,
    COUNT(DISTINCT o.user_id)::BIGINT,
    ROUND(
      COUNT(CASE WHEN o.status = 'completed' THEN 1 END)::NUMERIC
      / NULLIF(COUNT(o.id), 0) * 100,
      2
    )::DECIMAL
  FROM orders o
  WHERE o.created_at >= p_start_date::TIMESTAMP
    AND o.created_at < (p_end_date::TIMESTAMP + INTERVAL '1 day')
  GROUP BY date_trunc('week', o.created_at AT TIME ZONE 'Asia/Taipei')
  ORDER BY week_start DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 函數 2：取得月報表資料
CREATE OR REPLACE FUNCTION get_monthly_stats(
  p_start_date TEXT,
  p_end_date TEXT
)
RETURNS TABLE (
  month_start DATE,
  order_count BIGINT,
  total_revenue DECIMAL,
  avg_order_value DECIMAL,
  unique_customers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (date_trunc('month', o.created_at AT TIME ZONE 'Asia/Taipei'))::DATE,
    COUNT(o.id)::BIGINT,
    SUM(o.total_amount)::DECIMAL,
    AVG(o.total_amount)::DECIMAL,
    COUNT(DISTINCT o.user_id)::BIGINT
  FROM orders o
  WHERE o.created_at >= p_start_date::TIMESTAMP
    AND o.created_at < (p_end_date::TIMESTAMP + INTERVAL '1 day')
  GROUP BY date_trunc('month', o.created_at AT TIME ZONE 'Asia/Taipei');
END;
$$ LANGUAGE plpgsql STABLE;
```

### Task 4: 建立報表 UI 頁面 (60 分鐘)

**檔案**: `app/(admin)/admin/reports/page.tsx` (新建)

```tsx
import { getDailyOrderReport, getWeeklyOrderTrend } from '@/lib/actions/reports'
import ReportsDashboard from '@/components/admin/reports-dashboard'

export default async function ReportsPage() {
  const today = new Date().toISOString().split('T')[0]
  const dailyReport = await getDailyOrderReport(today)

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 90)
  const weeklyTrend = await getWeeklyOrderTrend(
    startDate.toISOString().split('T')[0],
    today
  )

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">訂單報表</h1>

      <ReportsDashboard
        dailyReport={dailyReport}
        weeklyTrend={weeklyTrend}
      />
    </div>
  )
}
```

---

## 效能基準

### 當前基準（未優化）

```
場景：查詢最近 30 天訂單列表 (1000 筆記錄)
目前性能：~150-200ms
原因：缺少複合索引，使用順序掃描
```

### 優化後預期基準

```
場景 1：客戶查看自己最近 7 天訂單 (20 筆)
- 無快取：~30-50ms (使用 idx_orders_user_id_created_at)
- 有快取：~5-10ms

場景 2：報表查詢最近 30 天統計
- 無快取：~80-100ms (使用複合索引 + date_trunc)
- 有快取：~10-20ms

場景 3：月報表查詢與 YoY 對比
- 無快取：~150-200ms (2 次大查詢)
- 有快取：~30-50ms
- 物化檢視表：< 10ms
```

---

## 快取策略實施

### 快取層級架構

```
┌─────────────────────────┐
│   應用層快取 (Redis)      │  5-15 分鐘 TTL
│  (hot data cache)        │
└────────────┬─────────────┘
             │
┌────────────▼─────────────┐
│  資料庫快取 (PostgreSQL)  │
│ (內存緩衝區 + 物化檢視表) │
└────────────┬─────────────┘
             │
┌────────────▼─────────────┐
│   磁碟存儲 (Supabase)     │
│  (原始訂單資料)          │
└──────────────────────────┘
```

### 快取失效時機

```typescript
// 在 confirmOrder() 中
export async function confirmOrder(orderId: string) {
  // ... 確認訂單邏輯 ...

  // 自動失效相關快取
  await invalidateReportCaches()
}

async function invalidateReportCaches() {
  const keys = [
    'reports:daily:*',
    'reports:weekly:*',
    'reports:monthly:*',
    'stats:*',
  ]

  for (const pattern of keys) {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }
}
```

---

## 監控與調試

### 查詢執行計畫檢查

```sql
-- 驗證索引是否被使用
EXPLAIN ANALYZE
SELECT *
FROM orders
WHERE user_id = 'specific-user'
  AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 20;

-- 預期結果: Index Scan using idx_orders_user_id_created_at
-- 實際時間: 20-50ms
```

### 快取命中率監控

```typescript
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)

// 每 10 秒統計一次
setInterval(async () => {
  const info = await redis.info('stats')
  const lines = info.split('\r\n')
  const stats = lines.reduce((acc, line) => {
    const [key, value] = line.split(':')
    if (key && value) acc[key] = value
    return acc
  }, {} as Record<string, string>)

  console.log(`Redis 快取命中率: ${
    ((parseInt(stats.keyspace_hits) || 0) /
    ((parseInt(stats.keyspace_hits) || 0) + (parseInt(stats.keyspace_misses) || 0)) * 100).toFixed(2)
  }%`)
}, 10000)
```

---

## 完成檢查清單

- [ ] Task 1: 新增索引並驗證
- [ ] Task 2: 建立報表 Server Actions
- [ ] Task 3: 建立 PostgreSQL 報表函數
- [ ] Task 4: 建立報表 UI 頁面
- [ ] 執行基準測試，記錄查詢時間
- [ ] 實施 Redis 快取層
- [ ] 設定快取失效策略
- [ ] 建立快取命中率監控
- [ ] 文件化查詢最佳實踐
- [ ] 執行 `pnpm type-check` 確保無型別錯誤
- [ ] 執行 `pnpm build` 確保可構建
- [ ] 提交 git commit

---

**相關文件**:
- 詳細研究: `/docs/postgresql-date-range-optimization.md`
- 訂單 Schema: `/specs/004-cart-and-orders/data-model.md`
- API 合約: `/specs/004-cart-and-orders/contracts/`
