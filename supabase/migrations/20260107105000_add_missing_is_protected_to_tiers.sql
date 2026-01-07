-- ================================================================
-- 修復 Migration: 新增缺失的 tiers.is_protected 欄位
-- Issue: Migration 整合時遺漏此欄位導致價格管理頁面錯誤
-- Created: 2026-01-07
-- ================================================================
-- 來源: 20260105_retail_price_protection.sql (已封存於 .archive/)
-- 用途: 標記「零售」等級，確保等級價格不低於零售價（retail_price）
-- ================================================================

-- 1. 新增 is_protected 欄位
ALTER TABLE tiers
  ADD COLUMN IF NOT EXISTS is_protected BOOLEAN DEFAULT false;

COMMENT ON COLUMN tiers.is_protected IS '是否為受保護等級（零售）：true 表示此等級的價格不能低於 retail_price';

-- 2. 標記「零售」等級為受保護
UPDATE tiers
SET is_protected = true
WHERE name = '零售';

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '[FIX] tiers.is_protected 欄位已新增';
    RAISE NOTICE '  - 零售等級已標記為 is_protected = true';
    RAISE NOTICE '  - 價格保護約束將在 tier_prices 表建立後新增（見後續 Migration）';
END $$;
