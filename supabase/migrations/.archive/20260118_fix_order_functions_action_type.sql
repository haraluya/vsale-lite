-- Migration: 修復訂單 Functions 中的 action_type 錯誤
-- Date: 2026-01-18
-- Description: 將 PostgreSQL Functions 中的 'status_changed' 改為 'confirmed' 和 'status_updated'

-- ============================================================
-- 修復 confirm_order_and_deduct_stock Function
-- ============================================================

CREATE OR REPLACE FUNCTION confirm_order_and_deduct_stock(p_order_id UUID, p_actor_id UUID)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  -- 1. 驗證訂單存在與狀態
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Order status must be pending');
  END IF;

  -- 2. 更新訂單狀態
  UPDATE orders
  SET status = 'confirmed', updated_at = NOW()
  WHERE id = p_order_id;

  -- 3. 扣減庫存 (支援負庫存)
  FOR v_item IN
    SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    UPDATE products
    SET stock = stock - v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  -- 4. 記錄操作歷史 (修正：使用 'confirmed' 而不是 'status_changed')
  INSERT INTO order_timelines (
    order_id, action_type, actor_id, actor_role, old_status, new_status
  ) VALUES (
    p_order_id, 'confirmed', p_actor_id, 'admin', 'pending', 'confirmed'
  );

  RETURN json_build_object('success', true, 'order_id', p_order_id);

EXCEPTION
  WHEN OTHERS THEN
    -- 自動回滾
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION confirm_order_and_deduct_stock(UUID, UUID) IS '訂單確認並扣減庫存 (原子性操作) - 已修復 action_type';

-- ============================================================
-- 修復 cancel_order_and_restore_stock Function
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_order_and_restore_stock(p_order_id UUID, p_actor_id UUID)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  -- 1. 驗證訂單存在與狀態
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status NOT IN ('pending', 'confirmed') THEN
    RETURN json_build_object('success', false, 'error', 'Cannot cancel order with status ' || v_order.status);
  END IF;

  -- 2. 更新訂單狀態
  UPDATE orders
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_order_id;

  -- 3. 回補庫存 (僅當訂單已確認時)
  IF v_order.status = 'confirmed' THEN
    FOR v_item IN
      SELECT * FROM order_items WHERE order_id = p_order_id
    LOOP
      UPDATE products
      SET stock = stock + v_item.quantity
      WHERE id = v_item.product_id;
    END LOOP;
  END IF;

  -- 4. 記錄操作歷史 (修正：使用 'cancelled' 而不是 'status_changed')
  INSERT INTO order_timelines (
    order_id, action_type, actor_id, actor_role, old_status, new_status
  ) VALUES (
    p_order_id, 'cancelled', p_actor_id, 'admin', v_order.status, 'cancelled'
  );

  RETURN json_build_object('success', true, 'order_id', p_order_id);

EXCEPTION
  WHEN OTHERS THEN
    -- 自動回滾
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cancel_order_and_restore_stock(UUID, UUID) IS '訂單取消並回補庫存 (原子性操作) - 已修復 action_type';

-- ============================================================
-- 修復 update_order_status Function
-- ============================================================

CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_actor_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- 1. 驗證訂單存在
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- 2. 驗證狀態轉換規則
  IF v_order.status = 'pending' AND p_new_status NOT IN ('confirmed', 'cancelled') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid status transition from pending');
  END IF;

  IF v_order.status = 'confirmed' AND p_new_status NOT IN ('shipping', 'cancelled') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid status transition from confirmed');
  END IF;

  IF v_order.status = 'shipping' AND p_new_status != 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'Invalid status transition from shipping');
  END IF;

  -- 3. 更新訂單狀態
  UPDATE orders
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_order_id;

  -- 4. 記錄操作歷史 (修正：使用 'status_updated' 而不是 'status_changed')
  INSERT INTO order_timelines (
    order_id, action_type, actor_id, actor_role, old_status, new_status
  ) VALUES (
    p_order_id, 'status_updated', p_actor_id, 'admin', v_order.status, p_new_status
  );

  RETURN json_build_object('success', true, 'order_id', p_order_id, 'new_status', p_new_status);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_order_status(UUID, TEXT, UUID) IS '更新訂單狀態並記錄歷史 (原子性操作) - 已修復 action_type';

-- ============================================================
-- Migration 完成
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 完成：已修復訂單 Functions 中的 action_type 錯誤';
  RAISE NOTICE '  - confirm_order_and_deduct_stock: status_changed → confirmed';
  RAISE NOTICE '  - cancel_order_and_restore_stock: status_changed → cancelled';
  RAISE NOTICE '  - update_order_status: status_changed → status_updated';
END $$;
