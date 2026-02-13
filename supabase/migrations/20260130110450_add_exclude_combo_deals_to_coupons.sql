-- =====================================================
-- Migration: 新增 exclude_combo_deals 欄位到 coupons 表
-- Date: 2026-01-30
-- Feature: 優惠券系統增強 - 支援「排除組合優惠」模式
-- =====================================================

-- 新增欄位：exclude_combo_deals（使用冪等性語法）
-- 用途：標記優惠券是否排除組合優惠（僅適用於普通商品訂單）
-- 預設值：false（向後相容）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'coupons'
    AND column_name = 'exclude_combo_deals'
  ) THEN
    ALTER TABLE coupons
    ADD COLUMN exclude_combo_deals BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 欄位註解
COMMENT ON COLUMN coupons.exclude_combo_deals IS '是否排除組合優惠（true = 優惠券僅適用於普通商品訂單，不可用於包含組合優惠的訂單）';

-- =====================================================
-- 資料遷移：無需遷移（新欄位預設為 false，維持現有行為）
-- =====================================================

-- =====================================================
-- 驗證邏輯說明
-- =====================================================
-- 組合優惠限制的四種模式：
--
-- 1. 無限制（預設）：
--    exclude_combo_deals = false
--    無 combo_restrictions 記錄
--    → 可用於所有訂單（包含普通商品與組合優惠）
--
-- 2. 排除組合優惠（🆕 新增）：
--    exclude_combo_deals = true
--    → 僅適用於普通商品訂單，不可用於包含組合優惠的訂單
--
-- 3. 適用所有組合優惠：
--    exclude_combo_deals = false
--    coupon_combo_restrictions 有一筆 combo_deal_id = NULL 的記錄
--    → 僅當購物車包含組合優惠時可用
--
-- 4. 僅適用指定組合優惠：
--    exclude_combo_deals = false
--    coupon_combo_restrictions 有具體的 combo_deal_id 記錄
--    → 僅當購物車包含指定組合優惠時可用
-- =====================================================
