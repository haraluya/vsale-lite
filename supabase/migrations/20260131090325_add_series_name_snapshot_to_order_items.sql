-- =====================================================
-- Migration: 新增 series_name_snapshot 欄位到 order_items
-- Feature: 訂單系統 - 修復顯示問題
-- Created: 2026-01-31
-- =====================================================
--
-- 問題說明：
-- 目前 order_items 只有 product_name_snapshot（商品名稱，如「灰色」），
-- 但在本專案設計中，商品名稱只是規格/口味，系列名稱才是主要產品（如「iPhone 17」）。
-- 單獨顯示「灰色」不合理，應該顯示「iPhone 17 - 灰色」。
--
-- 解決方案：
-- 1. 新增 series_name_snapshot 欄位儲存系列名稱快照
-- 2. 為現有訂單回填系列名稱（透過 series_id_snapshot JOIN series 表）
-- 3. 未來建立訂單時，Server Action 會同時儲存系列名稱
-- =====================================================

-- 1. 新增 series_name_snapshot 欄位（允許 NULL，因為可能有舊訂單沒有系列）
ALTER TABLE order_items
ADD COLUMN series_name_snapshot TEXT;

COMMENT ON COLUMN order_items.series_name_snapshot IS '系列名稱快照（用於訂單顯示，避免依賴 JOIN）';

-- 2. 為現有訂單回填系列名稱
-- 透過 series_id_snapshot JOIN series 表取得系列名稱
UPDATE order_items oi
SET series_name_snapshot = s.name
FROM series s
WHERE oi.series_id_snapshot = s.id
  AND oi.series_name_snapshot IS NULL;

-- 3. 驗證回填結果（可選，用於除錯）
-- SELECT
--   COUNT(*) AS total_items,
--   COUNT(series_name_snapshot) AS items_with_series_name,
--   COUNT(*) - COUNT(series_name_snapshot) AS items_without_series_name
-- FROM order_items;
