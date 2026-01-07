-- ================================================
-- Migration: 效能優化索引
-- Feature: 012-migration-consolidation
-- Date: 2026-01-07
-- Description: 新增商品列表與訂單查詢效能優化索引
-- Expected Impact: 整體查詢效能提升 30-70%
-- ================================================

-- ================================================
-- Phase 1: 商品表效能索引
-- ================================================

-- 索引 1: 商品系列狀態複合索引（最高優先級）
-- 使用場景: 後台商品列表（系列篩選）、前台商品瀏覽
-- 預期提升: 50-70%
-- 查詢範例: SELECT * FROM products WHERE series_id = ? AND status = 'active' ORDER BY updated_at DESC;
CREATE INDEX IF NOT EXISTS idx_products_series_status_updated
ON products (series_id, status, updated_at DESC)
WHERE status = 'active';

COMMENT ON INDEX idx_products_series_status_updated IS
  '效能優化索引：涵蓋商品系列篩選、狀態篩選、時間排序（僅索引 active 商品）';

-- ================================================
-- Phase 2: 訂單表效能索引
-- ================================================

-- 索引 2: 待處理訂單部分索引（最高優先級）
-- 使用場景: 管理員訂單列表（預設顯示待處理訂單）
-- 預期提升: 60-80%
-- 查詢範例: SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at ASC;
CREATE INDEX IF NOT EXISTS idx_orders_pending_created
ON orders (created_at ASC)
WHERE status = 'pending';

COMMENT ON INDEX idx_orders_pending_created IS
  '效能優化索引：專門優化待處理訂單查詢（部分索引減少體積）';

-- 索引 3: 客戶訂單複合索引（中高優先級）
-- 使用場景: 前台客戶訂單列表（含狀態篩選）
-- 預期提升: 30-50%
-- 查詢範例: SELECT * FROM orders WHERE user_id = ? AND status = ? ORDER BY created_at DESC;
CREATE INDEX IF NOT EXISTS idx_orders_user_status_created
ON orders (user_id, status, created_at DESC);

COMMENT ON INDEX idx_orders_user_status_created IS
  '效能優化索引：涵蓋客戶篩選、狀態篩選、時間排序';

-- ================================================
-- Phase 3: 索引維護註解
-- ================================================

-- 標籤 GIN 索引（已於 Migration 20260110 建立）
-- 使用場景: 前台商品篩選（標籤快速篩選）
-- 預期提升: 80-90%（相比無索引）
COMMENT ON INDEX idx_products_tags IS
  '標籤 GIN 索引：支援陣列查詢（已於 20260110 建立，預期提升 80-90%）';

-- ================================================
-- 效能測試指令（管理員手動執行）
-- ================================================

-- 測試 1: 商品列表查詢（系列篩選 + 狀態篩選 + 排序）
-- EXPLAIN ANALYZE
-- SELECT * FROM products
-- WHERE series_id = (SELECT id FROM series LIMIT 1) AND status = 'active'
-- ORDER BY updated_at DESC
-- LIMIT 20;

-- 測試 2: 待處理訂單查詢
-- EXPLAIN ANALYZE
-- SELECT * FROM orders
-- WHERE status = 'pending'
-- ORDER BY created_at ASC
-- LIMIT 20;

-- 測試 3: 客戶訂單列表（含狀態篩選）
-- EXPLAIN ANALYZE
-- SELECT * FROM orders
-- WHERE user_id = (SELECT id FROM profiles LIMIT 1) AND status = 'completed'
-- ORDER BY created_at DESC
-- LIMIT 20;

-- 測試 4: 標籤搜尋
-- EXPLAIN ANALYZE
-- SELECT * FROM products
-- WHERE tags @> ARRAY['熱銷'];

-- ================================================
-- Migration 完成確認
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '✅ 效能優化索引建立完成';
  RAISE NOTICE '📊 新增 3 個索引：idx_products_series_status_updated, idx_orders_pending_created, idx_orders_user_status_created';
  RAISE NOTICE '⚡ 預期整體效能提升 30-70%';
  RAISE NOTICE '🔍 請執行 EXPLAIN ANALYZE 驗證索引生效';
END $$;
