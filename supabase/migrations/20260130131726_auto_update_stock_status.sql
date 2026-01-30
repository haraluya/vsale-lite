-- ============================================================
-- Auto Update Stock Status Trigger
-- Feature: Bug Fix - 自動同步庫存狀態
-- Created: 2026-01-30
-- ============================================================

-- 說明：
-- 修復問題：stock_status 欄位沒有自動更新，導致前台顯示錯誤的庫存狀態
-- 解決方案：建立 Trigger 自動根據 stock 數值更新 stock_status
--
-- 規則：
-- - stock > 10       → stock_status = 'sufficient' (庫存充足)
-- - 0 < stock <= 10  → stock_status = 'low'        (庫存緊張)
-- - stock <= 0       → stock_status = 'out_of_stock' (缺貨/預購)

-- ============================================================
-- Step 1: 建立 Trigger Function
-- ============================================================

CREATE OR REPLACE FUNCTION update_stock_status()
RETURNS TRIGGER AS $$
BEGIN
  -- 根據庫存數量自動設定 stock_status
  IF NEW.stock > 10 THEN
    NEW.stock_status := 'sufficient';
  ELSIF NEW.stock > 0 THEN
    NEW.stock_status := 'low';
  ELSE
    NEW.stock_status := 'out_of_stock';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Step 2: 綁定 Trigger 到 products 表
-- ============================================================

-- 當 INSERT 或 UPDATE stock 欄位時自動執行
CREATE TRIGGER trigger_update_stock_status
BEFORE INSERT OR UPDATE OF stock ON products
FOR EACH ROW
EXECUTE FUNCTION update_stock_status();

-- ============================================================
-- Step 3: 修正現有資料（一次性更新所有商品的 stock_status）
-- ============================================================

UPDATE products
SET stock_status = CASE
  WHEN stock > 10 THEN 'sufficient'
  WHEN stock > 0 THEN 'low'
  ELSE 'out_of_stock'
END;

-- ============================================================
-- Step 4: 新增註解
-- ============================================================

COMMENT ON FUNCTION update_stock_status IS '自動根據 stock 數值更新 stock_status 欄位';
COMMENT ON TRIGGER trigger_update_stock_status ON products IS '當商品庫存數量改變時自動更新庫存狀態標籤';

-- ============================================================
-- 驗證
-- ============================================================

-- 驗證 Trigger 是否正確建立
-- SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_stock_status';

-- 驗證現有資料是否已更新
-- SELECT stock, stock_status, COUNT(*)
-- FROM products
-- GROUP BY stock_status, stock
-- ORDER BY stock DESC;
