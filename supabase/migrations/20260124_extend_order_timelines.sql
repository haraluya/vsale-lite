-- =====================================================
-- Migration: 擴展 order_timelines 支援訂單修改歷程
-- Feature: 011-shipping-and-order-edit
-- Phase: 6 (US3 - 訂單修改核心功能)
-- Created: 2026-01-06
-- =====================================================

-- 1. 新增 modifications 欄位（JSONB）
-- 用於儲存訂單修改的詳細變更內容
ALTER TABLE order_timelines
ADD COLUMN IF NOT EXISTS modifications JSONB;

-- 2. 新增 JSONB 欄位註解
COMMENT ON COLUMN order_timelines.modifications IS '訂單修改詳情 (JSON 格式): 包含商品價格/數量變更、費用新增/移除、運費調整等';

-- 3. 擴展 action_type CHECK 約束（新增 order_modified）
ALTER TABLE order_timelines DROP CONSTRAINT IF EXISTS order_timelines_action_type_check;
ALTER TABLE order_timelines ADD CONSTRAINT order_timelines_action_type_check
  CHECK (action_type IN ('created', 'status_changed', 'cancelled', 'comment', 'order_modified'));

-- 4. 新增 GIN 索引（優化 JSONB 查詢效能）
CREATE INDEX IF NOT EXISTS idx_order_timelines_modifications
  ON order_timelines USING GIN(modifications);

-- 5. 建立批次修改訂單函數
CREATE OR REPLACE FUNCTION update_order_with_modifications(
  p_order_id UUID,
  p_modifications JSONB,
  p_actor_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT, new_total DECIMAL)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_new_total DECIMAL(10,2);
  v_item JSONB;
  v_fee JSONB;
  v_items_subtotal DECIMAL(10,2);
  v_shipping_fee DECIMAL(10,2);
  v_custom_fees_total DECIMAL(10,2);
  v_coupon_discount DECIMAL(10,2);
BEGIN
  -- ===== 1. 檢查訂單狀態 =====
  SELECT status INTO v_current_status FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT FALSE, '訂單不存在', NULL::DECIMAL;
    RETURN;
  END IF;

  IF v_current_status NOT IN ('pending') THEN
    RETURN QUERY SELECT FALSE, '僅待確認訂單可修改，此訂單狀態為 ' || v_current_status, NULL::DECIMAL;
    RETURN;
  END IF;

  -- ===== 2. 處理商品修改 =====
  IF p_modifications->'items' IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_modifications->'items')
    LOOP
      CASE v_item->>'type'
        -- A. 價格變更
        WHEN 'price_changed' THEN
          UPDATE order_items
          SET deal_price = (v_item->>'new_price')::DECIMAL,
              subtotal = (v_item->>'new_price')::DECIMAL * quantity
          WHERE id = (v_item->>'item_id')::UUID;

        -- B. 數量變更
        WHEN 'quantity_changed' THEN
          UPDATE order_items
          SET quantity = (v_item->>'new_quantity')::INTEGER,
              subtotal = deal_price * (v_item->>'new_quantity')::INTEGER
          WHERE id = (v_item->>'item_id')::UUID;

        -- C. 移除商品
        WHEN 'removed' THEN
          DELETE FROM order_items WHERE id = (v_item->>'item_id')::UUID;

        -- D. 新增商品
        WHEN 'added' THEN
          INSERT INTO order_items (order_id, product_id, product_name_snapshot, deal_price, quantity, subtotal)
          VALUES (
            p_order_id,
            (v_item->>'product_id')::UUID,
            v_item->>'product_name',
            (v_item->>'new_price')::DECIMAL,
            (v_item->>'new_quantity')::INTEGER,
            (v_item->>'new_price')::DECIMAL * (v_item->>'new_quantity')::INTEGER
          );
      END CASE;
    END LOOP;
  END IF;

  -- ===== 3. 檢查是否還有商品（至少保留一個商品）=====
  IF (SELECT COUNT(*) FROM order_items WHERE order_id = p_order_id) = 0 THEN
    RETURN QUERY SELECT FALSE, '訂單至少需保留一個商品，無法全部移除', NULL::DECIMAL;
    RETURN;
  END IF;

  -- ===== 4. 處理費用修改 =====
  IF p_modifications->'fees' IS NOT NULL THEN
    FOR v_fee IN SELECT * FROM jsonb_array_elements(p_modifications->'fees')
    LOOP
      CASE v_fee->>'type'
        -- A. 新增費用
        WHEN 'added' THEN
          INSERT INTO order_custom_fees (order_id, fee_name, amount, created_by)
          VALUES (
            p_order_id,
            v_fee->>'fee_name',
            (v_fee->>'amount')::DECIMAL,
            p_actor_id
          );

        -- B. 移除費用
        WHEN 'removed' THEN
          DELETE FROM order_custom_fees
          WHERE order_id = p_order_id AND fee_name = v_fee->>'fee_name';
      END CASE;
    END LOOP;
  END IF;

  -- ===== 5. 處理運費修改 =====
  IF p_modifications->'shipping' IS NOT NULL THEN
    UPDATE orders
    SET shipping_fee = (p_modifications->'shipping'->>'new_fee')::DECIMAL
    WHERE id = p_order_id;
  END IF;

  -- ===== 6. 處理優惠券移除 =====
  IF p_modifications->'coupon' IS NOT NULL THEN
    IF p_modifications->'coupon'->>'action' = 'removed' THEN
      -- 刪除優惠券快照
      DELETE FROM order_coupons WHERE order_id = p_order_id;

      -- 更新 user_coupons 狀態為未使用
      UPDATE user_coupons
      SET used_at = NULL,
          order_id = NULL
      WHERE order_id = p_order_id;
    END IF;
  END IF;

  -- ===== 7. 重新計算訂單總金額 =====
  -- 商品小計
  SELECT COALESCE(SUM(subtotal), 0)
  INTO v_items_subtotal
  FROM order_items
  WHERE order_id = p_order_id;

  -- 運費
  SELECT COALESCE(shipping_fee, 0)
  INTO v_shipping_fee
  FROM orders
  WHERE id = p_order_id;

  -- 自訂費用合計
  SELECT COALESCE(SUM(amount), 0)
  INTO v_custom_fees_total
  FROM order_custom_fees
  WHERE order_id = p_order_id;

  -- 優惠券折扣
  SELECT COALESCE(discount_amount, 0)
  INTO v_coupon_discount
  FROM order_coupons
  WHERE order_id = p_order_id;

  -- 總金額 = 商品小計 - 優惠券折扣 + 運費 + 自訂費用
  v_new_total := v_items_subtotal - v_coupon_discount + v_shipping_fee + v_custom_fees_total;

  -- 確保總金額不為負數
  IF v_new_total < 0 THEN
    RETURN QUERY SELECT FALSE, '訂單總金額不可為負數，請檢查費用設定', NULL::DECIMAL;
    RETURN;
  END IF;

  -- ===== 8. 更新訂單總金額 =====
  UPDATE orders
  SET total_amount = v_new_total,
      updated_at = NOW()
  WHERE id = p_order_id;

  -- ===== 9. 記錄修改歷程 =====
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, modifications)
  VALUES (
    p_order_id,
    'order_modified',
    p_actor_id,
    (SELECT role FROM profiles WHERE id = p_actor_id),
    p_modifications
  );

  -- ===== 10. 回傳成功結果 =====
  RETURN QUERY SELECT TRUE, '訂單修改成功', v_new_total;
END;
$$;

-- 6. 新增函數註解
COMMENT ON FUNCTION update_order_with_modifications(UUID, JSONB, UUID) IS '批次修改訂單內容（商品、費用、運費、優惠券），確保原子性操作';

-- 7. 授予執行權限（僅 authenticated users）
GRANT EXECUTE ON FUNCTION update_order_with_modifications(UUID, JSONB, UUID) TO authenticated;

-- =====================================================
-- Migration 完成
-- =====================================================
