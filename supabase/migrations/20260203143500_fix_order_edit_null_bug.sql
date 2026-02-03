CREATE OR REPLACE FUNCTION "public"."update_order_with_modifications"("p_order_id" "uuid", "p_modifications" "jsonb", "p_actor_id" "uuid") RETURNS TABLE("success" boolean, "message" "text", "new_total" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
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
  v_actor_role TEXT;
  v_new_notes TEXT;
BEGIN
  -- ===== 1. 查詢 actor_role（避免後續查詢返回 NULL）=====
  SELECT role INTO v_actor_role FROM profiles WHERE id = p_actor_id;

  IF v_actor_role IS NULL THEN
    RETURN QUERY SELECT FALSE, '操作者身份驗證失敗', NULL::DECIMAL;
    RETURN;
  END IF;

  -- ===== 2. 檢查訂單狀態 =====
  SELECT status INTO v_current_status FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT FALSE, '訂單不存在', NULL::DECIMAL;
    RETURN;
  END IF;

  IF v_current_status NOT IN ('pending') THEN
    RETURN QUERY SELECT FALSE, '僅待確認訂單可修改，此訂單狀態為 ' || v_current_status, NULL::DECIMAL;
    RETURN;
  END IF;

  -- ===== 3. 處理商品修改 =====
  IF p_modifications->'items' IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_modifications->'items')
    LOOP
      CASE v_item->>'type'
        -- A. 價格變更
        WHEN 'price_changed' THEN
          UPDATE order_items
          SET deal_price = (v_item->>'new_price')::DECIMAL,
              subtotal = (v_item->>'new_price')::DECIMAL * quantity
          WHERE id = (v_item->>'item_id')::UUID AND order_id = p_order_id;

          IF NOT FOUND THEN
            RETURN QUERY SELECT FALSE, '找不到商品 ID: ' || (v_item->>'item_id'), NULL::DECIMAL;
            RETURN;
          END IF;

        -- B. 數量變更
        WHEN 'quantity_changed' THEN
          UPDATE order_items
          SET quantity = (v_item->>'new_quantity')::INTEGER,
              subtotal = deal_price * (v_item->>'new_quantity')::INTEGER
          WHERE id = (v_item->>'item_id')::UUID AND order_id = p_order_id;

          IF NOT FOUND THEN
            RETURN QUERY SELECT FALSE, '找不到商品 ID: ' || (v_item->>'item_id'), NULL::DECIMAL;
            RETURN;
          END IF;

        -- C. 移除商品
        WHEN 'removed' THEN
          DELETE FROM order_items WHERE id = (v_item->>'item_id')::UUID AND order_id = p_order_id;

          IF NOT FOUND THEN
            RETURN QUERY SELECT FALSE, '找不到商品 ID: ' || (v_item->>'item_id'), NULL::DECIMAL;
            RETURN;
          END IF;

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

  -- ===== 4. 檢查是否還有商品（至少保留一個商品）=====
  IF (SELECT COUNT(*) FROM order_items WHERE order_id = p_order_id) = 0 THEN
    RETURN QUERY SELECT FALSE, '訂單至少需保留一個商品，無法全部移除', NULL::DECIMAL;
    RETURN;
  END IF;

  -- ===== 5. 處理費用修改 =====
  IF p_modifications->'fees' IS NOT NULL THEN
    FOR v_fee IN SELECT * FROM jsonb_array_elements(p_modifications->'fees')
    LOOP
      CASE v_fee->>'type'
        -- A. 新增費用
        WHEN 'added' THEN
          -- ✅ 修正：使用正確的欄位名 "amount" 而非 "fee_amount"
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

  -- ===== 6. 處理運費修改 =====
  IF p_modifications->'shipping' IS NOT NULL THEN
    UPDATE orders
    SET shipping_fee = (p_modifications->'shipping'->>'new_fee')::DECIMAL
    WHERE id = p_order_id;
  END IF;

  -- ===== 7. 處理備註修改 =====
  IF p_modifications->'notes' IS NOT NULL THEN
    v_new_notes := p_modifications->'notes'->>'new_notes';
    UPDATE orders
    SET notes = NULLIF(v_new_notes, '')
    WHERE id = p_order_id;
  END IF;

  -- ===== 8. 處理優惠券移除 =====
  IF p_modifications->'coupon' IS NOT NULL THEN
    IF p_modifications->'coupon'->>'action' = 'removed' THEN
      DELETE FROM order_coupons WHERE order_id = p_order_id;
      UPDATE user_coupons
      SET used_at = NULL, order_id = NULL
      WHERE order_id = p_order_id;
    END IF;
  END IF;

  -- ===== 9. 重新計算訂單總金額 =====
  SELECT COALESCE(SUM(subtotal), 0) INTO v_items_subtotal
  FROM order_items WHERE order_id = p_order_id;

  SELECT COALESCE(shipping_fee, 0) INTO v_shipping_fee
  FROM orders WHERE id = p_order_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_custom_fees_total
  FROM order_custom_fees WHERE order_id = p_order_id;

  -- ✅ FIXED: 使用子查詢確保在沒有優惠券時返回 0，避免變數成為 NULL
  v_coupon_discount := COALESCE(
    (SELECT discount_amount FROM order_coupons WHERE order_id = p_order_id),
    0
  );

  v_new_total := v_items_subtotal - v_coupon_discount + v_shipping_fee + v_custom_fees_total;

  UPDATE orders SET total_amount = v_new_total WHERE id = p_order_id;

  -- ===== 10. 記錄修改歷程 =====
  -- ✅ 修正：使用正確的欄位名 "action_type" 而非 "action"
  INSERT INTO order_timelines (order_id, action_type, old_status, new_status, actor_id, actor_role, modifications)
  VALUES (
    p_order_id,
    'order_modified',
    v_current_status,
    v_current_status,
    p_actor_id,
    v_actor_role,
    p_modifications
  );

  -- ===== 11. 返回成功結果 =====
  RETURN QUERY SELECT TRUE, '訂單修改成功', v_new_total;
END;
$$;

COMMENT ON FUNCTION "public"."update_order_with_modifications"("p_order_id" "uuid", "p_modifications" "jsonb", "p_actor_id" "uuid") IS '批次修改訂單（商品、費用、運費、備註、優惠券）並記錄修改歷程。
    修正所有已知問題：
    - [FIXED] 修正無優惠券時 total_amount 計算為 NULL 的問題 (2026-02-03)
    - 使用 action_type 而非 action
    - 使用 amount 而非 fee_amount
    - 使用 NULLIF 正確處理備註的空值';
