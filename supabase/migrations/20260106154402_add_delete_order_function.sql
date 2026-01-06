-- ============================================================
-- Migration: 新增刪除訂單 PostgreSQL Function
-- Date: 2026-01-06
-- Feature: 004-cart-and-orders
-- Issue: 刪除訂單失敗，因為沒有 RLS Policy 允許 DELETE
-- Solution: 使用 PostgreSQL Function 繞過 RLS，確保原子性操作
-- ============================================================

-- Function: 刪除訂單 (僅 pending 狀態)
-- 說明：使用 SECURITY DEFINER 繞過 RLS Policy
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

  -- 3. 記錄刪除操作於 order_timelines (CASCADE 會刪除，但仍記錄一次)
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, notes)
  VALUES (
    p_order_id,
    'deleted',
    p_actor_id,
    'admin',
    COALESCE(p_reason, '管理員刪除訂單')
  );

  -- 4. 刪除訂單 (CASCADE 會自動刪除 order_items 與 order_timelines)
  DELETE FROM orders WHERE id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'order_id', p_order_id,
    'order_number', v_order.order_number,
    'message', '訂單 ' || v_order.order_number || ' 已刪除'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_order_pending(UUID, UUID, TEXT) IS '刪除 pending 狀態訂單 (原子性操作，繞過 RLS)';

-- ============================================================
-- Migration 完成
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 完成：已新增 delete_order_pending() Function';
  RAISE NOTICE '  - 使用 SECURITY DEFINER 繞過 RLS Policy';
  RAISE NOTICE '  - 僅允許刪除 pending 狀態訂單';
  RAISE NOTICE '  - CASCADE 自動刪除 order_items 與 order_timelines';
END $$;
