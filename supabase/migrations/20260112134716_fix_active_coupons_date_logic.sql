-- ============================================================================
-- Migration: 修復 active_coupons View 的日期比較邏輯
-- Feature: Bug Fix
-- Date: 2026-01-12
-- Description: 修正優惠券有效期限判斷邏輯，確保在有效期最後一天仍可領取
-- ============================================================================

-- 問題描述:
-- 原本的邏輯使用 NOW() BETWEEN valid_from AND valid_until
-- 當 valid_until 是日期時（例如 2026-02-11），會被解釋為 2026-02-11 00:00:00
-- 導致在 2026-02-11 當天 00:00:01 之後就被判定為已過期
--
-- 修復方式:
-- 改用日期比較，確保在有效期最後一天的 23:59:59 之前都可以領取

-- ============================================================================
-- 1. 重新建立 active_coupons View
-- ============================================================================

CREATE OR REPLACE VIEW active_coupons AS
SELECT * FROM coupons
WHERE status = 'active'
  AND CURRENT_DATE >= valid_from::DATE
  AND CURRENT_DATE <= valid_until::DATE;

COMMENT ON VIEW active_coupons IS '有效優惠券 View - 自動過濾過期與已刪除優惠券，使用日期比較確保在有效期最後一天仍可領取';

-- ============================================================================
-- 2. 驗證 Migration
-- ============================================================================

DO $$
DECLARE
  v_view_exists BOOLEAN;
BEGIN
  -- 檢查 View 是否存在
  SELECT EXISTS (
    SELECT 1
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname = 'active_coupons'
  ) INTO v_view_exists;

  IF v_view_exists THEN
    RAISE NOTICE '✅ Migration 完成：active_coupons View 已更新';
    RAISE NOTICE '  - 修復日期比較邏輯，使用 CURRENT_DATE 而非 NOW()';
    RAISE NOTICE '  - 確保在有效期最後一天仍可領取優惠券';
  ELSE
    RAISE EXCEPTION '❌ Migration 失敗：active_coupons View 不存在';
  END IF;
END $$;
