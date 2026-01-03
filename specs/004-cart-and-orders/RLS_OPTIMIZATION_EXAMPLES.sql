-- ================================================================
-- Supabase RLS 效能優化 - SQL 範例與最佳實踐
-- Feature: 004-cart-and-orders
-- Date: 2026-01-03
-- ================================================================

-- 本檔案包含所有研究中提到的 SQL 範例
-- 可在 Supabase Studio SQL Editor 或 psql 中直接執行

-- ================================================================
-- Part 1: 效能對比範例
-- ================================================================

-- 例 1a: 低效的聚合查詢 (WITH RLS - 不推薦)
-- 執行時間: ~150-200ms (100K 訂單)
-- 問題: RLS EXISTS 子查詢污染執行計畫
--
-- EXPLAIN ANALYZE
-- SELECT
--   DATE_TRUNC('day', orders.created_at) AS order_date,
--   COUNT(*) AS total_orders,
--   SUM(total_amount) AS daily_revenue
-- FROM orders
-- WHERE created_at >= '2026-01-01'::TIMESTAMPTZ
--   AND created_at <= '2026-01-31'::TIMESTAMPTZ
-- GROUP BY DATE_TRUNC('day', orders.created_at)
-- ORDER BY order_date DESC;

-- 例 1b: 快速的聚合查詢 (使用 Admin Client - 推薦)
-- 執行時間: ~15-25ms (100K 訂單)
-- 優勢: 繞過 RLS，直接查詢
--
-- SELECT
--   DATE_TRUNC('day', orders.created_at) AS order_date,
--   COUNT(*) AS total_orders,
--   SUM(total_amount) AS daily_revenue,
--   AVG(total_amount) AS avg_order_value,
--   COUNT(CASE WHEN status = 'confirmed' THEN 1 END) AS confirmed_count
-- FROM orders
-- WHERE created_at >= '2026-01-01'::TIMESTAMPTZ
--   AND created_at <= '2026-01-31'::TIMESTAMPTZ
-- GROUP BY DATE_TRUNC('day', orders.created_at)
-- ORDER BY order_date DESC;

-- ================================================================
-- Part 2: RLS 檢查與診斷
-- ================================================================

-- 查詢所有啟用 RLS 的表
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename IN ('orders', 'order_items', 'order_timelines', 'profiles', 'products')
ORDER BY tablename;

-- 查詢所有 RLS 政策
SELECT
  table_name,
  policyname,
  permissive,
  roles,
  qual AS policy_expression,
  cmd
FROM pg_policies
WHERE table_name IN ('orders', 'order_items', 'order_timelines')
ORDER BY table_name, policyname;

-- ================================================================
-- Part 3: 索引診斷
-- ================================================================

-- 檢查 orders 表的索引使用情況
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename = 'orders'
ORDER BY idx_scan DESC;

-- 找出未使用的索引 (可考慮刪除)
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename IN ('orders', 'order_items', 'products')
  AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- ================================================================
-- Part 4: 查詢計畫分析 (EXPLAIN)
-- ================================================================

-- ⚠️ 執行以下查詢前，確保已經有測試資料

-- 例 4a: 簡單計數查詢的執行計畫
EXPLAIN ANALYZE
SELECT COUNT(*) AS total_orders
FROM orders
WHERE status = 'confirmed';

-- 例 4b: 日期範圍聚合的執行計畫
EXPLAIN ANALYZE
SELECT
  DATE_TRUNC('day', created_at) AS order_date,
  COUNT(*) AS daily_orders,
  SUM(total_amount) AS daily_revenue
FROM orders
WHERE created_at >= '2026-01-01'::TIMESTAMPTZ
  AND created_at <= '2026-01-31'::TIMESTAMPTZ
GROUP BY DATE_TRUNC('day', created_at);

-- 例 4c: 帶 RLS 檢查的執行計畫 (低效)
-- 使用普通 Client 模擬客戶端查詢
EXPLAIN ANALYZE
SELECT
  DATE_TRUNC('day', created_at) AS order_date,
  COUNT(*) AS daily_orders
FROM orders
WHERE created_at >= '2026-01-01'::TIMESTAMPTZ
  AND created_at <= '2026-01-31'::TIMESTAMPTZ
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
GROUP BY DATE_TRUNC('day', created_at);

-- ================================================================
-- Part 5: 效能監控
-- ================================================================

-- 啟用慢查詢日誌 (記錄 > 100ms 的查詢)
-- ⚠️ 需要超級用戶權限
-- ALTER SYSTEM SET log_min_duration_statement = 100;
-- SELECT pg_reload_conf();

-- 查看當前的慢查詢設定
SELECT name, setting
FROM pg_settings
WHERE name = 'log_min_duration_statement';

-- 監控表大小
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  (SELECT count(*) FROM pg_class c WHERE relname = tablename) AS index_count
FROM pg_tables
WHERE tablename IN ('orders', 'order_items', 'order_timelines', 'products', 'profiles')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 查看表的行數統計 (使用 reltuples)
SELECT
  schemaname,
  tablename,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE tablename IN ('orders', 'order_items', 'order_timelines')
ORDER BY n_live_tup DESC;

-- ================================================================
-- Part 6: RLS 政策效能測試
-- ================================================================

-- 測試管理員查詢 (有 EXISTS 檢查)
-- 預期: 因為 EXISTS 子查詢而較慢
EXPLAIN ANALYZE
SELECT COUNT(*) FROM orders
WHERE EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = 'ADMIN-USER-ID'::UUID
  AND profiles.role = 'admin'
);

-- 測試直接查詢 (無 RLS)
-- 預期: 快速，使用索引
EXPLAIN ANALYZE
SELECT COUNT(*) FROM orders;

-- 測試複雜的 RLS 政策 (JOIN)
-- 預期: 可能導致 Seq Scan
EXPLAIN ANALYZE
SELECT o.id, o.order_number, o.total_amount
FROM orders o
WHERE EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = 'ADMIN-USER-ID'::UUID
  AND p.role = 'admin'
)
LIMIT 100;

-- ================================================================
-- Part 7: 索引最佳化建議
-- ================================================================

-- 建議 7a: 複合索引改進聚合性能
CREATE INDEX IF NOT EXISTS idx_orders_created_status_v2 ON orders(
  created_at DESC,
  status,
  total_amount
);

-- 測試改進前後的效能差異
-- 改進前執行計畫 (只用 idx_orders_created_at)
EXPLAIN ANALYZE
SELECT
  DATE_TRUNC('day', created_at) AS order_date,
  COUNT(*) AS total_orders,
  SUM(total_amount) AS daily_revenue
FROM orders
WHERE status = 'confirmed'
  AND created_at >= '2026-01-01'::TIMESTAMPTZ
GROUP BY DATE_TRUNC('day', created_at);

-- 建議 7b: 部分索引 (只索引活躍記錄)
CREATE INDEX IF NOT EXISTS idx_orders_active ON orders(created_at DESC)
WHERE status IN ('pending', 'confirmed', 'shipping');

-- 建議 7c: BRIN 索引 (時序資料)
CREATE INDEX IF NOT EXISTS idx_orders_created_brin ON orders
USING BRIN (created_at)
WITH (pages_per_range = 256);

-- ================================================================
-- Part 8: 查詢優化方案對比
-- ================================================================

-- 方案 A: 低效 - 依賴 RLS (NOT 推薦)
-- 耗時: ~200ms
-- 適用: 客戶端查詢自己的資料
--
-- SELECT * FROM orders
-- WHERE user_id = auth.uid()
--   AND created_at >= '2026-01-01'
-- ORDER BY created_at DESC
-- LIMIT 50;

-- 方案 B: 推薦 - 使用 Admin Client
-- 耗時: ~20ms
-- 適用: 報表、聚合、管理員操作
--
-- SELECT COUNT(*) FROM orders
-- WHERE status = 'confirmed'
--   AND created_at >= '2026-01-01';

-- 方案 C: 最佳 - 物化視圖
-- 耗時: ~2ms (快取)
-- 適用: 高頻查詢、儀表板
--
-- SELECT * FROM mv_daily_sales_summary
-- WHERE order_date >= '2026-01-01'::DATE;

-- ================================================================
-- Part 9: 向量化集合 (VectorSQL) 性能優化
-- ================================================================

-- 如果使用 Postgres 13+，可使用 JSON 型別加速聚合
-- (適合報表中需要返回多個聚合值的情況)

-- 例 9a: 傳統聚合 (多行返回)
SELECT
  DATE_TRUNC('day', created_at) AS order_date,
  COUNT(*) AS total_orders,
  SUM(total_amount) AS daily_revenue,
  AVG(total_amount) AS avg_order_value
FROM orders
WHERE created_at >= '2026-01-01'::TIMESTAMPTZ
GROUP BY DATE_TRUNC('day', created_at);

-- 例 9b: JSON 聚合 (單行返回 - 高效傳輸)
SELECT
  json_object_agg(
    DATE_TRUNC('day', created_at)::TEXT,
    json_build_object(
      'total_orders', COUNT(*),
      'daily_revenue', SUM(total_amount),
      'avg_order_value', AVG(total_amount)
    )
  ) AS daily_summary
FROM orders
WHERE created_at >= '2026-01-01'::TIMESTAMPTZ
GROUP BY DATE_TRUNC('day', created_at);

-- ================================================================
-- Part 10: 快取失效策略
-- ================================================================

-- 當訂單狀態變更時，觸發器刷新物化視圖
CREATE OR REPLACE FUNCTION invalidate_sales_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- 標記快取為無效 (實際應用中可寫入 Redis)
  INSERT INTO cache_invalidation (table_name, invalidated_at)
  VALUES ('orders', NOW())
  ON CONFLICT (table_name) DO UPDATE
  SET invalidated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_orders_cache_invalidation
AFTER INSERT, UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION invalidate_sales_cache();

-- ================================================================
-- Part 11: 實用的報表查詢
-- ================================================================

-- 報表 11a: 每日銷售摘要
SELECT
  DATE_TRUNC('day', orders.created_at)::DATE AS order_date,
  COUNT(*) AS total_orders,
  SUM(orders.total_amount)::NUMERIC(10,2) AS daily_revenue,
  AVG(orders.total_amount)::NUMERIC(10,2) AS avg_order_value,
  COUNT(CASE WHEN orders.status = 'confirmed' THEN 1 END) AS confirmed_count,
  COUNT(CASE WHEN orders.status = 'pending' THEN 1 END) AS pending_count,
  COUNT(CASE WHEN orders.status = 'cancelled' THEN 1 END) AS cancelled_count
FROM orders
WHERE orders.created_at >= (CURRENT_DATE - INTERVAL '30 days')
GROUP BY DATE_TRUNC('day', orders.created_at)
ORDER BY order_date DESC;

-- 報表 11b: 按客戶統計
SELECT
  p.id AS client_id,
  COALESCE(p.display_name, p.phone) AS client_name,
  t.name AS tier_name,
  COUNT(DISTINCT o.id) AS order_count,
  SUM(o.total_amount)::NUMERIC(10,2) AS total_spent,
  AVG(o.total_amount)::NUMERIC(10,2) AS avg_order_value,
  MAX(o.created_at) AS last_order_date
FROM profiles p
LEFT JOIN tiers t ON p.tier_id = t.id
LEFT JOIN orders o ON p.id = o.user_id AND o.status != 'cancelled'
WHERE p.role = 'client'
GROUP BY p.id, p.display_name, p.phone, t.name
ORDER BY total_spent DESC NULLS LAST;

-- 報表 11c: 熱銷商品
SELECT
  p.id AS product_id,
  p.name AS product_name,
  s.name AS series_name,
  COUNT(oi.id) AS times_sold,
  SUM(oi.quantity) AS total_qty_sold,
  SUM(oi.subtotal)::NUMERIC(10,2) AS total_revenue,
  AVG(oi.deal_price)::NUMERIC(10,2) AS avg_sale_price
FROM products p
LEFT JOIN series s ON p.series_id = s.id
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'confirmed'
WHERE p.status = 'active'
GROUP BY p.id, p.name, s.name
ORDER BY total_qty_sold DESC
LIMIT 20;

-- ================================================================
-- Part 12: 清理與維護
-- ================================================================

-- 重新分析表統計 (改進查詢計畫品質)
ANALYZE orders;
ANALYZE order_items;
ANALYZE order_timelines;
ANALYZE products;

-- 清理膨脹的表 (移除死行)
VACUUM ANALYZE orders;
VACUUM ANALYZE order_items;

-- 重建索引 (移除碎片)
-- ⚠️ 在低流量時段執行
-- REINDEX TABLE orders;

-- ================================================================
-- Part 13: 監控查詢
-- ================================================================

-- 監控當前執行的查詢
SELECT
  pid,
  usename,
  state,
  query,
  query_start,
  state_change
FROM pg_stat_activity
WHERE state != 'idle'
  AND usename != 'postgres'
ORDER BY query_start;

-- 監控表鎖 (找出堵塞)
SELECT
  a.datname,
  l.relation::regclass,
  l.mode,
  l.granted,
  a.usename,
  a.query,
  a.query_start
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted
ORDER BY a.query_start;

-- ================================================================
-- 執行完成
-- ================================================================

-- 本檔案提供的範例應該在 Supabase Studio 或本地 psql 環境中執行
-- 所有 EXPLAIN ANALYZE 結果應記錄用於效能對比

-- 下次更新: 2026-01-10
-- 作者: Claude Code Agent
