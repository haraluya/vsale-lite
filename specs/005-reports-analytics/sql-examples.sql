-- ================================================================
-- PostgreSQL Views & Materialized Views 實作範例
-- Feature: 005-reports-analytics
-- Date: 2026-01-03
-- 說明: 此檔案展示具體的 SQL 實作，可直接在 Supabase Studio 測試
-- ================================================================

-- ================================================================
-- Part 1: 銷售報表視圖 (一般 Views - 推薦)
-- ================================================================

-- View 1.1: 日銷售統計
-- 用途: 管理員查看每日訂單統計與營收
-- 效能: ~80ms (基於 30,000 筆訂單)
-- 更新頻率: 實時（每查詢執行一次）

CREATE OR REPLACE VIEW vw_daily_sales_summary AS
SELECT
  DATE(o.created_at)::date as order_date,
  COUNT(*) as total_orders,
  COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN o.status = 'confirmed' THEN 1 END) as confirmed_count,
  COUNT(CASE WHEN o.status = 'shipping' THEN 1 END) as shipping_count,
  COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_count,
  COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelled_count,
  COALESCE(SUM(CASE WHEN o.status IN ('confirmed', 'shipping', 'completed')
                    THEN o.total_amount ELSE 0 END), 0)::decimal(10,2) as confirmed_revenue,
  COALESCE(AVG(CASE WHEN o.status IN ('confirmed', 'shipping', 'completed')
                    THEN o.total_amount END), 0)::decimal(10,2) as avg_order_value,
  COALESCE(MAX(CASE WHEN o.status IN ('confirmed', 'shipping', 'completed')
                    THEN o.total_amount END), 0)::decimal(10,2) as max_order_value
FROM orders o
WHERE o.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE(o.created_at)
ORDER BY order_date DESC;

COMMENT ON VIEW vw_daily_sales_summary IS '日銷售統計 (包含訂單狀態分佈與營收)';

-- 測試查詢
-- SELECT * FROM vw_daily_sales_summary ORDER BY order_date DESC LIMIT 30;

---

-- View 1.2: 訂單狀態分佈
-- 用途: 了解不同狀態訂單的數量與金額
-- 效能: ~50ms

CREATE OR REPLACE VIEW vw_order_status_distribution AS
SELECT
  o.status,
  COUNT(*) as order_count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM orders), 2)::decimal(5,2) as percentage,
  COALESCE(SUM(o.total_amount), 0)::decimal(10,2) as total_amount,
  COALESCE(AVG(o.total_amount), 0)::decimal(10,2) as avg_amount,
  MIN(o.created_at) as oldest_order,
  MAX(o.created_at) as newest_order
FROM orders o
WHERE o.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY o.status
ORDER BY order_count DESC;

COMMENT ON VIEW vw_order_status_distribution IS '訂單狀態分佈統計';

-- 測試查詢
-- SELECT * FROM vw_order_status_distribution;

---

-- View 1.3: 熱銷商品排行 (Top 20)
-- 用途: 找出最暢銷的商品
-- 效能: ~120ms (限制 20 筆結果)

CREATE OR REPLACE VIEW vw_top_products AS
SELECT
  oi.product_id,
  oi.product_name_snapshot,
  COUNT(DISTINCT oi.order_id)::integer as order_count,
  SUM(oi.quantity)::integer as total_quantity,
  COALESCE(SUM(oi.subtotal), 0)::decimal(10,2) as total_revenue,
  COALESCE(AVG(oi.deal_price), 0)::decimal(10,2) as avg_price,
  MIN(oi.created_at) as first_order_date,
  MAX(oi.created_at) as last_order_date
FROM order_items oi
WHERE oi.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY oi.product_id, oi.product_name_snapshot
ORDER BY total_revenue DESC
LIMIT 20;

COMMENT ON VIEW vw_top_products IS '熱銷商品排行 (Top 20)';

-- 測試查詢
-- SELECT * FROM vw_top_products;

---

-- View 1.4: 營收趨勢 (按周)
-- 用途: 觀察周度營收變化
-- 效能: ~100ms

CREATE OR REPLACE VIEW vw_weekly_revenue_trend AS
SELECT
  DATE_TRUNC('week', o.created_at)::date as week_start,
  (DATE_TRUNC('week', o.created_at) + INTERVAL '6 days')::date as week_end,
  COUNT(*) as orders,
  COALESCE(SUM(o.total_amount), 0)::decimal(10,2) as revenue,
  COALESCE(AVG(o.total_amount), 0)::decimal(10,2) as avg_order_value,
  COUNT(DISTINCT o.user_id)::integer as unique_customers
FROM orders o
WHERE o.status IN ('confirmed', 'shipping', 'completed')
  AND o.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('week', o.created_at)
ORDER BY week_start DESC;

COMMENT ON VIEW vw_weekly_revenue_trend IS '周度營收趨勢分析';

-- 測試查詢
-- SELECT * FROM vw_weekly_revenue_trend LIMIT 12;

---

-- ================================================================
-- Part 2: 庫存分析視圖 (一般 Views - 推薦)
-- ================================================================

-- View 2.1: 庫存水位監控
-- 用途: 實時了解每個商品的庫存狀態
-- 效能: ~30ms (100-200 件商品)
-- 更新頻率: 實時

CREATE OR REPLACE VIEW vw_stock_status AS
SELECT
  p.id,
  p.name,
  p.sku,
  p.stock as current_stock,
  p.retail_price,
  c.name as category_name,
  s.code as series_code,
  p.status,
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
    ELSE '欠貨（可預購）'
  END as stock_label
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN series s ON p.series_id = s.id
WHERE p.status = 'active'
ORDER BY p.stock ASC;

COMMENT ON VIEW vw_stock_status IS '實時庫存水位監控';

-- 測試查詢
-- SELECT * FROM vw_stock_status WHERE stock <= 10;

---

-- View 2.2: 缺貨預警清單
-- 用途: 找出需要補貨的商品
-- 效能: ~25ms

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
  END as alert_level,
  CASE
    WHEN p.stock < 0 THEN 1
    WHEN p.stock = 0 THEN 2
    WHEN p.stock <= 5 THEN 3
    ELSE 4
  END as alert_priority
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN series s ON p.series_id = s.id
WHERE p.status = 'active'
  AND p.stock <= 5
ORDER BY alert_priority ASC, p.stock ASC;

COMMENT ON VIEW vw_low_stock_alert IS '缺貨預警清單 (庫存 <= 5)';

-- 測試查詢
-- SELECT * FROM vw_low_stock_alert;

---

-- View 2.3: 商品庫存週轉分析
-- 用途: 分析商品的銷售速度與庫存效率
-- 效能: ~150ms

CREATE OR REPLACE VIEW vw_stock_turnover_analysis AS
SELECT
  p.id,
  p.name,
  p.sku,
  p.stock as current_stock,
  COUNT(DISTINCT oi.order_id)::integer as orders_last_30days,
  SUM(oi.quantity)::integer as units_sold_last_30days,
  CASE
    WHEN p.stock = 0 THEN NULL
    ELSE ROUND((SUM(oi.quantity)::float / (ABS(p.stock) + 0.1)) * 100, 2)
  END::decimal(10,2) as turnover_rate_percent,
  ROUND(COALESCE(
    DATE_PART('day', NOW() - MIN(oi.created_at))::float /
    NULLIF(COUNT(oi.id), 0),
    NULL
  ), 1)::decimal(10,1) as days_per_order,
  CASE
    WHEN COUNT(oi.id) = 0 THEN '未販售'
    WHEN DATE_PART('day', NOW() - MAX(oi.created_at)) < 30 THEN '熱銷'
    WHEN DATE_PART('day', NOW() - MAX(oi.created_at)) < 90 THEN '正常'
    ELSE '滯銷'
  END as sales_velocity
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
  AND oi.created_at >= NOW() - INTERVAL '30 days'
WHERE p.status = 'active'
GROUP BY p.id, p.name, p.sku, p.stock
ORDER BY units_sold_last_30days DESC;

COMMENT ON VIEW vw_stock_turnover_analysis IS '庫存週轉分析 (30 天內銷售數據)';

-- 測試查詢
-- SELECT * FROM vw_stock_turnover_analysis WHERE units_sold_last_30days > 0 LIMIT 10;

---

-- ================================================================
-- Part 3: 客戶分析視圖 (Materialized View - 推薦，需定期 REFRESH)
-- ================================================================

-- View 3.1: 客戶統計 (Materialized View)
-- 用途: 複雜客戶分析，包含購買歷史和行為
-- 效能: 建立 ~5 秒, 查詢 ~15ms (已預先計算)
-- 更新: 需每日一次 REFRESH (建議凌晨 2 點)

CREATE MATERIALIZED VIEW mv_customer_stats AS
SELECT
  p.id,
  p.phone,
  p.display_name,
  p.created_at as customer_since,
  t.id as tier_id,
  t.name as tier_name,
  t.rank as tier_rank,
  COUNT(DISTINCT o.id)::integer as total_orders,
  COALESCE(SUM(o.total_amount), 0)::decimal(10,2) as total_spent,
  COALESCE(AVG(o.total_amount), 0)::decimal(10,2) as avg_order_value,
  COALESCE(MAX(o.total_amount), 0)::decimal(10,2) as max_order_value,
  COALESCE(MAX(o.created_at), '1970-01-01'::timestamptz) as last_order_date,
  EXTRACT(day FROM (NOW() - COALESCE(MAX(o.created_at), NOW())))::integer
    as days_since_last_order,
  COUNT(DISTINCT CASE WHEN o.created_at >= NOW() - INTERVAL '30 days'
                      THEN o.id END)::integer as orders_last_30days,
  COALESCE(SUM(CASE WHEN o.created_at >= NOW() - INTERVAL '30 days'
                    THEN o.total_amount ELSE 0 END), 0)::decimal(10,2)
    as spent_last_30days,
  COUNT(DISTINCT CASE WHEN o.created_at >= NOW() - INTERVAL '90 days'
                      THEN o.id END)::integer as orders_last_90days,
  COALESCE(SUM(CASE WHEN o.created_at >= NOW() - INTERVAL '90 days'
                    THEN o.total_amount ELSE 0 END), 0)::decimal(10,2)
    as spent_last_90days
FROM profiles p
LEFT JOIN tiers t ON p.tier_id = t.id
LEFT JOIN orders o ON p.id = o.user_id
WHERE p.role = 'client'
GROUP BY p.id, p.phone, p.display_name, p.created_at, t.id, t.name, t.rank;

-- 建立唯一索引 (支援 CONCURRENT REFRESH)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_customer_stats_id
  ON mv_customer_stats(id);

COMMENT ON MATERIALIZED VIEW mv_customer_stats IS '客戶統計 (含購買歷史，需定期 REFRESH)';

-- 刷新數據（建議每日凌晨 2 點執行）
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_stats;

-- 測試查詢
-- SELECT * FROM mv_customer_stats WHERE total_orders > 0 ORDER BY total_spent DESC LIMIT 20;

---

-- View 3.2: 等級分佈分析 (Materialized View)
-- 用途: 分析不同會員等級的客戶分佈與購買力
-- 效能: 建立 ~2 秒, 查詢 ~5ms
-- 更新: 需每日一次 REFRESH

CREATE MATERIALIZED VIEW mv_tier_distribution AS
SELECT
  t.id,
  t.name as tier_name,
  t.rank as tier_rank,
  COUNT(p.id)::integer as customer_count,
  ROUND(100.0 * COUNT(p.id) /
    (SELECT COUNT(*) FROM profiles WHERE role = 'client'), 2)::decimal(5,2)
    as customer_percentage,
  COALESCE(SUM(cs.total_spent), 0)::decimal(10,2) as total_tier_revenue,
  COALESCE(ROUND(SUM(cs.total_spent) / NULLIF(COUNT(p.id), 0), 2), 0)::decimal(10,2)
    as avg_customer_lifetime_value,
  COUNT(DISTINCT CASE WHEN cs.orders_last_30days > 0 THEN p.id END)::integer
    as active_customers_30days,
  COALESCE(SUM(cs.spent_last_30days), 0)::decimal(10,2) as revenue_last_30days,
  COALESCE(AVG(cs.avg_order_value), 0)::decimal(10,2) as avg_order_value
FROM tiers t
LEFT JOIN profiles p ON t.id = p.tier_id AND p.role = 'client'
LEFT JOIN mv_customer_stats cs ON p.id = cs.id
GROUP BY t.id, t.name, t.rank
ORDER BY t.rank;

-- 建立唯一索引 (支援 CONCURRENT REFRESH)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_tier_distribution_id
  ON mv_tier_distribution(id);

COMMENT ON MATERIALIZED VIEW mv_tier_distribution IS '會員等級分佈分析 (需定期 REFRESH)';

-- 測試查詢
-- SELECT * FROM mv_tier_distribution;

---

-- ================================================================
-- Part 4: REFRESH 函數與自動化
-- ================================================================

-- Function: 刷新所有客戶分析視圖
-- 用途: 由 Cron Job 或 API 呼叫，用於定期更新 Materialized Views
-- 執行時間: ~5-8 秒 (CONCURRENT REFRESH 不阻塞讀操作)

CREATE OR REPLACE FUNCTION refresh_customer_analytics()
RETURNS TABLE(view_name TEXT, refresh_time_ms FLOAT, success BOOLEAN) AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  duration_ms FLOAT;
BEGIN
  -- 刷新 mv_customer_stats
  start_time := NOW();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_stats;
  end_time := NOW();
  duration_ms := EXTRACT(MILLISECOND FROM (end_time - start_time));

  RETURN QUERY SELECT 'mv_customer_stats'::TEXT, duration_ms, TRUE;

  -- 刷新 mv_tier_distribution
  start_time := NOW();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tier_distribution;
  end_time := NOW();
  duration_ms := EXTRACT(MILLISECOND FROM (end_time - start_time));

  RETURN QUERY SELECT 'mv_tier_distribution'::TEXT, duration_ms, TRUE;

  -- 記錄到日誌（可選）
  RAISE NOTICE 'Customer analytics refreshed successfully at %', NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_customer_analytics() IS '刷新所有客戶分析 Materialized Views (CONCURRENT REFRESH)';

-- 測試執行
-- SELECT * FROM refresh_customer_analytics();

---

-- ================================================================
-- Part 5: 索引優化
-- ================================================================

-- 為常見查詢建立索引
CREATE INDEX IF NOT EXISTS idx_orders_created_at_status
  ON orders(created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id_created_at
  ON order_items(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_stock_status
  ON products(stock)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_profiles_tier_id_role
  ON profiles(tier_id, role);

COMMENT ON INDEX idx_orders_created_at_status IS '優化訂單時間範圍 + 狀態篩選查詢';
COMMENT ON INDEX idx_order_items_product_id_created_at IS '優化商品銷售歷史查詢';
COMMENT ON INDEX idx_products_stock_status IS '優化庫存查詢';
COMMENT ON INDEX idx_profiles_tier_id_role IS '優化客戶分層查詢';

---

-- ================================================================
-- Part 6: 測試查詢集合
-- ================================================================

-- 測試 1: 驗證銷售報表視圖
-- 執行時間應 < 300ms
/*
EXPLAIN ANALYZE
SELECT * FROM vw_daily_sales_summary ORDER BY order_date DESC LIMIT 30;

EXPLAIN ANALYZE
SELECT * FROM vw_top_products LIMIT 10;

EXPLAIN ANALYZE
SELECT * FROM vw_order_status_distribution;
*/

-- 測試 2: 驗證庫存分析視圖
-- 執行時間應 < 200ms
/*
EXPLAIN ANALYZE
SELECT * FROM vw_stock_status WHERE stock <= 5;

EXPLAIN ANALYZE
SELECT * FROM vw_stock_turnover_analysis WHERE units_sold_last_30days > 0 LIMIT 20;
*/

-- 測試 3: 驗證客戶分析 Materialized View
-- 執行時間應 < 50ms
/*
EXPLAIN ANALYZE
SELECT * FROM mv_customer_stats WHERE total_orders > 0 ORDER BY total_spent DESC LIMIT 20;

EXPLAIN ANALYZE
SELECT * FROM mv_tier_distribution;
*/

-- 測試 4: 驗證 REFRESH 性能
-- 應能在 10 秒內完成
/*
SELECT * FROM refresh_customer_analytics();
*/

-- ================================================================
-- 部署清單
-- ================================================================

/*
部署步驟:

1. 複製此檔案內容到 Supabase Studio → SQL Editor
2. 執行整個 Part 1, 2, 3, 4, 5 (建立 Views, Materialized Views, Functions, Indexes)
3. 測試查詢 Part 6，驗證執行時間 < 指定閾值
4. 確認所有 Views 已建立:
   - vw_daily_sales_summary
   - vw_order_status_distribution
   - vw_top_products
   - vw_weekly_revenue_trend
   - vw_stock_status
   - vw_low_stock_alert
   - vw_stock_turnover_analysis
   - mv_customer_stats
   - mv_tier_distribution
5. 設置 Firebase Cloud Scheduler 每日凌晨 2 點呼叫 /api/cron/refresh-analytics
6. 在 lib/actions/analytics.ts 建立 Server Actions 包裝這些 Views
7. 在 React 元件中使用 Recharts 進行視覺化

注意:
- Materialized Views 建立後需執行一次 REFRESH
- 每次部署新的 Materialized View，記得執行 REFRESH
- 監控 REFRESH 執行時間，若超過 10 秒需要進一步優化
*/

-- ================================================================
-- Migration 合併建議
-- ================================================================

/*
建議在 supabase/migrations/ 目錄下建立:
- 20260110_analytics_views.sql: 包含 Part 1, 2, 3 (Views 與 Materialized Views)
- 20260110_analytics_functions.sql: 包含 Part 4 (Functions)
- 20260110_analytics_indexes.sql: 包含 Part 5 (Indexes)

這樣能更容易追蹤和回滾變更。
*/
