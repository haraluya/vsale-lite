-- Migration: 允許客戶取消自己的 pending 訂單
--
-- 此 Migration 新增以下功能：
-- 1. 客戶可以更新自己的 pending 狀態訂單（僅用於取消）
-- 2. 補強 PostgreSQL Function 的角色檢查安全性
--
-- 作者: Claude Code
-- 日期: 2026-02-24

-- ============================================================================
-- 1. 新增 RLS 策略：允許客戶更新自己的 pending 訂單
-- ============================================================================

-- 客戶只能將自己的 pending 訂單狀態改為 cancelled
-- 限制條件：
--   - 必須是訂單擁有者 (user_id = auth.uid())
--   - 訂單狀態必須是 pending
--   - 使用者角色必須是 client
CREATE POLICY "Clients can cancel their own pending orders"
ON "public"."orders"
FOR UPDATE
USING (
  user_id = auth.uid()
  AND status = 'pending'
  AND EXISTS (
    SELECT 1 FROM "public"."profiles"
    WHERE id = auth.uid() AND role = 'client'
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND status = 'cancelled'  -- 只允許更新為 cancelled 狀態
);

-- ============================================================================
-- 2. 補強 PostgreSQL Function 安全性
-- ============================================================================

-- 修改 cancel_order_and_restore_stock() Function
-- 新增角色檢查：客戶只能取消自己的訂單，管理員可取消任何訂單
CREATE OR REPLACE FUNCTION cancel_order_and_restore_stock(
  p_order_id uuid,
  p_actor_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_combo_item RECORD;
  v_selected_product jsonb;
  v_actor_role text;
BEGIN
  -- 取得訂單資訊
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', '訂單不存在');
  END IF;

  -- 檢查訂單狀態（允許 pending 或 shipping）
  IF v_order.status NOT IN ('pending', 'shipping') THEN
    RETURN json_build_object(
      'success', false,
      'error', '無法取消 ' || v_order.status || ' 狀態的訂單'
    );
  END IF;

  -- 🔒 新增：角色檢查
  -- 取得操作者角色
  SELECT role INTO v_actor_role FROM profiles WHERE id = p_actor_id;

  -- 如果不是訂單擁有者，必須是管理員才能取消
  IF v_order.user_id <> p_actor_id THEN
    IF v_actor_role <> 'admin' THEN
      RETURN json_build_object(
        'success', false,
        'error', '您只能取消自己的訂單'
      );
    END IF;
  END IF;

  -- 🔒 新增：客戶只能取消 pending 訂單
  IF v_actor_role = 'client' AND v_order.status <> 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'error', '客戶僅能取消未確認的訂單'
    );
  END IF;

  -- 更新訂單狀態為 cancelled
  UPDATE orders
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_order_id;

  -- 回補庫存（僅 shipping 狀態訂單需要回補）
  IF v_order.status = 'shipping' THEN
    -- 回補普通商品庫存
    FOR v_item IN
      SELECT product_id, quantity
      FROM order_items
      WHERE order_id = p_order_id
    LOOP
      UPDATE products
      SET stock = stock + v_item.quantity, updated_at = NOW()
      WHERE id = v_item.product_id;
    END LOOP;

    -- 回補組合優惠商品庫存
    FOR v_combo_item IN
      SELECT combo_deal_snapshot
      FROM order_combo_deal_items
      WHERE order_id = p_order_id
    LOOP
      -- 遍歷組合優惠快照中的選購商品
      FOR v_selected_product IN
        SELECT * FROM jsonb_array_elements(v_combo_item.combo_deal_snapshot->'selectedProducts')
      LOOP
        UPDATE products
        SET stock = stock + (v_selected_product->>'quantity')::INTEGER,
            updated_at = NOW()
        WHERE id = (v_selected_product->>'product_id')::UUID;
      END LOOP;
    END LOOP;
  END IF;

  -- 退還優惠券
  UPDATE user_coupons
  SET used_at = NULL, order_id = NULL, updated_at = NOW()
  WHERE order_id = p_order_id;

  -- 記錄操作歷史
  INSERT INTO order_timelines (
    order_id,
    action_type,
    old_status,
    new_status,
    actor_id,
    content
  ) VALUES (
    p_order_id,
    'cancelled',
    v_order.status,
    'cancelled',
    p_actor_id,
    CASE
      WHEN v_actor_role = 'client' THEN '客戶取消訂單'
      ELSE '管理員取消訂單'
    END
  );

  -- 記錄稽核日誌（如果是客戶取消）
  IF v_actor_role = 'client' THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      p_actor_id,
      'cancel_order',
      'order',
      p_order_id,
      json_build_object(
        'order_number', v_order.order_number,
        'previous_status', v_order.status,
        'cancelled_by', 'client'
      )
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', '訂單已成功取消'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', '取消訂單時發生錯誤: ' || SQLERRM
    );
END;
$$;

-- 確保 Function 權限正確
GRANT EXECUTE ON FUNCTION cancel_order_and_restore_stock(uuid, uuid) TO authenticated;

-- ============================================================================
-- 註解說明
-- ============================================================================

COMMENT ON POLICY "Clients can cancel their own pending orders" ON "public"."orders" IS
'允許客戶取消自己的 pending 狀態訂單。限制條件：僅訂單擁有者、僅 pending 狀態、僅 client 角色、僅能更新為 cancelled 狀態。';

COMMENT ON FUNCTION cancel_order_and_restore_stock(uuid, uuid) IS
'取消訂單並回補庫存（含組合優惠）。
安全性：客戶只能取消自己的 pending 訂單，管理員可取消任何 pending 或 shipping 訂單。
返回 JSON 格式: {success: boolean, message?: string, error?: string}';
