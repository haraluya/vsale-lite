-- Migration: 修復訂單明細商品外鍵約束
-- Feature: 004-cart-and-orders
-- Issue: 商品在有訂單時無法刪除，但訂單應該使用商品快照
-- Solution: 將 product_id 改為可 NULL，並使用 ON DELETE SET NULL
--
-- 背景：
-- - 訂單明細已儲存商品快照 (product_name_snapshot)
-- - 刪除商品不應影響歷史訂單查詢
-- - product_id 僅用於關聯查詢，可為 NULL

-- 1. 移除現有外鍵約束
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

-- 2. 將 product_id 改為可 NULL
ALTER TABLE order_items
  ALTER COLUMN product_id DROP NOT NULL;

-- 3. 重新建立外鍵約束（使用 ON DELETE SET NULL）
ALTER TABLE order_items
  ADD CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES products(id)
  ON DELETE SET NULL;

-- 4. 更新註解
COMMENT ON COLUMN order_items.product_id IS '商品 ID（可為 NULL，刪除商品時自動設為 NULL，訂單仍保留商品名稱快照）';

-- 5. 驗證索引仍存在（支援 NULL 值查詢）
-- idx_order_items_product_id 索引已存在，支援 NULL 值
