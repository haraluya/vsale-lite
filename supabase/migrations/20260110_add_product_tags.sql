-- Migration: 20260110_add_product_tags.sql
-- Date: 2026-01-04
-- Feature: 006-ux-enhancement - 商品標籤系統
-- Description: 新增 products.tags 欄位支援商品標籤功能

BEGIN;

-- =====================================================
-- 1. 新增 products.tags 欄位
-- =====================================================
-- 新增 TEXT[] 陣列欄位儲存商品標籤
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- =====================================================
-- 2. 建立 GIN 索引支援陣列查詢
-- =====================================================
-- GIN 索引支援 @> (包含) 與 && (交集) 運算子
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);

-- =====================================================
-- 3. 新增約束：標籤數量限制
-- =====================================================
-- 單一商品最多 5 個標籤
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_tags_length'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT check_tags_length
      CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 5);
  END IF;
END$$;

-- =====================================================
-- 4. 新增註解
-- =====================================================
COMMENT ON COLUMN products.tags IS '商品標籤陣列，如 {"熱銷", "新品", "限量"}，最多 5 個';

-- =====================================================
-- 5. 範例：為測試商品新增標籤 (選用)
-- =====================================================
-- 取消註解以下 SQL 可為現有商品新增測試標籤
-- UPDATE products SET tags = ARRAY['熱銷'] WHERE stock > 50;
-- UPDATE products SET tags = ARRAY['熱銷', '新品'] WHERE name LIKE '%可口可樂%';

COMMIT;
