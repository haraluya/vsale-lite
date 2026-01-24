-- ⭐ 首頁查詢效能優化 - 資料庫索引
-- Feature: 首頁載入速度優化（P1 - 資料庫索引）
-- 目標：查詢時間從 200-500ms → 50-100ms

-- ===================================
-- 1. 優化商品查詢（依系列+狀態）
-- ===================================
-- 使用場景：首頁 ProductDisplay 區塊查詢商品
-- WHERE status = 'active' AND series_id IN (...)
CREATE INDEX IF NOT EXISTS idx_products_series_status
ON products(series_id, status)
WHERE status = 'active';

COMMENT ON INDEX idx_products_series_status IS '優化首頁商品查詢（依系列+狀態篩選）';

-- ===================================
-- 2. 優化等級價格查詢
-- ===================================
-- 使用場景：LEFT JOIN tier_prices 查詢使用者等級價格
-- WHERE product_id = ... AND tier_id = ...
CREATE INDEX IF NOT EXISTS idx_tier_prices_product_tier
ON tier_prices(product_id, tier_id);

COMMENT ON INDEX idx_tier_prices_product_tier IS '優化等級價格查詢（複合索引）';

-- ===================================
-- 3. 優化標籤搜尋（GIN 索引）
-- ===================================
-- 使用場景：首頁 ProductDisplay 依標籤篩選商品
-- WHERE tags && ARRAY['tag1', 'tag2']
CREATE INDEX IF NOT EXISTS idx_products_tags
ON products USING GIN(tags);

COMMENT ON INDEX idx_products_tags IS '優化標籤搜尋（GIN 索引支援陣列查詢）';

-- ===================================
-- 4. 優化首頁區塊查詢
-- ===================================
-- 使用場景：查詢所有啟用的首頁區塊
-- WHERE is_active = true ORDER BY sort_order
CREATE INDEX IF NOT EXISTS idx_home_blocks_active_sort
ON home_page_blocks(is_active, sort_order)
WHERE is_active = true;

COMMENT ON INDEX idx_home_blocks_active_sort IS '優化首頁區塊查詢（部分索引）';

-- ===================================
-- 5. 優化系列查詢（含分類排序）
-- ===================================
-- 使用場景：前台系列列表查詢
-- WHERE status = 'active' AND category_id = ...
CREATE INDEX IF NOT EXISTS idx_series_category_status
ON series(category_id, status)
WHERE status = 'active';

COMMENT ON INDEX idx_series_category_status IS '優化系列查詢（依分類+狀態篩選）';

-- ===================================
-- 索引效能分析（生產環境執行前測試）
-- ===================================
-- 以下查詢可用於測試索引效能（註解狀態，需要時手動執行）

-- EXPLAIN ANALYZE
-- SELECT p.*, s.name as series_name, s.color as series_color, tp.price
-- FROM products p
-- LEFT JOIN series s ON p.series_id = s.id
-- LEFT JOIN tier_prices tp ON p.id = tp.product_id AND tp.tier_id = '...'
-- WHERE p.status = 'active' AND p.series_id IN ('...', '...');

-- EXPLAIN ANALYZE
-- SELECT * FROM home_page_blocks
-- WHERE is_active = true
-- ORDER BY sort_order;
