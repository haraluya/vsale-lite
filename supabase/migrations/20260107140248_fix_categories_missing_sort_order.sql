-- ================================================
-- Migration: 修復 categories 表缺少 sort_order 欄位
-- Created: 2026-01-07
-- Purpose: 新增缺少的 sort_order 欄位到 categories 表
-- ================================================

-- 檢查並新增 sort_order 欄位（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'categories'
        AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE categories
        ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

        RAISE NOTICE 'Added sort_order column to categories table';
    ELSE
        RAISE NOTICE 'sort_order column already exists in categories table';
    END IF;
END $$;

-- 更新現有資料的 sort_order（如果有資料的話）
UPDATE categories
SET sort_order = 0
WHERE sort_order IS NULL;

COMMENT ON COLUMN categories.sort_order IS '排序順序（數字越小越前面）';
