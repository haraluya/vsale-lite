-- ============================================================
-- Migration: 修復取消訂單功能 - 允許取消 shipping 狀態訂單
-- Date: 2026-01-19
-- Feature: 011-shipping-and-order-edit / US6
-- Issue: PostgreSQL Function 只允許取消 pending/confirmed，但應該也允許 shipping
-- ============================================================

-- 修復 cancel_order_and_restore_stock Function
-- 允許取消 pending, shipping 狀態的訂單（confirmed 已被移除）
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

  -- 🔧 修復：允許取消 pending 或 shipping 狀態的訂單
  IF v_order.status NOT IN ('pending', 'shipping') THEN
    RETURN json_build_object('success', false, 'error', 'Cannot cancel order with status ' || v_order.status);
  END IF;

  -- 2. 更新訂單狀態
  UPDATE orders
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_order_id;

  -- 3. 回補庫存（僅當訂單已出貨時 - Feature 011 將庫存扣減移至 shipping 階段）
  IF v_order.status = 'shipping' THEN
    FOR v_item IN
      SELECT * FROM order_items WHERE order_id = p_order_id
    LOOP
      UPDATE products
      SET stock = stock + v_item.quantity
      WHERE id = v_item.product_id;
    END LOOP;
  END IF;

  -- 4. 記錄訂單操作歷史
  INSERT INTO order_timelines (order_id, action_type, actor_id, notes)
  VALUES (
    p_order_id,
    'cancelled',
    p_actor_id,
    CASE
      WHEN v_order.status = 'shipping' THEN '訂單已取消，庫存已回補'
      ELSE '訂單已取消'
    END
  );

  RETURN json_build_object(
    'success', true,
    'order_id', p_order_id,
    'message', '訂單已成功取消'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cancel_order_and_restore_stock(UUID, UUID) IS '訂單取消並回補庫存 (原子性操作) - 支援 pending/shipping → cancelled';

-- ============================================================
-- Migration 完成
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 完成：已修復 cancel_order_and_restore_stock - 現在支援取消 shipping 狀態訂單';
  RAISE NOTICE '  - 允許狀態: pending → cancelled, shipping → cancelled';
  RAISE NOTICE '  - shipping 取消時會自動回補庫存';
END $$;
