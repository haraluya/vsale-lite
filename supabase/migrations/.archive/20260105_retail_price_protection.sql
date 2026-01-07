-- ================================================
-- Vsale-lite Retail Price Protection Migration
-- Feature: 003-series-and-pricing (Enhancement)
-- Date: 2026-01-03
-- Description: 零售價格固定化 - 新增等級保護欄位與零售價格必填
-- ================================================

-- ================================================
-- Phase 1: 新增 tiers.is_protected 欄位
-- ================================================

-- 1.1 新增保護欄位
ALTER TABLE tiers
  ADD COLUMN IF NOT EXISTS is_protected BOOLEAN DEFAULT false;

-- 1.2 標記零售等級為受保護
-- 方案 1: 使用名稱判斷 (假設零售等級名稱為「零售」)
UPDATE tiers
SET is_protected = true
WHERE name = '零售';

-- 方案 2: 使用 rank 判斷 (假設零售等級為最高 rank)
-- UPDATE tiers
-- SET is_protected = true
-- WHERE rank = (SELECT MAX(rank) FROM tiers);

-- 1.3 驗證零售等級已標記
DO $$
DECLARE
  v_protected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_protected_count
  FROM tiers
  WHERE is_protected = true;

  IF v_protected_count = 0 THEN
    RAISE WARNING '警告: 未找到零售等級,請手動標記 is_protected = true';
  ELSE
    RAISE NOTICE '✓ 已標記 % 個等級為受保護', v_protected_count;
  END IF;
END $$;

-- ================================================
-- Phase 2: 修復現有商品缺少零售價格的資料
-- ================================================

-- 2.1 檢查缺失資料
DO $$
DECLARE
  v_null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_null_count
  FROM products
  WHERE retail_price IS NULL;

  RAISE NOTICE '檢查到 % 個商品缺少零售價格', v_null_count;
END $$;

-- 2.2 修復策略 1: 設定為零售等級價格 (若已設定)
UPDATE products p
SET retail_price = tp.price
FROM tier_prices tp
INNER JOIN tiers t ON tp.tier_id = t.id
WHERE p.id = tp.product_id
  AND t.is_protected = true
  AND p.retail_price IS NULL
  AND tp.price IS NOT NULL;

-- 2.3 修復策略 2: 設定為最低等級價格 (若零售價格未設定)
UPDATE products p
SET retail_price = (
  SELECT MIN(tp.price)
  FROM tier_prices tp
  WHERE tp.product_id = p.id
  AND tp.price IS NOT NULL
)
WHERE p.retail_price IS NULL;

-- 2.4 修復策略 3: 若仍為 NULL,設為 0
UPDATE products
SET retail_price = 0
WHERE retail_price IS NULL;

-- 2.5 驗證修復結果
DO $$
DECLARE
  v_remaining_null INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_remaining_null
  FROM products
  WHERE retail_price IS NULL;

  IF v_remaining_null > 0 THEN
    RAISE EXCEPTION '資料修復失敗: 仍有 % 個商品缺少零售價格', v_remaining_null;
  ELSE
    RAISE NOTICE '✓ 所有商品已設定零售價格';
  END IF;
END $$;

-- 2.6 設定零售價格為必填
ALTER TABLE products
  ALTER COLUMN retail_price SET NOT NULL;

COMMENT ON COLUMN products.retail_price IS '零售價格 (必填) - 產品的基準價格,所有等級價格以此為參考';

-- ================================================
-- Phase 3: 建立零售價格同步機制 (自動建立零售等級價格)
-- ================================================

-- 3.1 為現有商品補建零售價格記錄 (若不存在)
DO $$
DECLARE
  v_retail_tier_id UUID;
  v_created_count INTEGER := 0;
BEGIN
  -- 取得零售等級 ID
  SELECT id INTO v_retail_tier_id
  FROM tiers
  WHERE is_protected = true
  LIMIT 1;

  IF v_retail_tier_id IS NULL THEN
    RAISE EXCEPTION '找不到受保護的零售等級';
  END IF;

  -- 為缺少零售價格記錄的商品補建
  INSERT INTO tier_prices (tier_id, product_id, price)
  SELECT
    v_retail_tier_id,
    p.id,
    p.retail_price
  FROM products p
  WHERE NOT EXISTS (
    SELECT 1
    FROM tier_prices tp
    WHERE tp.product_id = p.id
    AND tp.tier_id = v_retail_tier_id
  );

  GET DIAGNOSTICS v_created_count = ROW_COUNT;
  RAISE NOTICE '✓ 已為 % 個商品建立零售價格記錄', v_created_count;
END $$;

-- ================================================
-- Phase 4: 驗證與測試
-- ================================================

-- 4.1 驗證所有商品都有零售價格 (products.retail_price)
DO $$
DECLARE
  v_total_products INTEGER;
  v_with_retail_price INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_products FROM products;
  SELECT COUNT(*) INTO v_with_retail_price FROM products WHERE retail_price IS NOT NULL;

  RAISE NOTICE '商品總數: %', v_total_products;
  RAISE NOTICE '已設定零售價格: %', v_with_retail_price;

  IF v_total_products = v_with_retail_price THEN
    RAISE NOTICE '✓ 所有商品已設定零售價格 (必填檢查通過)';
  ELSE
    RAISE WARNING '警告: 仍有商品缺少零售價格';
  END IF;
END $$;

-- 4.2 驗證所有商品都有零售等級價格記錄 (tier_prices)
DO $$
DECLARE
  v_retail_tier_id UUID;
  v_total_products INTEGER;
  v_with_retail_tier_price INTEGER;
BEGIN
  SELECT id INTO v_retail_tier_id FROM tiers WHERE is_protected = true LIMIT 1;
  SELECT COUNT(*) INTO v_total_products FROM products;
  SELECT COUNT(DISTINCT tp.product_id) INTO v_with_retail_tier_price
  FROM tier_prices tp
  WHERE tp.tier_id = v_retail_tier_id;

  RAISE NOTICE '商品總數: %', v_total_products;
  RAISE NOTICE '已設定零售等級價格: %', v_with_retail_tier_price;

  IF v_total_products = v_with_retail_tier_price THEN
    RAISE NOTICE '✓ 所有商品已建立零售等級價格記錄';
  ELSE
    RAISE WARNING '警告: 仍有 % 個商品缺少零售等級價格記錄', v_total_products - v_with_retail_tier_price;
  END IF;
END $$;

-- ================================================
-- Migration 完成
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration 完成: 零售價格固定化';
  RAISE NOTICE '執行時間: %', NOW();
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✓ tiers.is_protected 欄位已新增';
  RAISE NOTICE '✓ 零售等級已標記為受保護';
  RAISE NOTICE '✓ products.retail_price 已設為必填';
  RAISE NOTICE '✓ 所有商品已建立零售價格記錄';
  RAISE NOTICE '==============================================';
END $$;
