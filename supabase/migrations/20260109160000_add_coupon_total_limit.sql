-- ============================================================================
-- Migration: 新增優惠券總張數上限欄位
-- Feature: 009-coupon-system (Enhancement)
-- Date: 2026-01-09
-- Description: 新增 coupons.total_limit 欄位，支援限制總發放張數（NULL = 無限發放）
-- ============================================================================

-- ============================================================================
-- 1. 新增 total_limit 欄位到 coupons 表
-- ============================================================================

ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS total_limit INTEGER CHECK (total_limit IS NULL OR total_limit >= 1);

-- 註解
COMMENT ON COLUMN coupons.total_limit IS '總張數上限（所有客戶合計可領取張數，NULL 表示無限發放）';

-- ============================================================================
-- Migration 完成
-- ============================================================================
--
-- 變更內容:
-- - 新增 coupons.total_limit 欄位（INTEGER, NULLABLE）
-- - 約束：NULL（無限）或 >= 1（至少 1 張）
--
-- 使用範例:
-- - 限制總共發放 100 張：UPDATE coupons SET total_limit = 100 WHERE id = '...'
-- - 無限發放：UPDATE coupons SET total_limit = NULL WHERE id = '...'
--
-- ============================================================================
