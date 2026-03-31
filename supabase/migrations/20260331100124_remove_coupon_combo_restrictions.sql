-- 移除組合優惠-優惠券限制表
-- 設計決策：優惠券與組合優惠完全獨立，不再需要互動機制
-- 參考：docs/superpowers/specs/2026-03-31-pricing-system-refactor-design.md

-- 1. 移除 RLS 政策
DROP POLICY IF EXISTS "coupon_combo_restrictions_admin_all" ON coupon_combo_restrictions;
DROP POLICY IF EXISTS "coupon_combo_restrictions_select" ON coupon_combo_restrictions;

-- 2. 移除組合優惠限制表
DROP TABLE IF EXISTS coupon_combo_restrictions;

-- 3. 移除 coupons 表的 exclude_combo_deals 欄位
ALTER TABLE coupons DROP COLUMN IF EXISTS exclude_combo_deals;
