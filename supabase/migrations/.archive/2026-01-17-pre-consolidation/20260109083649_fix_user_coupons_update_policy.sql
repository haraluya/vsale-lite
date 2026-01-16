-- ================================================================
-- Migration: 修復 user_coupons 表缺少 UPDATE Policy 問題
-- Feature: 009-coupon-system (優惠券標記與退還)
-- Date: 2026-01-09
-- Description: 新增 UPDATE Policy 讓客戶可標記優惠券為已使用（訂單建立時）
-- ================================================================

-- 問題分析:
-- 1. 客戶建立訂單時，Server Action 會嘗試更新 user_coupons.used_at 與 order_id
-- 2. 但 user_coupons 表只有 SELECT 與 INSERT Policy，缺少 UPDATE Policy
-- 3. 導致 RLS 阻擋更新操作，優惠券無法標記為已使用

-- ================================================================
-- Part 1: 新增客戶 UPDATE Policy（允許標記優惠券為已使用）
-- ================================================================

-- 客戶可更新自己的優惠券記錄（標記為已使用）
-- 限制：只能更新 used_at 與 order_id 欄位
CREATE POLICY "Clients can mark their coupons as used"
  ON user_coupons FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON POLICY "Clients can mark their coupons as used" ON user_coupons IS
  '客戶可標記自己的優惠券為已使用（訂單建立時更新 used_at 與 order_id）';

-- ================================================================
-- Part 2: 新增管理員 UPDATE Policy（允許管理員更新所有優惠券記錄）
-- ================================================================

-- 管理員可更新所有客戶的優惠券記錄（用於取消訂單時退還優惠券）
CREATE POLICY "Admins can update all user coupons"
  ON user_coupons FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMENT ON POLICY "Admins can update all user coupons" ON user_coupons IS
  '管理員可更新所有客戶的優惠券記錄（用於取消訂單時退還優惠券）';

-- ================================================================
-- Part 3: 驗證 Policy 是否生效
-- ================================================================

DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  -- 檢查 user_coupons 表的 UPDATE Policy 數量
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'user_coupons'
  AND cmd = 'UPDATE';

  IF v_policy_count >= 2 THEN
    RAISE NOTICE '✅ user_coupons UPDATE Policy 已正確建立（共 % 個）', v_policy_count;
  ELSE
    RAISE EXCEPTION '❌ user_coupons UPDATE Policy 建立失敗';
  END IF;
END $$;

-- ================================================================
-- Migration 完成
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration 完成：user_coupons UPDATE Policy';
  RAISE NOTICE '========================================';
  RAISE NOTICE '修復內容:';
  RAISE NOTICE '  1. 新增客戶 UPDATE Policy - 允許標記優惠券為已使用';
  RAISE NOTICE '  2. 新增管理員 UPDATE Policy - 允許更新所有優惠券記錄';
  RAISE NOTICE '';
  RAISE NOTICE '影響功能:';
  RAISE NOTICE '  ✅ 訂單建立時可正確標記優惠券為已使用';
  RAISE NOTICE '  ✅ 訂單取消時可正確退還優惠券';
  RAISE NOTICE '========================================';
END $$;
