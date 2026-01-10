-- ================================================================
-- Product Enhancements: 商品管理改善
-- Feature: 商品名稱唯一性調整、系列顏色、批次編輯、排序功能
-- Created: 2026-01-11
-- ================================================================
-- 目標:
--   1. 商品名稱改為 UNIQUE (series_id, name) - 同系列內禁止重複
--   2. 系列新增 color 欄位 - 支援系列顏色顯示
--   3. 預設顏色分配給現有系列 - 15 種 Neo-Brutalism 調色盤
--   4. 新增 Trigger 自動分配顏色給新系列
-- ================================================================

BEGIN;

-- ================================================================
-- Step 1: 檢查衝突（若有衝突，自動中止並 ROLLBACK）
-- ================================================================

DO $$
DECLARE
  v_duplicate_count INTEGER;
BEGIN
  -- 檢查同系列內是否有重複商品名稱
  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT series_id, name, COUNT(*) as cnt
    FROM products
    GROUP BY series_id, name
    HAVING COUNT(*) > 1
  ) AS duplicates;

  IF v_duplicate_count > 0 THEN
    RAISE EXCEPTION '❌ 發現 % 組同系列內重複商品名稱，請先手動解決衝突', v_duplicate_count;
  END IF;

  RAISE NOTICE '✅ 檢查通過：同系列內無重複商品名稱';
END $$;

-- ================================================================
-- Step 2: 新增系列顏色欄位（不影響現有查詢）
-- ================================================================

-- 新增 color 欄位（Hex 格式，預設值為灰色）
ALTER TABLE series ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#94A3B8';

-- 新增約束：顏色格式驗證（# 開頭 + 6 位 16 進位碼）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_series_color_format'
  ) THEN
    ALTER TABLE series ADD CONSTRAINT check_series_color_format
      CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
  END IF;
END $$;

COMMENT ON COLUMN series.color IS '系列顏色代碼（Hex 格式，如 #FBBF24，用於 UI 顯示）';

-- ================================================================
-- Step 3: 移除舊約束、新增新約束（原子性操作）
-- ================================================================

-- 移除全域 UNIQUE 約束
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_name_key;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_name_unique;

-- 新增複合 UNIQUE 約束（系列內唯一）
ALTER TABLE products ADD CONSTRAINT products_series_id_name_key UNIQUE (series_id, name);

-- 新增索引優化查詢效能
CREATE INDEX IF NOT EXISTS idx_products_series_id_name ON products(series_id, name);

COMMENT ON CONSTRAINT products_series_id_name_key ON products IS '商品名稱在同系列內必須唯一（允許不同系列有同名商品）';
COMMENT ON INDEX idx_products_series_id_name IS '複合索引：系列 + 商品名稱（優化唯一性檢查與查詢）';

-- ================================================================
-- Step 4: 分配預設顏色給現有系列（Neo-Brutalism 調色盤）
-- ================================================================

DO $$
DECLARE
  v_colors TEXT[] := ARRAY[
    '#FBBF24', -- 黃色（主色）
    '#F87171', -- 紅色
    '#34D399', -- 綠色
    '#60A5FA', -- 藍色
    '#A78BFA', -- 紫色
    '#FB923C', -- 橘色
    '#EC4899', -- 粉紅色
    '#14B8A6', -- 青綠色
    '#F472B6', -- 洋紅色
    '#8B5CF6', -- 深紫色
    '#10B981', -- 深綠色
    '#3B82F6', -- 深藍色
    '#EF4444', -- 深紅色
    '#F59E0B', -- 深黃色
    '#06B6D4'  -- 天藍色
  ];
  v_series RECORD;
  v_index INTEGER := 1;
BEGIN
  -- 按系列建立順序分配顏色（循環使用）
  FOR v_series IN
    SELECT id FROM series ORDER BY created_at ASC
  LOOP
    UPDATE series
    SET color = v_colors[(v_index - 1) % array_length(v_colors, 1) + 1]
    WHERE id = v_series.id;

    v_index := v_index + 1;
  END LOOP;

  RAISE NOTICE '✅ 已分配預設顏色給 % 個系列', v_index - 1;
END $$;

-- ================================================================
-- Step 5: 新增 Trigger 自動分配顏色給新系列
-- ================================================================

CREATE OR REPLACE FUNCTION auto_assign_series_color()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_colors TEXT[] := ARRAY[
    '#FBBF24', '#F87171', '#34D399', '#60A5FA', '#A78BFA',
    '#FB923C', '#EC4899', '#14B8A6', '#F472B6', '#8B5CF6',
    '#10B981', '#3B82F6', '#EF4444', '#F59E0B', '#06B6D4'
  ];
  v_count INTEGER;
BEGIN
  -- 僅在未手動設定顏色時（使用預設值）自動分配
  IF NEW.color = '#94A3B8' OR NEW.color IS NULL THEN
    -- 計算現有系列數量，決定使用哪個顏色
    SELECT COUNT(*) INTO v_count FROM series;
    NEW.color := v_colors[(v_count % array_length(v_colors, 1)) + 1];
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_assign_series_color ON series;
CREATE TRIGGER trigger_auto_assign_series_color
BEFORE INSERT ON series
FOR EACH ROW
EXECUTE FUNCTION auto_assign_series_color();

COMMENT ON FUNCTION auto_assign_series_color() IS '自動分配顏色給新建立的系列（循環使用 15 種預設顏色）';
COMMENT ON TRIGGER trigger_auto_assign_series_color ON series IS '新系列建立時自動分配顏色';

-- ================================================================
-- Migration 完成
-- ================================================================

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE '✅ Migration 完成：商品管理改善';
  RAISE NOTICE '  1. 商品名稱約束已改為 UNIQUE (series_id, name)';
  RAISE NOTICE '  2. 系列新增 color 欄位（Hex 格式）';
  RAISE NOTICE '  3. 現有系列已分配預設顏色';
  RAISE NOTICE '  4. 新系列將自動分配顏色（循環 15 種）';
  RAISE NOTICE '===========================================';
END $$;
