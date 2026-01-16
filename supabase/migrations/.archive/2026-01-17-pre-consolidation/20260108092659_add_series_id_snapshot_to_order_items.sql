-- Migration: 新增 series_id_snapshot 到 order_items 表
-- Feature: 009-coupon-system（優惠券系列限制驗證）
-- Issue: 訂單修改時驗證優惠券條件需要查詢 products.series_id，但商品刪除後無法查詢
-- Solution: 新增 series_id_snapshot 欄位儲存系列 ID 快照
--
-- 背景：
-- - 優惠券可設定系列限制（僅特定系列商品可使用）
-- - 訂單修改後需重新驗證優惠券條件
-- - 若商品已刪除（product_id = NULL），無法查詢 series_id
-- - 新增快照欄位確保驗證邏輯完全獨立於商品表

-- 1. 新增 series_id_snapshot 欄位（可為 NULL，因為可能是舊資料）
ALTER TABLE order_items
  ADD COLUMN series_id_snapshot UUID;

-- 2. 新增外鍵約束（使用 ON DELETE SET NULL）
ALTER TABLE order_items
  ADD CONSTRAINT order_items_series_id_snapshot_fkey
  FOREIGN KEY (series_id_snapshot)
  REFERENCES series(id)
  ON DELETE SET NULL;

-- 3. 新增索引（優化查詢效能）
CREATE INDEX IF NOT EXISTS idx_order_items_series_id_snapshot
  ON order_items(series_id_snapshot);

-- 4. 更新註解
COMMENT ON COLUMN order_items.series_id_snapshot IS '系列 ID 快照（用於優惠券系列限制驗證，商品刪除時保留）';

-- 5. 回填現有訂單的 series_id_snapshot（從 products 表查詢）
-- 注意：僅回填 product_id 不為 NULL 的記錄
UPDATE order_items
SET series_id_snapshot = products.series_id
FROM products
WHERE order_items.product_id = products.id
  AND order_items.series_id_snapshot IS NULL;

-- 6. 驗證回填結果（可選，僅供檢查）
-- SELECT COUNT(*) FROM order_items WHERE product_id IS NOT NULL AND series_id_snapshot IS NULL;
-- 預期結果：0（所有有 product_id 的記錄都應該有 series_id_snapshot）
