-- =============================================
-- Migration: 修復 revert_shipping_to_pending 函數
-- 修正: 移除不必要的 admin_users 表查詢，避免權限錯誤
-- =============================================

CREATE OR REPLACE FUNCTION "public"."revert_shipping_to_pending"(
  "p_order_id" uuid,
  "p_admin_id" uuid,
  "p_reason" text DEFAULT NULL
)
RETURNS TABLE("success" boolean, "message" text)
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
  v_current_status text;
  v_order_number text;
  v_item RECORD;
BEGIN
  -- 1. 檢查訂單是否存在並取得當前狀態
  SELECT status, order_number INTO v_current_status, v_order_number
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, '訂單不存在';
    RETURN;
  END IF;

  -- 2. 檢查訂單狀態（僅 shipping 可恢復）
  IF v_current_status <> 'shipping' THEN
    RETURN QUERY SELECT FALSE, format('僅出貨中訂單可恢復，當前狀態: %s', v_current_status);
    RETURN;
  END IF;

  -- 3. 回補庫存（將之前扣減的庫存加回去）
  FOR v_item IN
    SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
  LOOP
    UPDATE products
    SET stock = stock + v_item.quantity,
        updated_at = NOW()
    WHERE id = v_item.product_id;
  END LOOP;

  -- 4. 更新訂單狀態為 pending
  UPDATE orders
  SET status = 'pending',
      updated_at = NOW()
  WHERE id = p_order_id;

  -- 5. 記錄操作歷史到 order_timelines
  INSERT INTO order_timelines (
    order_id,
    action_type,
    actor_id,
    actor_role,
    old_status,
    new_status,
    content
  ) VALUES (
    p_order_id,
    'status_updated',
    p_admin_id,
    'admin',
    'shipping',
    'pending',
    CASE
      WHEN p_reason IS NOT NULL AND p_reason <> '' THEN
        format('恢復到待確認狀態（已回補庫存）。原因: %s', p_reason)
      ELSE
        '恢復到待確認狀態（已回補庫存）'
    END
  );

  -- 6. 回傳成功訊息
  RETURN QUERY SELECT TRUE, format('訂單 %s 已恢復到待確認狀態，庫存已回補', v_order_number);
  RETURN;
END;
$$;
