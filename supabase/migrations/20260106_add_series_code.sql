-- ================================================
-- Add Series Code Column
-- Feature: 003-series-and-pricing Enhancement
-- Date: 2026-01-03
-- Description: 新增系列代號欄位，修改商品編號生成規則為 [分類代碼]-[系列代碼]-[01]
-- ================================================

-- ================================================
-- Phase 1: 新增 series.code 欄位
-- ================================================

-- 1.1 新增 code 欄位（先設為 NULLABLE）
ALTER TABLE series
  ADD COLUMN IF NOT EXISTS code VARCHAR(10);

-- 1.2 更新現有系列的代碼（範例數據）
-- 注意：這裡需要根據實際系列設定代碼
UPDATE series SET code = 'TEA' WHERE name LIKE '%茶類系列%' AND code IS NULL;
UPDATE series SET code = 'JUC' WHERE name LIKE '%果汁系列%' AND code IS NULL;
UPDATE series SET code = 'CRB' WHERE name LIKE '%碳酸飲料%' AND code IS NULL;
UPDATE series SET code = 'WAT' WHERE name LIKE '%礦泉水%' AND code IS NULL;

-- 對於「未分類」系列，使用特殊代碼
UPDATE series SET code = 'UNC' WHERE name LIKE '%未分類%' AND code IS NULL;

-- 1.3 檢查是否仍有系列沒有代碼
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM series WHERE code IS NULL;

  IF v_count > 0 THEN
    RAISE WARNING '仍有 % 個系列未設定代碼，請手動設定後再執行後續步驟', v_count;
    -- 為未設定的系列設定預設代碼（使用 ID 前 3 碼）
    UPDATE series
    SET code = UPPER(SUBSTRING(MD5(id::TEXT) FROM 1 FOR 3))
    WHERE code IS NULL;
  END IF;
END $$;

-- 1.4 設定 code 為必填
ALTER TABLE series
  ALTER COLUMN code SET NOT NULL;

-- 1.5 新增唯一性約束與格式檢查
ALTER TABLE series
  ADD CONSTRAINT series_code_unique UNIQUE (code);

ALTER TABLE series
  ADD CONSTRAINT series_code_format_check
    CHECK (code ~ '^[A-Z]{3,10}$');

-- 1.6 新增索引
CREATE INDEX IF NOT EXISTS idx_series_code ON series(code);

COMMENT ON COLUMN series.code IS '系列代碼（3-10 個大寫字母，如 TEA, JUC）';

-- ================================================
-- Phase 2: 修改商品編號生成函數
-- ================================================

-- 2.1 刪除舊函數
DROP FUNCTION IF EXISTS generate_product_code(UUID);

-- 2.2 建立新的商品編號生成函數
-- 格式: [分類代碼]-[系列代碼]-[01] (兩位數流水號)
CREATE OR REPLACE FUNCTION generate_product_code(p_series_id UUID)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
  v_category_code VARCHAR(10);
  v_series_code VARCHAR(10);
  v_max_number INTEGER;
  v_new_code VARCHAR(50);
BEGIN
  -- 1. 取得系列代碼與分類代碼
  SELECT c.code, s.code INTO v_category_code, v_series_code
  FROM series s
  INNER JOIN categories c ON s.category_id = c.id
  WHERE s.id = p_series_id;

  IF v_category_code IS NULL OR v_series_code IS NULL THEN
    RAISE EXCEPTION '無法找到系列對應的分類代碼或系列代碼';
  END IF;

  -- 2. 查詢該系列下已存在的最大流水號
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(p.code FROM '(\d+)$') AS INTEGER)),
    0
  ) INTO v_max_number
  FROM products p
  WHERE p.series_id = p_series_id
    AND p.code ~ ('^' || v_category_code || '-' || v_series_code || '-\d{2}$');

  -- 3. 產生新編號（兩位數流水號）
  v_new_code := v_category_code || '-' || v_series_code || '-' || LPAD((v_max_number + 1)::TEXT, 2, '0');

  RETURN v_new_code;
END;
$$;

COMMENT ON FUNCTION generate_product_code(UUID) IS '自動產生商品編號：[分類代碼]-[系列代碼]-[兩位流水號]（如 DRK-TEA-01）';

-- ================================================
-- Phase 3: 驗證
-- ================================================

DO $$
DECLARE
  v_series_count INTEGER;
  v_series_with_code INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_series_count FROM series;
  SELECT COUNT(*) INTO v_series_with_code FROM series WHERE code IS NOT NULL;

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration 完成: add_series_code';
  RAISE NOTICE '系列總數: %', v_series_count;
  RAISE NOTICE '已設定代碼: %', v_series_with_code;
  RAISE NOTICE '商品編號格式: [分類代碼]-[系列代碼]-[01]';
  RAISE NOTICE '==============================================';
END $$;
