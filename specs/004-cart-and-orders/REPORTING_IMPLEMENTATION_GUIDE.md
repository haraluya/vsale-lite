# 報表系統實作指南

**文件版本**: 1.0
**日期**: 2026-01-03
**特性**: 004-cart-and-orders (報表擴展)
**預計工時**: 6-8 小時

---

## 快速開始

### 第 1 步：執行 Migrations (15 分鐘)

```bash
# 1. 建立新的 Migration 檔案
supabase migration new reporting_functions

# 2. 複製本文件末尾的 SQL 到新檔案
# supabase/migrations/20260109_reporting_functions.sql

# 3. 應用到本地資料庫
supabase db reset

# 4. 驗證函數已建立
supabase status
```

### 第 2 步：新增 Server Actions (30 分鐘)

建立 `lib/actions/reports.ts`:
```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import type { ActionResult } from '@/types'

export async function getSalesReport(
  startDate: string,
  endDate: string
): Promise<ActionResult<any>> {
  const { role } = await checkAuth()
  if (role !== 'admin') {
    return { success: false, message: '僅管理員可查看' }
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('orders')
    .select(`
      DATE_TRUNC('day', created_at) AS order_date,
      COUNT(*) AS total_orders,
      SUM(total_amount) AS daily_revenue,
      AVG(total_amount) AS avg_order_value
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  if (error) {
    return { success: false, message: error.message }
  }

  return { success: true, data }
}
```

### 第 3 步：測試 (15 分鐘)

```bash
# 在 Supabase Studio 中測試查詢
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres

-- 測試函數
SELECT * FROM get_sales_report(
  '2026-01-01'::TIMESTAMPTZ,
  '2026-01-31'::TIMESTAMPTZ,
  'YOUR-ADMIN-ID'::UUID
);

-- 檢查效能
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE created_at >= '2026-01-01'
  AND created_at <= '2026-01-31'
  AND status = 'confirmed';
```

---

## 完整 SQL Migration 檔案

將以下內容放入 `supabase/migrations/20260109_reporting_functions.sql`:

```sql
-- ================================================================
-- Migration: Reporting Functions & Indexes for 004-cart-and-orders
-- Date: 2026-01-09
-- Description: 新增報表聚合函數、物化視圖、與優化索引
-- ================================================================

-- ================================================================
-- Part 1: Reporting Functions
-- ================================================================

-- Function 1: 銷售報表 (daily summary)
CREATE OR REPLACE FUNCTION get_sales_report(
  p_start_date TIMESTAMPTZ DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT CURRENT_DATE,
  p_requester_id UUID
)
RETURNS TABLE (
  order_date TIMESTAMPTZ,
  total_orders BIGINT,
  daily_revenue NUMERIC,
  avg_order_value NUMERIC,
  confirmed_count BIGINT,
  cancelled_count BIGINT
) AS $$
DECLARE
  v_requester_role TEXT;
BEGIN
  -- 驗證呼叫端是管理員
  SELECT role INTO v_requester_role
  FROM profiles
  WHERE id = p_requester_id;

  IF v_requester_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: only admins can access sales reports';
  END IF;

  -- 執行報表查詢
  RETURN QUERY
  SELECT
    DATE_TRUNC('day', orders.created_at)::TIMESTAMPTZ AS order_date,
    COUNT(*)::BIGINT AS total_orders,
    COALESCE(SUM(orders.total_amount), 0)::NUMERIC AS daily_revenue,
    COALESCE(AVG(orders.total_amount), 0)::NUMERIC AS avg_order_value,
    COUNT(CASE WHEN orders.status = 'confirmed' THEN 1 END)::BIGINT AS confirmed_count,
    COUNT(CASE WHEN orders.status = 'cancelled' THEN 1 END)::BIGINT AS cancelled_count
  FROM orders
  WHERE orders.created_at >= p_start_date
    AND orders.created_at <= p_end_date
  GROUP BY DATE_TRUNC('day', orders.created_at)
  ORDER BY DATE_TRUNC('day', orders.created_at) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_sales_report(TIMESTAMPTZ, TIMESTAMPTZ, UUID)
  IS '銷售報表查詢 - 按天彙總 (需要管理員權限)';

-- Function 2: 客戶銷售統計
CREATE OR REPLACE FUNCTION get_client_sales_report(
  p_start_date TIMESTAMPTZ DEFAULT CURRENT_DATE - INTERVAL '90 days',
  p_end_date TIMESTAMPTZ DEFAULT CURRENT_DATE,
  p_requester_id UUID
)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  client_phone TEXT,
  tier_name TEXT,
  order_count BIGINT,
  total_spent NUMERIC,
  avg_order_value NUMERIC,
  pending_amount NUMERIC
) AS $$
DECLARE
  v_requester_role TEXT;
BEGIN
  -- 驗證權限
  SELECT role INTO v_requester_role FROM profiles WHERE id = p_requester_id;
  IF v_requester_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 查詢
  RETURN QUERY
  SELECT
    p.id AS client_id,
    COALESCE(p.display_name, p.phone, '未知客戶')::TEXT AS client_name,
    COALESCE(p.phone, '')::TEXT AS client_phone,
    COALESCE(t.name, '未設定')::TEXT AS tier_name,
    COUNT(DISTINCT o.id)::BIGINT AS order_count,
    COALESCE(SUM(o.total_amount), 0)::NUMERIC AS total_spent,
    COALESCE(AVG(o.total_amount), 0)::NUMERIC AS avg_order_value,
    COALESCE(SUM(CASE WHEN o.status = 'pending' THEN o.total_amount ELSE 0 END), 0)::NUMERIC AS pending_amount
  FROM profiles p
  LEFT JOIN tiers t ON p.tier_id = t.id
  LEFT JOIN orders o ON p.id = o.user_id
    AND o.created_at >= p_start_date
    AND o.created_at <= p_end_date
  WHERE p.role = 'client'
  GROUP BY p.id, p.display_name, p.phone, t.name
  ORDER BY total_spent DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_client_sales_report(TIMESTAMPTZ, TIMESTAMPTZ, UUID)
  IS '按客戶統計銷售 (需要管理員權限)';

-- Function 3: 庫存分析
CREATE OR REPLACE FUNCTION get_inventory_report(
  p_requester_id UUID,
  p_low_stock INTEGER DEFAULT 10
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  series_name TEXT,
  current_stock INTEGER,
  retail_price NUMERIC,
  stock_status TEXT,
  total_sold_qty BIGINT,
  last_sold_date TIMESTAMPTZ
) AS $$
DECLARE
  v_requester_role TEXT;
BEGIN
  -- 驗證權限
  SELECT role INTO v_requester_role FROM profiles WHERE id = p_requester_id;
  IF v_requester_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    pr.id AS product_id,
    pr.name::TEXT AS product_name,
    COALESCE(s.name, '無分類')::TEXT AS series_name,
    pr.stock AS current_stock,
    pr.retail_price AS retail_price,
    CASE
      WHEN pr.stock > p_low_stock THEN 'adequate'
      WHEN pr.stock > 0 THEN 'low'
      WHEN pr.stock = 0 THEN 'out_of_stock'
      ELSE 'negative'
    END::TEXT AS stock_status,
    COUNT(oi.id)::BIGINT AS total_sold_qty,
    MAX(o.created_at)::TIMESTAMPTZ AS last_sold_date
  FROM products pr
  LEFT JOIN series s ON pr.series_id = s.id
  LEFT JOIN order_items oi ON pr.id = oi.product_id
  LEFT JOIN orders o ON oi.order_id = o.id
  WHERE pr.status = 'active'
  GROUP BY pr.id, pr.name, s.name, pr.stock, pr.retail_price
  ORDER BY pr.stock ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_inventory_report(UUID, INTEGER)
  IS '庫存分析報表 (需要管理員權限)';

-- Function 4: 訂單狀態統計
CREATE OR REPLACE FUNCTION get_order_status_stats(
  p_start_date TIMESTAMPTZ DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT CURRENT_DATE,
  p_requester_id UUID
)
RETURNS TABLE (
  status_name TEXT,
  order_count BIGINT,
  total_amount NUMERIC,
  avg_amount NUMERIC
) AS $$
DECLARE
  v_requester_role TEXT;
BEGIN
  SELECT role INTO v_requester_role FROM profiles WHERE id = p_requester_id;
  IF v_requester_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    o.status::TEXT AS status_name,
    COUNT(*)::BIGINT AS order_count,
    COALESCE(SUM(o.total_amount), 0)::NUMERIC AS total_amount,
    COALESCE(AVG(o.total_amount), 0)::NUMERIC AS avg_amount
  FROM orders o
  WHERE o.created_at >= p_start_date
    AND o.created_at <= p_end_date
  GROUP BY o.status
  ORDER BY order_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ================================================================
-- Part 2: Optimization Indexes
-- ================================================================

-- 複合索引：聚合查詢優化
CREATE INDEX IF NOT EXISTS idx_orders_created_status ON orders(
  created_at DESC,
  status
);

CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(
  status,
  created_at DESC
);

-- 用戶統計索引
CREATE INDEX IF NOT EXISTS idx_orders_user_created_status ON orders(
  user_id,
  created_at DESC,
  status
);

-- BRIN 索引：適合單調遞增的日期
CREATE INDEX IF NOT EXISTS idx_orders_created_brin ON orders
  USING BRIN (created_at)
  WITH (pages_per_range = 256);

-- 確認訂單索引（用於收入計算）
CREATE INDEX IF NOT EXISTS idx_orders_confirmed_amount ON orders(created_at DESC, total_amount)
  WHERE status = 'confirmed';

-- order_items 優化
CREATE INDEX IF NOT EXISTS idx_order_items_order_product ON order_items(
  order_id,
  product_id
);

CREATE INDEX IF NOT EXISTS idx_order_items_product_created ON order_items(
  product_id,
  created_at DESC
);

-- products 庫存查詢優化
CREATE INDEX IF NOT EXISTS idx_products_stock_status ON products(
  status,
  stock
)
WHERE status = 'active';

-- ================================================================
-- Part 3: Materialized Views (Optional)
-- ================================================================

-- 每日銷售摘要視圖 (物化視圖)
DROP MATERIALIZED VIEW IF EXISTS mv_daily_sales_summary CASCADE;
CREATE MATERIALIZED VIEW mv_daily_sales_summary AS
SELECT
  DATE_TRUNC('day', orders.created_at)::DATE AS order_date,
  COUNT(*) AS total_orders,
  SUM(orders.total_amount) AS daily_revenue,
  AVG(orders.total_amount) AS avg_order_value,
  COUNT(CASE WHEN orders.status = 'confirmed' THEN 1 END) AS confirmed_count,
  COUNT(CASE WHEN orders.status = 'pending' THEN 1 END) AS pending_count,
  COUNT(CASE WHEN orders.status = 'cancelled' THEN 1 END) AS cancelled_count,
  MIN(orders.created_at) AS first_order_time,
  MAX(orders.created_at) AS last_order_time
FROM orders
GROUP BY DATE_TRUNC('day', orders.created_at);

CREATE INDEX idx_mv_daily_sales_date ON mv_daily_sales_summary(order_date DESC);

-- 客戶銷售摘要視圖
DROP MATERIALIZED VIEW IF EXISTS mv_client_sales_summary CASCADE;
CREATE MATERIALIZED VIEW mv_client_sales_summary AS
SELECT
  p.id AS client_id,
  p.display_name,
  p.phone,
  t.name AS tier_name,
  COUNT(DISTINCT o.id) AS order_count,
  SUM(o.total_amount) AS total_spent,
  AVG(o.total_amount) AS avg_order_value,
  MAX(o.created_at) AS last_order_date
FROM profiles p
LEFT JOIN tiers t ON p.tier_id = t.id
LEFT JOIN orders o ON p.id = o.user_id AND o.status != 'cancelled'
WHERE p.role = 'client'
GROUP BY p.id, p.display_name, p.phone, t.name;

CREATE INDEX idx_mv_client_sales_spent ON mv_client_sales_summary(total_spent DESC NULLS LAST);

-- 刷新物化視圖的函數
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_client_sales_summary;
  RAISE NOTICE '✅ 物化視圖已刷新: %', NOW();
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- Part 4: Verification
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20260109_reporting_functions.sql 執行完成';
  RAISE NOTICE '   已新增:';
  RAISE NOTICE '   - 4 個報表函數 (get_sales_report, get_client_sales_report, get_inventory_report, get_order_status_stats)';
  RAISE NOTICE '   - 8 個優化索引';
  RAISE NOTICE '   - 2 個物化視圖 (mv_daily_sales_summary, mv_client_sales_summary)';
  RAISE NOTICE '   - 1 個物化視圖刷新函數';
END $$;
```

---

## TypeScript 型別定義

建立 `types/reports.ts`:

```typescript
export interface SalesReportRow {
  order_date: string
  total_orders: number
  daily_revenue: number
  avg_order_value: number
  confirmed_count: number
  cancelled_count: number
}

export interface ClientSalesRow {
  client_id: string
  client_name: string
  client_phone: string
  tier_name: string
  order_count: number
  total_spent: number
  avg_order_value: number
  pending_amount: number
}

export interface InventoryReportRow {
  product_id: string
  product_name: string
  series_name: string
  current_stock: number
  retail_price: number
  stock_status: 'adequate' | 'low' | 'out_of_stock' | 'negative'
  total_sold_qty: number
  last_sold_date: string | null
}

export interface OrderStatusStat {
  status_name: string
  order_count: number
  total_amount: number
  avg_amount: number
}

export interface SalesReport {
  dateRange: { start: string; end: string }
  rows: SalesReportRow[]
  generated_at: string
}

export interface ClientSalesReport {
  dateRange: { start: string; end: string }
  rows: ClientSalesRow[]
  generated_at: string
}
```

---

## Server Actions 完整實作

建立 `lib/actions/reports.ts`:

```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import type {
  SalesReportRow,
  ClientSalesRow,
  InventoryReportRow,
  OrderStatusStat,
  SalesReport,
  ClientSalesReport,
} from '@/types/reports'

/**
 * 銷售報表 (按天彙總)
 * 呼叫 PostgreSQL Function: get_sales_report()
 */
export async function getSalesReport(
  startDate: string,
  endDate: string
): Promise<ActionResult<SalesReport>> {
  try {
    const { userId, role } = await checkAuth()

    if (role !== 'admin') {
      return {
        success: false,
        message: '僅管理員可查看銷售報表',
      }
    }

    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .rpc('get_sales_report', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_requester_id: userId,
      })
      .returns<SalesReportRow[]>()

    if (error) throw error

    return {
      success: true,
      data: {
        dateRange: { start: startDate, end: endDate },
        rows: (data || []).map(row => ({
          order_date: row.order_date || '',
          total_orders: Number(row.total_orders || 0),
          daily_revenue: Number(row.daily_revenue || 0),
          avg_order_value: Number(row.avg_order_value || 0),
          confirmed_count: Number(row.confirmed_count || 0),
          cancelled_count: Number(row.cancelled_count || 0),
        })),
        generated_at: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('getSalesReport error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢報表失敗',
    }
  }
}

/**
 * 客戶銷售統計 (按客戶彙總)
 */
export async function getClientSalesReport(
  startDate: string,
  endDate: string
): Promise<ActionResult<ClientSalesReport>> {
  try {
    const { userId, role } = await checkAuth()

    if (role !== 'admin') {
      return {
        success: false,
        message: '僅管理員可查看客戶銷售報表',
      }
    }

    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .rpc('get_client_sales_report', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_requester_id: userId,
      })
      .returns<ClientSalesRow[]>()

    if (error) throw error

    return {
      success: true,
      data: {
        dateRange: { start: startDate, end: endDate },
        rows: (data || []).map(row => ({
          client_id: row.client_id || '',
          client_name: row.client_name || '未知',
          client_phone: row.client_phone || '',
          tier_name: row.tier_name || '未設定',
          order_count: Number(row.order_count || 0),
          total_spent: Number(row.total_spent || 0),
          avg_order_value: Number(row.avg_order_value || 0),
          pending_amount: Number(row.pending_amount || 0),
        })),
        generated_at: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('getClientSalesReport error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢報表失敗',
    }
  }
}

/**
 * 庫存報表
 */
export async function getInventoryReport(): Promise<
  ActionResult<{
    rows: InventoryReportRow[]
    generated_at: string
  }>
> {
  try {
    const { userId, role } = await checkAuth()

    if (role !== 'admin') {
      return {
        success: false,
        message: '僅管理員可查看庫存報表',
      }
    }

    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .rpc('get_inventory_report', {
        p_requester_id: userId,
        p_low_stock: 10,
      })
      .returns<InventoryReportRow[]>()

    if (error) throw error

    return {
      success: true,
      data: {
        rows: data || [],
        generated_at: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('getInventoryReport error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢庫存報表失敗',
    }
  }
}

/**
 * 訂單狀態統計
 */
export async function getOrderStatusStats(
  startDate: string,
  endDate: string
): Promise<
  ActionResult<{
    rows: OrderStatusStat[]
    generated_at: string
  }>
> {
  try {
    const { userId, role } = await checkAuth()

    if (role !== 'admin') {
      return {
        success: false,
        message: '僅管理員可查看統計',
      }
    }

    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .rpc('get_order_status_stats', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_requester_id: userId,
      })
      .returns<OrderStatusStat[]>()

    if (error) throw error

    return {
      success: true,
      data: {
        rows: data || [],
        generated_at: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('getOrderStatusStats error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢統計失敗',
    }
  }
}
```

---

## 效能測試

建立 `__tests__/performance/reports.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { getSalesReport, getClientSalesReport } from '@/lib/actions/reports'

describe('報表效能測試', () => {
  it('getSalesReport 應在 100ms 內完成', async () => {
    const start = performance.now()

    const result = await getSalesReport(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString()
    )

    const duration = performance.now() - start

    expect(result.success).toBe(true)
    expect(duration).toBeLessThan(100)
    console.log(`銷售報表查詢: ${duration.toFixed(2)}ms`)
  })

  it('getClientSalesReport 應在 200ms 內完成', async () => {
    const start = performance.now()

    const result = await getClientSalesReport(
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString()
    )

    const duration = performance.now() - start

    expect(result.success).toBe(true)
    expect(duration).toBeLessThan(200)
    console.log(`客戶銷售報表: ${duration.toFixed(2)}ms`)
  })
})
```

---

## 部署檢查清單

- [ ] 執行 `supabase migration new reporting_functions`
- [ ] 複製 SQL 到新 Migration 檔案
- [ ] 執行 `supabase db reset` 測試 Migration
- [ ] 在 Supabase Studio 測試各個函數
- [ ] 新增 `lib/actions/reports.ts`
- [ ] 新增 `types/reports.ts`
- [ ] 建立效能測試
- [ ] 執行 `pnpm test` 驗證
- [ ] 部署到 Firebase

---

**下一步**: 建立管理後台報表頁面 (`/admin/dashboard/reports`)
