-- Migration: 效能索引優化
-- Description: 建立複合索引以加速常見查詢（tier_prices、訂單篩選、訂單編號搜尋）
-- Author: Claude Code
-- Date: 2026-01-17

-- =====================================================================
-- 1. 啟用 pg_trgm 擴充（用於模糊搜尋）
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================================
-- 2. tier_prices 複合索引（product_id + tier_id）
-- =====================================================================

-- 用途：加速等級價格查詢（WHERE product_id = ? AND tier_id = ?）
CREATE INDEX IF NOT EXISTS idx_tier_prices_product_tier
  ON tier_prices(product_id, tier_id);

COMMENT ON INDEX idx_tier_prices_product_tier IS
  '加速等級價格查詢（product_id + tier_id 複合查詢）';

-- =====================================================================
-- 3. orders 複合索引（status + created_at）
-- =====================================================================

-- 用途：加速訂單列表篩選與排序（WHERE status = ? ORDER BY created_at DESC）
CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON orders(status, created_at DESC);

COMMENT ON INDEX idx_orders_status_created IS
  '加速訂單列表篩選與排序（status + created_at 組合）';

-- =====================================================================
-- 4. orders 訂單編號模糊搜尋索引（使用 GIN）
-- =====================================================================

-- 用途：加速訂單編號 ILIKE 查詢（WHERE order_number ILIKE '%keyword%'）
CREATE INDEX IF NOT EXISTS idx_orders_number_pattern
  ON orders USING gin(order_number gin_trgm_ops);

COMMENT ON INDEX idx_orders_number_pattern IS
  '加速訂單編號模糊搜尋（ILIKE 查詢）';

-- =====================================================================
-- 5. 驗證索引建立成功
-- =====================================================================

-- 測試查詢：
-- EXPLAIN ANALYZE
-- SELECT * FROM tier_prices WHERE product_id = '<id>' AND tier_id = '<id>';

-- EXPLAIN ANALYZE
-- SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at DESC;

-- EXPLAIN ANALYZE
-- SELECT * FROM orders WHERE order_number ILIKE '%VS%';
