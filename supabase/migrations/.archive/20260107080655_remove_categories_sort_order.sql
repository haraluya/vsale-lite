-- ================================================================
-- 移除 categories 表的 sort_order 欄位
-- Created: 2026-01-07
-- ================================================================
-- 說明：現在使用拖曳排序功能，sort_order 欄位已不再需要

-- 移除 sort_order 欄位（如果存在）
ALTER TABLE categories DROP COLUMN IF EXISTS sort_order;
