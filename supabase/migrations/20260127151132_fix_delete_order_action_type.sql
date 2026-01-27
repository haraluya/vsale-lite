-- =============================================
-- Migration: 改善刪除訂單函數的錯誤訊息（修正版）
-- 修正: 將英文錯誤訊息改為中文，並提供更詳細的除錯資訊
-- =============================================

CREATE OR REPLACE FUNCTION "public"."delete_order_pending"(
  "p_order_id" uuid,
  "p_actor_id" uuid,
  "p_reason" text DEFAULT NULL
)
RETURNS json
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_coupon_count INTEGER;
BEGIN
  -- 1. 驗證訂單存在與狀態
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', format('訂單不存在（ID: %s）', p_order_id)
    );
  END IF;

  -- 2. 僅允許刪除 pending 狀態的訂單
  IF v_order.status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'error', format('僅待確認訂單可刪除，當前狀態: %s', v_order.status)
    );
  END IF;

  -- 3. 退還優惠券（重置 used_at 與 order_id，讓客戶可再次使用）
  UPDATE user_coupons
  SET used_at = NULL, order_id = NULL
  WHERE order_id = p_order_id;

  -- 記錄退還的優惠券數量（用於除錯）
  GET DIAGNOSTICS v_coupon_count = ROW_COUNT;

  -- 4. 記錄刪除操作於 order_timelines (CASCADE 會刪除，但仍記錄一次)
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, content)
  VALUES (
    p_order_id,
    'deleted',
    p_actor_id,
    'admin',
    COALESCE(p_reason, format('管理員刪除訂單，已退還 %s 張優惠券', v_coupon_count))
  );

  -- 5. 刪除訂單 (CASCADE 會自動刪除 order_items、order_custom_fees 與 order_timelines)
  DELETE FROM orders WHERE id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'order_number', v_order.order_number,
    'message', format('訂單 %s 已刪除，已退還 %s 張優惠券', v_order.order_number, v_coupon_count)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', format('刪除訂單時發生錯誤: %s', SQLERRM)
    );
END;
$$;

-- 更新函數註解
COMMENT ON FUNCTION "public"."delete_order_pending" IS '刪除 pending 狀態訂單並退還優惠券（原子性操作，繞過 RLS）';
