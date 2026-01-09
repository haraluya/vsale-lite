-- ================================================================
-- Migration: 修復取消訂單時優惠券未退還問題
-- Feature: 009-coupon-system (優惠券退還機制)
-- Date: 2026-01-09
-- Description: 訂單取消時，重置 user_coupons.used_at 與 order_id，讓客戶可再次使用優惠券
-- ================================================================

-- Function: 訂單取消並回補庫存與優惠券 (修復版)
-- 覆寫 M4 建立的 cancel_order_and_restore_stock 函數
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

  -- 允許取消 pending 或 shipping 狀態的訂單
  IF v_order.status NOT IN ('pending', 'shipping') THEN
    RETURN json_build_object('success', false, 'error', 'Cannot cancel order with status ' || v_order.status);
  END IF;

  -- 2. 更新訂單狀態
  UPDATE orders
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_order_id;

  -- 3. 回補庫存（僅當訂單已出貨時 - 庫存扣減已移至 shipping 階段）
  IF v_order.status = 'shipping' THEN
    FOR v_item IN
      SELECT * FROM order_items WHERE order_id = p_order_id
    LOOP
      UPDATE products
      SET stock = stock + v_item.quantity
      WHERE id = v_item.product_id;
    END LOOP;
  END IF;

  -- 4. 🆕 退還優惠券（重置 used_at 與 order_id，讓客戶可再次使用）
  UPDATE user_coupons
  SET used_at = NULL, order_id = NULL
  WHERE order_id = p_order_id;

  -- 5. 記錄訂單操作歷史
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, old_status, new_status, notes)
  VALUES (
    p_order_id,
    'cancelled',
    p_actor_id,
    'admin',
    v_order.status,
    'cancelled',
    CASE
      WHEN v_order.status = 'shipping' THEN '訂單已取消，庫存已回補，優惠券已退還'
      ELSE '訂單已取消，優惠券已退還'
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

COMMENT ON FUNCTION cancel_order_and_restore_stock(UUID, UUID) IS
  '訂單取消並回補庫存與優惠券 (原子性操作) - 支援 pending/shipping → cancelled，優惠券自動退還';

-- 授權給已認證用戶
GRANT EXECUTE ON FUNCTION cancel_order_and_restore_stock(UUID, UUID) TO authenticated;

-- ================================================================
-- Migration 完成
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration (修復優惠券退還) 執行完成';
  RAISE NOTICE '   - 已修復 cancel_order_and_restore_stock 函數';
  RAISE NOTICE '   - 訂單取消時會自動重置 user_coupons.used_at 與 order_id';
  RAISE NOTICE '   - 客戶可再次使用退還的優惠券';
END $$;
