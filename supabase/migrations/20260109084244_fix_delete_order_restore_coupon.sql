-- ================================================================
-- Migration: 修復刪除訂單時優惠券未退還問題
-- Feature: 009-coupon-system (優惠券退還機制)
-- Date: 2026-01-09
-- Description: 刪除訂單時，重置 user_coupons.used_at 與 order_id，讓客戶可再次使用優惠券
-- ================================================================

-- Function: 刪除 pending 狀態訂單並退還優惠券 (修復版)
-- 覆寫 M3 建立的 delete_order_pending 函數
CREATE OR REPLACE FUNCTION delete_order_pending(p_order_id UUID, p_actor_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- 1. 驗證訂單存在與狀態
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- 2. 僅允許刪除 pending 狀態的訂單
  IF v_order.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Can only delete pending orders');
  END IF;

  -- 3. 🆕 退還優惠券（重置 used_at 與 order_id，讓客戶可再次使用）
  UPDATE user_coupons
  SET used_at = NULL, order_id = NULL
  WHERE order_id = p_order_id;

  -- 4. 記錄刪除操作於 order_timelines (CASCADE 會刪除，但仍記錄一次)
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, notes)
  VALUES (
    p_order_id,
    'deleted',
    p_actor_id,
    'admin',
    COALESCE(p_reason, '管理員刪除訂單，優惠券已退還')
  );

  -- 5. 刪除訂單 (CASCADE 會自動刪除 order_items 與 order_timelines)
  DELETE FROM orders WHERE id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'order_number', v_order.order_number,
    'message', '訂單已刪除，優惠券已退還'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_order_pending(UUID, UUID, TEXT) IS
  '刪除 pending 狀態訂單並退還優惠券 (原子性操作，繞過 RLS)';

-- 授予 authenticated 角色執行權限
GRANT EXECUTE ON FUNCTION delete_order_pending(UUID, UUID, TEXT) TO authenticated;

-- ================================================================
-- Migration 完成
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration 完成：刪除訂單時退還優惠券';
  RAISE NOTICE '========================================';
  RAISE NOTICE '修復內容:';
  RAISE NOTICE '  1. 修復 delete_order_pending() 函數';
  RAISE NOTICE '  2. 刪除訂單時會自動重置 user_coupons.used_at 與 order_id';
  RAISE NOTICE '  3. 客戶可再次使用退還的優惠券';
  RAISE NOTICE '';
  RAISE NOTICE '適用場景:';
  RAISE NOTICE '  - 管理員刪除 pending 狀態訂單';
  RAISE NOTICE '  - 誤建立的測試訂單';
  RAISE NOTICE '========================================';
END $$;
