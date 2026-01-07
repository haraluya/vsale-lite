-- Migration: 新增系列與商品名稱唯一性約束
-- Date: 2026-01-05
-- Description: 為 series 與 products 表的 name 欄位新增 UNIQUE 約束，確保匯入時不會產生重複名稱

-- ============================================================
-- Phase 1: 檢查現有資料是否有重複名稱（阻斷式）
-- ============================================================

DO $$
DECLARE
  v_series_duplicates INTEGER;
  v_products_duplicates INTEGER;
BEGIN
  -- 檢查 series 表重複名稱
  SELECT COUNT(*) INTO v_series_duplicates
  FROM (
    SELECT name FROM series GROUP BY name HAVING COUNT(*) > 1
  ) AS duplicates;

  -- 檢查 products 表重複名稱
  SELECT COUNT(*) INTO v_products_duplicates
  FROM (
    SELECT name FROM products GROUP BY name HAVING COUNT(*) > 1
  ) AS duplicates;

  -- 若有重複資料，立即中止 Migration
  IF v_series_duplicates > 0 THEN
    RAISE EXCEPTION '發現 % 組重複的系列名稱，請先手動處理後再執行 Migration', v_series_duplicates;
  END IF;

  IF v_products_duplicates > 0 THEN
    RAISE EXCEPTION '發現 % 組重複的商品名稱，請先手動處理後再執行 Migration', v_products_duplicates;
  END IF;

  -- 檢查通過
  RAISE NOTICE '✓ 名稱唯一性檢查通過，可安全新增約束';
END $$;

-- ============================================================
-- Phase 2: 新增 UNIQUE 約束
-- ============================================================

-- 為 series 表的 name 欄位新增唯一性約束
ALTER TABLE series ADD CONSTRAINT series_name_unique UNIQUE (name);

-- 為 products 表的 name 欄位新增唯一性約束
ALTER TABLE products ADD CONSTRAINT products_name_unique UNIQUE (name);

-- ============================================================
-- Phase 3: 建立索引（提升查詢效能）
-- ============================================================

-- 為 series.name 建立索引（加速重複檢查與搜尋）
CREATE INDEX IF NOT EXISTS idx_series_name ON series(name);

-- 為 products.name 建立索引（加速重複檢查與搜尋）
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- ============================================================
-- Migration 完成
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 完成：已新增系列與商品名稱唯一性約束';
END $$;
