-- Migration: 新增商品搜尋索引
-- Feature: 006-ux-enhancement (US1)
-- Date: 2026-01-04
-- Purpose: 優化商品名稱與編號的搜尋效能

-- 建立商品名稱索引 (支援 ILIKE 查詢)
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- 建立商品編號索引 (支援 ILIKE 查詢)
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);

-- 建立商品狀態索引 (常用篩選條件)
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- 建立組合索引 (狀態 + 更新時間) - 用於前台商品列表
CREATE INDEX IF NOT EXISTS idx_products_status_updated_at ON products(status, updated_at DESC);

-- 新增註解
COMMENT ON INDEX idx_products_name IS '商品名稱索引 - 用於全域搜尋 (Feature 006-US1)';
COMMENT ON INDEX idx_products_code IS '商品編號索引 - 用於全域搜尋 (Feature 006-US1)';
COMMENT ON INDEX idx_products_status IS '商品狀態索引 - 用於篩選 active 商品';
COMMENT ON INDEX idx_products_status_updated_at IS '商品狀態與更新時間組合索引 - 用於前台商品列表排序';
