-- ================================================================
-- Migration: 修復 update_order_with_modifications 函數中的欄位名稱錯誤
-- Timestamp: 20260117000005
-- Description: 修復函數中使用錯誤的 "action" 欄位名稱，應為 "action_type"
-- ================================================================
-- 問題說明:
--   兩個 Migration (20260112134114, 20260112140105) 中的 update_order_with_modifications 函數
--   使用了錯誤的欄位名稱 "action" 而非 "action_type"
--   導致訂單修改時出現錯誤: column "action" of relation "order_timelines" does not exist
-- ================================================================

-- 重新建立 update_order_with_modifications 函數（修復欄位名稱）
-- 此函數定義來自 20260107130000_shipping_and_custom_fees.sql
-- 僅修正 INSERT INTO order_timelines 語句中的欄位名稱

CREATE OR REPLACE FUNCTION update_order_with_modifications(
  p_order_id UUID,
  p_modifications JSONB,
  p_actor_id UUID
)
RETURNS TABLE (success BOOLEAN, message TEXT, new_total DECIMAL)
LANGUAGE plpgsql
AS $$
DECLARE
  v_items JSONB;
  v_item JSONB;
  v_custom_fees JSONB;
  v_shipping JSONB;
  v_coupon JSONB;
  v_items_subtotal DECIMAL := 0;
  v_custom_fees_total DECIMAL := 0;
  v_shipping_fee DECIMAL := 0;
  v_coupon_discount DECIMAL := 0;
  v_new_total DECIMAL;
  v_actor_role TEXT;
  v_current_status TEXT;
BEGIN
  -- ===== 1. 驗證訂單狀態 =====
  SELECT status INTO v_current_status FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, '訂單不存在', NULL::DECIMAL;
    RETURN;
  END IF;

  IF v_current_status != 'pending' THEN
    RETURN QUERY SELECT FALSE, '僅待確認訂單可修改', NULL::DECIMAL;
    RETURN;
  END IF;

  -- ===== 2. 查詢操作者角色 =====
  SELECT role INTO v_actor_role FROM profiles WHERE id = p_actor_id;

  -- ===== 3. 處理商品修改 =====
  v_items := p_modifications->'items';
  IF v_items IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
      IF v_item->>'action' = 'update' THEN
        UPDATE order_items
        SET
          deal_price = COALESCE((v_item->>'deal_price')::DECIMAL, deal_price),
          quantity = COALESCE((v_item->>'quantity')::INTEGER, quantity)
        WHERE order_id = p_order_id AND product_id = (v_item->>'product_id')::UUID;

      ELSIF v_item->>'action' = 'add' THEN
        INSERT INTO order_items (order_id, product_id, deal_price, quantity, series_id_snapshot)
        VALUES (
          p_order_id,
          (v_item->>'product_id')::UUID,
          (v_item->>'deal_price')::DECIMAL,
          (v_item->>'quantity')::INTEGER,
          (v_item->>'series_id')::UUID
        );

      ELSIF v_item->>'action' = 'remove' THEN
        DELETE FROM order_items
        WHERE order_id = p_order_id AND product_id = (v_item->>'product_id')::UUID;
      END IF;
    END LOOP;
  END IF;

  -- ===== 4. 處理自訂費用 =====
  v_custom_fees := p_modifications->'custom_fees';
  IF v_custom_fees IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_custom_fees)
    LOOP
      IF v_item->>'action' = 'add' THEN
        INSERT INTO order_custom_fees (order_id, fee_name, fee_amount)
        VALUES (
          p_order_id,
          v_item->>'fee_name',
          (v_item->>'fee_amount')::DECIMAL
        );

      ELSIF v_item->>'action' = 'remove' THEN
        DELETE FROM order_custom_fees
        WHERE order_id = p_order_id AND id = (v_item->>'fee_id')::UUID;
      END IF;
    END LOOP;
  END IF;

  -- ===== 5. 處理運費修改 =====
  v_shipping := p_modifications->'shipping';
  IF v_shipping IS NOT NULL THEN
    UPDATE orders
    SET shipping_fee = (v_shipping->>'new_fee')::DECIMAL
    WHERE id = p_order_id;
  END IF;

  -- ===== 6. 處理優惠券移除 =====
  v_coupon := p_modifications->'coupon';
  IF v_coupon IS NOT NULL AND v_coupon->>'action' = 'remove' THEN
    DELETE FROM order_coupons WHERE order_id = p_order_id;
    UPDATE orders SET coupon_discount = 0 WHERE id = p_order_id;
  END IF;

  -- ===== 7. 重新計算訂單總金額 =====
  -- 商品小計
  SELECT COALESCE(SUM(deal_price * quantity), 0)
  INTO v_items_subtotal
  FROM order_items
  WHERE order_id = p_order_id;

  -- 自訂費用總計
  SELECT COALESCE(SUM(fee_amount), 0)
  INTO v_custom_fees_total
  FROM order_custom_fees
  WHERE order_id = p_order_id;

  -- 運費
  SELECT COALESCE(shipping_fee, 0)
  INTO v_shipping_fee
  FROM orders
  WHERE id = p_order_id;

  -- 優惠券折扣
  SELECT COALESCE(coupon_discount, 0)
  INTO v_coupon_discount
  FROM orders
  WHERE id = p_order_id;

  -- ===== 8. 計算新總金額 =====
  v_new_total := v_items_subtotal - v_coupon_discount + v_shipping_fee + v_custom_fees_total;

  IF v_new_total < 0 THEN
    RETURN QUERY SELECT FALSE, '訂單總金額不可為負數，請檢查費用設定', NULL::DECIMAL;
    RETURN;
  END IF;

  -- ===== 9. 更新訂單總金額 =====
  UPDATE orders
  SET total_amount = v_new_total,
      updated_at = NOW()
  WHERE id = p_order_id;

  -- ===== 10. 記錄修改歷程（修復：使用 action_type 而非 action）=====
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, modifications)
  VALUES (
    p_order_id,
    'order_modified',
    p_actor_id,
    v_actor_role,
    p_modifications
  );

  -- ===== 11. 回傳成功結果 =====
  RETURN QUERY SELECT TRUE, '訂單修改成功', v_new_total;
END;
$$;

-- 更新函數註解
COMMENT ON FUNCTION update_order_with_modifications(UUID, JSONB, UUID) IS
  '[修復版 - 欄位名稱] 批次修改訂單內容（商品、費用、運費、優惠券），確保原子性操作與正確錯誤處理。修復：使用 action_type 欄位而非 action。';

-- 授權給已認證用戶
GRANT EXECUTE ON FUNCTION update_order_with_modifications(UUID, JSONB, UUID) TO authenticated;

-- ================================================================
-- Migration 完成
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration: fix_order_timelines_action_column_name 執行完成';
  RAISE NOTICE '   - 已修復 update_order_with_modifications() 函數中的欄位名稱';
  RAISE NOTICE '   - 將 INSERT 語句中的 "action" 改為 "action_type"';
  RAISE NOTICE '   - 訂單修改功能現在可正常運作';
END $$;
