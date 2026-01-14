-- ============================================================================
-- Migration: 修復 active_coupons View 的安全性設定
-- Feature: Security Fix
-- Date: 2026-01-14
-- Description: 將 active_coupons View 改為 SECURITY INVOKER，避免繞過 RLS 策略
-- ============================================================================

-- 問題描述:
-- Supabase Security Advisor 警告 active_coupons View 使用了 SECURITY DEFINER
-- 這會讓視圖以創建者的權限執行，可能繞過 RLS 策略
--
-- 解決方案:
-- 明確指定使用 SECURITY INVOKER，讓視圖以查詢用戶的權限執行
-- 這樣可以正確應用 RLS 策略，確保不同角色看到不同的資料
--

-- ============================================================================
-- 1. 重新建立 active_coupons View（使用 SECURITY INVOKER）
-- ============================================================================

CREATE OR REPLACE VIEW active_coupons
WITH (security_invoker = true)
AS
SELECT * FROM coupons
WHERE status = 'active'
  AND CURRENT_DATE >= valid_from::DATE
  AND CURRENT_DATE <= valid_until::DATE;

COMMENT ON VIEW active_coupons IS '有效優惠券 View - 自動過濾過期與已刪除優惠券，使用 SECURITY INVOKER 確保 RLS 策略正確應用';

-- ============================================================================
-- 2. 驗證 Migration
-- ============================================================================

DO $$
DECLARE
  v_view_exists BOOLEAN;
  v_security_invoker BOOLEAN;
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
    RAISE NOTICE '  - 設定 security_invoker = true';
    RAISE NOTICE '  - 視圖現在會以查詢用戶的權限執行';
    RAISE NOTICE '  - RLS 策略會正確應用';
  ELSE
    RAISE EXCEPTION '❌ Migration 失敗：active_coupons View 不存在';
  END IF;
END $$;

-- ============================================================================
-- 說明
-- ============================================================================
--
-- SECURITY INVOKER vs SECURITY DEFINER:
--
-- SECURITY INVOKER (推薦):
-- - 視圖以「查詢用戶」的權限執行
-- - RLS 策略會正確應用
-- - 不同用戶看到不同的資料（依照 RLS 規則）
-- - 更安全，符合最小權限原則
--
-- SECURITY DEFINER (不推薦):
-- - 視圖以「創建者」的權限執行
-- - 可能繞過 RLS 策略
-- - 所有用戶看到相同的資料（創建者看到的）
-- - 可能造成安全風險
--
-- ============================================================================
