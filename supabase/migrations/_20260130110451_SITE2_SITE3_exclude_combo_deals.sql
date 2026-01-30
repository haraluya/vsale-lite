-- =====================================================
-- 站點 2 & 站點 3 手動 Migration
-- Date: 2026-01-30
-- Feature: 優惠券系統增強 - 支援「排除組合優惠」模式
-- =====================================================
--
-- 請分別在以下兩個站點的 SQL Editor 中執行此 SQL：
--
-- 站點 2 Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs/sql/new
--
-- 站點 3 Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/dewhcpfzrzewgknaqzwy/sql/new
--
-- =====================================================

-- 新增欄位：exclude_combo_deals
-- 用途：標記優惠券是否排除組合優惠（僅適用於普通商品訂單）
-- 預設值：false（向後相容）
ALTER TABLE coupons
ADD COLUMN exclude_combo_deals BOOLEAN NOT NULL DEFAULT false;

-- 欄位註解
COMMENT ON COLUMN coupons.exclude_combo_deals IS '是否排除組合優惠（true = 優惠券僅適用於普通商品訂單，不可用於包含組合優惠的訂單）';

-- =====================================================
-- 執行完成後，請在站點 2 和站點 3 分別確認：
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'coupons' AND column_name = 'exclude_combo_deals';
--
-- 預期結果：
-- column_name         | data_type | column_default
-- --------------------+-----------+---------------
-- exclude_combo_deals | boolean   | false
-- =====================================================
