


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."auto_generate_product_code"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := generate_product_code(NEW.series_id);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_generate_product_code"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_generate_product_code"() IS '觸發器函數：商品建立時自動產生商品編號';



CREATE OR REPLACE FUNCTION "public"."calculate_shipping_fee"("p_user_id" "uuid", "p_subtotal" numeric) RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_shipping_fee DECIMAL(10,2);
  v_free_threshold DECIMAL(10,2);
BEGIN
  -- 查詢客戶等級的運費設定（單次查詢 JOIN）
  SELECT t.shipping_fee, t.free_shipping_threshold
  INTO v_shipping_fee, v_free_threshold
  FROM profiles p
  JOIN tiers t ON t.id = p.tier_id
  WHERE p.id = p_user_id;

  -- 若查無客戶或等級，預設不收運費
  IF v_shipping_fee IS NULL THEN
    RETURN 0;
  END IF;

  -- 若基本運費為 0，直接返回 0
  IF v_shipping_fee = 0 THEN
    RETURN 0;
  END IF;

  -- 若設定了滿額免運門檻且商品總額達標，返回 0
  IF v_free_threshold IS NOT NULL AND p_subtotal >= v_free_threshold THEN
    RETURN 0;
  END IF;

  -- 否則返回基本運費
  RETURN v_shipping_fee;
END;
$$;


ALTER FUNCTION "public"."calculate_shipping_fee"("p_user_id" "uuid", "p_subtotal" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_shipping_fee"("p_user_id" "uuid", "p_subtotal" numeric) IS '計算訂單運費（依客戶等級與商品總額，支援滿額免運）';



CREATE OR REPLACE FUNCTION "public"."cancel_order_and_restore_stock"("p_order_id" "uuid", "p_actor_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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

  -- 4. 記錄訂單操作歷史
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, old_status, new_status, notes)
  VALUES (
    p_order_id,
    'cancelled',
    p_actor_id,
    'admin',
    v_order.status,
    'cancelled',
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
$$;


ALTER FUNCTION "public"."cancel_order_and_restore_stock"("p_order_id" "uuid", "p_actor_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cancel_order_and_restore_stock"("p_order_id" "uuid", "p_actor_id" "uuid") IS '訂單取消並回補庫存 (原子性操作) - 支援 pending/shipping → cancelled';



CREATE OR REPLACE FUNCTION "public"."confirm_order_and_deduct_stock"("p_order_id" "uuid", "p_actor_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
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

  -- 4. 記錄操作歷史 (使用 'confirmed' action_type)
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
$$;


ALTER FUNCTION "public"."confirm_order_and_deduct_stock"("p_order_id" "uuid", "p_actor_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."confirm_order_and_deduct_stock"("p_order_id" "uuid", "p_actor_id" "uuid") IS '訂單確認並扣減庫存 (原子性操作)';



CREATE OR REPLACE FUNCTION "public"."delete_order_pending"("p_order_id" "uuid", "p_actor_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."delete_order_pending"("p_order_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_order_pending"("p_order_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") IS '刪除 pending 狀態訂單 (原子性操作，繞過 RLS)';



CREATE OR REPLACE FUNCTION "public"."generate_order_number"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  today TEXT;
  seq_num INTEGER;
  order_num TEXT;
  max_digits INTEGER;
BEGIN
  today := TO_CHAR(NOW(), 'YYYYMMDD');

  -- 查詢當日最大流水號
  SELECT COALESCE(
    MAX(
      SUBSTRING(order_number FROM LENGTH('ORD-' || today || '-') + 1)::INTEGER
    ), 0
  ) + 1
  INTO seq_num
  FROM orders
  WHERE order_number LIKE 'ORD-' || today || '-%';

  -- 決定流水號位數 (最少 4 位，超過 9999 自動擴展)
  max_digits := GREATEST(4, LENGTH(seq_num::TEXT));

  -- 產生訂單編號
  order_num := 'ORD-' || today || '-' || LPAD(seq_num::TEXT, max_digits, '0');

  RETURN order_num;
END;
$$;


ALTER FUNCTION "public"."generate_order_number"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_order_number"() IS '產生唯一訂單編號 (ORD-YYYYMMDD-XXXX)';



CREATE OR REPLACE FUNCTION "public"."generate_product_code"("p_series_id" "uuid") RETURNS character varying
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  v_category_code VARCHAR(10);
  v_series_code VARCHAR(10);
  v_max_number INTEGER;
  v_new_code VARCHAR(50);
BEGIN
  -- 1. 取得系列代碼與分類代碼
  SELECT c.code, s.code INTO v_category_code, v_series_code
  FROM series s
  INNER JOIN categories c ON s.category_id = c.id
  WHERE s.id = p_series_id;

  IF v_category_code IS NULL OR v_series_code IS NULL THEN
    RAISE EXCEPTION '無法找到系列對應的分類代碼或系列代碼';
  END IF;

  -- 2. 查詢該系列下已存在的最大流水號
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(p.code FROM '(\d+)$') AS INTEGER)),
    0
  ) INTO v_max_number
  FROM products p
  WHERE p.series_id = p_series_id
    AND p.code ~ ('^' || v_category_code || '-' || v_series_code || '-\d{2}$');

  -- 3. 產生新編號（兩位數流水號）
  v_new_code := v_category_code || '-' || v_series_code || '-' || LPAD((v_max_number + 1)::TEXT, 2, '0');

  RETURN v_new_code;
END;
$_$;


ALTER FUNCTION "public"."generate_product_code"("p_series_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_product_code"("p_series_id" "uuid") IS '自動產生商品編號：[分類代碼]-[系列代碼]-[兩位流水號]（如 DRK-TEA-01）';



CREATE OR REPLACE FUNCTION "public"."mark_order_as_shipping"("p_order_id" "uuid", "p_actor_id" "uuid") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_status TEXT;
  v_item RECORD;
BEGIN
  -- 檢查訂單狀態
  SELECT status INTO v_current_status FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT FALSE, '訂單不存在';
    RETURN;
  END IF;

  IF v_current_status <> 'pending' THEN
    RETURN QUERY SELECT FALSE, '僅待確認訂單可標記出貨';
    RETURN;
  END IF;

  -- 扣減庫存（支援負庫存）
  FOR v_item IN
    SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
  LOOP
    UPDATE products SET stock = stock - v_item.quantity WHERE id = v_item.product_id;
  END LOOP;

  -- 更新訂單狀態
  UPDATE orders SET status = 'shipping', updated_at = NOW() WHERE id = p_order_id;

  -- 記錄操作歷史
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, old_status, new_status)
  VALUES (p_order_id, 'status_updated', p_actor_id, 'admin', 'pending', 'shipping');

  RETURN QUERY SELECT TRUE, '訂單已標記為出貨中，庫存已扣減';
END;
$$;


ALTER FUNCTION "public"."mark_order_as_shipping"("p_order_id" "uuid", "p_actor_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mark_order_as_shipping"("p_order_id" "uuid", "p_actor_id" "uuid") IS '標記訂單為出貨中並扣減庫存（原子性操作），取代舊的 confirm_order_and_deduct_stock';



CREATE OR REPLACE FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "text", "p_actor_id" "uuid") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_old_status TEXT;
  v_item RECORD;
BEGIN
  -- 檢查訂單
  SELECT status INTO v_old_status FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_old_status IS NULL THEN
    RETURN QUERY SELECT FALSE, '訂單不存在';
    RETURN;
  END IF;

  -- 驗證狀態流程（簡化後的規則）
  IF v_old_status = 'shipping' AND p_new_status = 'completed' THEN
    -- 允許：shipping → completed
    NULL;
  ELSIF v_old_status = 'pending' AND p_new_status = 'cancelled' THEN
    -- 允許：pending → cancelled（無需回補庫存）
    NULL;
  ELSIF v_old_status = 'shipping' AND p_new_status = 'cancelled' THEN
    -- 允許：shipping → cancelled（需回補庫存）
    FOR v_item IN
      SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
    LOOP
      UPDATE products SET stock = stock + v_item.quantity WHERE id = v_item.product_id;
    END LOOP;
  ELSE
    RETURN QUERY SELECT FALSE, '不允許的狀態轉換：' || v_old_status || ' → ' || p_new_status;
    RETURN;
  END IF;

  -- 更新狀態
  UPDATE orders SET status = p_new_status, updated_at = NOW() WHERE id = p_order_id;

  -- 記錄歷史
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, old_status, new_status)
  VALUES (p_order_id, 'status_updated', p_actor_id, 'admin', v_old_status, p_new_status);

  RETURN QUERY SELECT TRUE, '訂單狀態已更新';
END;
$$;


ALTER FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "text", "p_actor_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "text", "p_actor_id" "uuid") IS '更新訂單狀態（簡化版，移除 confirmed 狀態）。允許的轉換：shipping→completed, pending→cancelled, shipping→cancelled（回補庫存）';



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

          -- 檢查是否更新成功
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

          -- 檢查是否更新成功
          IF NOT FOUND THEN
            RETURN QUERY SELECT FALSE, '找不到商品 ID: ' || (v_item->>'item_id'), NULL::DECIMAL;
            RETURN;
          END IF;

        -- C. 移除商品
        WHEN 'removed' THEN
          DELETE FROM order_items WHERE id = (v_item->>'item_id')::UUID AND order_id = p_order_id;

          -- 檢查是否刪除成功
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

  -- ===== 7. 處理優惠券移除 =====
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

  -- ===== 8. 重新計算訂單總金額 =====
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

  -- ===== 9. 更新訂單總金額 =====
  UPDATE orders
  SET total_amount = v_new_total,
      updated_at = NOW()
  WHERE id = p_order_id;

  -- ===== 10. 記錄修改歷程（僅成功時記錄）=====
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, modifications)
  VALUES (
    p_order_id,
    'order_modified',
    p_actor_id,
    v_actor_role,  -- 使用預先查詢的 role，避免 NULL
    p_modifications
  );

  -- ===== 11. 回傳成功結果 =====
  RETURN QUERY SELECT TRUE, '訂單修改成功', v_new_total;
END;
$$;


ALTER FUNCTION "public"."update_order_with_modifications"("p_order_id" "uuid", "p_modifications" "jsonb", "p_actor_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_order_with_modifications"("p_order_id" "uuid", "p_modifications" "jsonb", "p_actor_id" "uuid") IS '[修復版] 批次修改訂單內容（商品、費用、運費、優惠券），確保原子性操作與正確錯誤處理';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_updated_at_column"() IS '觸發器函數：自動更新表的 updated_at 欄位為當前時間';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(20) NOT NULL,
    "code_normalized" character varying(20) GENERATED ALWAYS AS ("upper"(("code")::"text")) STORED,
    "discount_type" character varying(20) NOT NULL,
    "discount_value" numeric(10,2) NOT NULL,
    "min_order_amount" numeric(10,2),
    "valid_from" timestamp with time zone NOT NULL,
    "valid_until" timestamp with time zone NOT NULL,
    "claim_limit" integer DEFAULT 1 NOT NULL,
    "status" character varying(20) DEFAULT 'active'::character varying NOT NULL,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "code_length" CHECK ((("length"(("code")::"text") >= 4) AND ("length"(("code")::"text") <= 20))),
    CONSTRAINT "coupons_check" CHECK ((((("discount_type")::"text" = 'fixed'::"text") AND ("discount_value" > (0)::numeric)) OR ((("discount_type")::"text" = 'percentage'::"text") AND ("discount_value" >= (1)::numeric) AND ("discount_value" <= (100)::numeric)))),
    CONSTRAINT "coupons_claim_limit_check" CHECK (("claim_limit" >= 1)),
    CONSTRAINT "coupons_code_check" CHECK ((("code")::"text" ~ '^[A-Z0-9]+$'::"text")),
    CONSTRAINT "coupons_discount_type_check" CHECK ((("discount_type")::"text" = ANY ((ARRAY['fixed'::character varying, 'percentage'::character varying])::"text"[]))),
    CONSTRAINT "coupons_min_order_amount_check" CHECK (("min_order_amount" >= (0)::numeric)),
    CONSTRAINT "coupons_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'deleted'::character varying])::"text"[]))),
    CONSTRAINT "valid_time_range" CHECK (("valid_until" > "valid_from"))
);


ALTER TABLE "public"."coupons" OWNER TO "postgres";


COMMENT ON TABLE "public"."coupons" IS '優惠券主表 - 儲存優惠券代碼、折扣方式、使用限制、生效時間';



COMMENT ON COLUMN "public"."coupons"."code" IS '優惠券代碼（管理員輸入，4-20 字元，僅允許英數字）';



COMMENT ON COLUMN "public"."coupons"."code_normalized" IS '自動轉大寫的優惠券代碼（用於唯一性檢查與查詢，大小寫不敏感）';



COMMENT ON COLUMN "public"."coupons"."discount_type" IS '折扣方式：fixed (現金折扣) 或 percentage (百分比折扣)';



COMMENT ON COLUMN "public"."coupons"."discount_value" IS '折扣值（現金折扣：固定金額 NT$；百分比折扣：1-100 代表折扣百分比）';



COMMENT ON COLUMN "public"."coupons"."min_order_amount" IS '最低訂單金額限制（選填，NULL 表示無限制）';



COMMENT ON COLUMN "public"."coupons"."valid_from" IS '優惠券生效開始時間';



COMMENT ON COLUMN "public"."coupons"."valid_until" IS '優惠券生效結束時間';



COMMENT ON COLUMN "public"."coupons"."claim_limit" IS '每位客戶可領取張數上限（預設 1 張，支援多張領取）';



COMMENT ON COLUMN "public"."coupons"."status" IS '優惠券狀態：active (啟用), inactive (停用), deleted (已刪除)';



COMMENT ON COLUMN "public"."coupons"."deleted_at" IS '刪除時間（軟刪除）';



CREATE OR REPLACE VIEW "public"."active_coupons" AS
 SELECT "id",
    "code",
    "code_normalized",
    "discount_type",
    "discount_value",
    "min_order_amount",
    "valid_from",
    "valid_until",
    "claim_limit",
    "status",
    "deleted_at",
    "created_at",
    "updated_at"
   FROM "public"."coupons"
  WHERE ((("status")::"text" = 'active'::"text") AND (("now"() >= "valid_from") AND ("now"() <= "valid_until")));


ALTER VIEW "public"."active_coupons" OWNER TO "postgres";


COMMENT ON VIEW "public"."active_coupons" IS '有效優惠券 View - 自動過濾過期與已刪除優惠券，供前台查詢使用';



CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "image_url" "text" NOT NULL,
    "link_url" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


COMMENT ON TABLE "public"."announcements" IS '廣告輪播表 - 用於首頁輪播橫幅';



COMMENT ON COLUMN "public"."announcements"."id" IS '廣告 ID (UUID)';



COMMENT ON COLUMN "public"."announcements"."title" IS '廣告標題';



COMMENT ON COLUMN "public"."announcements"."image_url" IS '廣告圖片 URL';



COMMENT ON COLUMN "public"."announcements"."link_url" IS '點擊連結（選填）';



COMMENT ON COLUMN "public"."announcements"."sort_order" IS '排序順序（用於拖曳調整）';



COMMENT ON COLUMN "public"."announcements"."is_active" IS '是否啟用';



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "text" NOT NULL,
    "action_type" "text" NOT NULL,
    "actor_id" "uuid",
    "actor_role" "text",
    "actor_display_name" "text",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_logs_action_type_check" CHECK (("action_type" = ANY (ARRAY['created'::"text", 'updated'::"text", 'deleted'::"text", 'stock_adjusted'::"text", 'comment_added'::"text"]))),
    CONSTRAINT "audit_logs_actor_role_check" CHECK (("actor_role" = ANY (ARRAY['client'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs" IS '操作日誌表 - 稽核追蹤，記錄所有重要操作（建立、修改、刪除、庫存調整、留言）';



COMMENT ON COLUMN "public"."audit_logs"."target_type" IS '目標實體類型：product, client, order, tier, series, coupon, setting, etc.';



COMMENT ON COLUMN "public"."audit_logs"."target_id" IS '目標實體 ID (UUID 轉為 TEXT 儲存)';



COMMENT ON COLUMN "public"."audit_logs"."action_type" IS '操作類型：created (建立), updated (更新), deleted (刪除), stock_adjusted (庫存調整), comment_added (新增留言)';



COMMENT ON COLUMN "public"."audit_logs"."actor_id" IS '操作者 ID (客戶或管理員)';



COMMENT ON COLUMN "public"."audit_logs"."actor_role" IS '操作者角色 (client 或 admin)';



COMMENT ON COLUMN "public"."audit_logs"."actor_display_name" IS '操作者暱稱快照 (避免刪除帳號後顯示「未知使用者」)';



COMMENT ON COLUMN "public"."audit_logs"."old_values" IS '變更前資料 (JSONB 格式，僅 updated/deleted 動作有值)';



COMMENT ON COLUMN "public"."audit_logs"."new_values" IS '變更後資料 (JSONB 格式，僅 created/updated 動作有值)';



COMMENT ON COLUMN "public"."audit_logs"."notes" IS '操作備註 (額外說明)';



CREATE TABLE IF NOT EXISTS "public"."backup_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "filename" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "storage_provider" "text" NOT NULL,
    "storage_url" "text" NOT NULL,
    "backup_type" "text" NOT NULL,
    "status" "text" DEFAULT 'in_progress'::"text" NOT NULL,
    "metadata" "jsonb",
    "error_message" "text",
    "created_by" "uuid",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "includes_storage" boolean DEFAULT false,
    CONSTRAINT "backup_jobs_backup_type_check" CHECK (("backup_type" = ANY (ARRAY['auto'::"text", 'manual'::"text"]))),
    CONSTRAINT "backup_jobs_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'success'::"text", 'failed'::"text"]))),
    CONSTRAINT "backup_jobs_storage_provider_check" CHECK (("storage_provider" = ANY (ARRAY['gcs'::"text", 'vercel_blob'::"text"])))
);


ALTER TABLE "public"."backup_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."backup_jobs" IS '雲端備份記錄表';



COMMENT ON COLUMN "public"."backup_jobs"."id" IS '唯一識別碼';



COMMENT ON COLUMN "public"."backup_jobs"."filename" IS '備份檔案名稱（vsale-backup-YYYYMMDD-HHMMSS.sql.gz）';



COMMENT ON COLUMN "public"."backup_jobs"."file_size" IS '壓縮後檔案大小（bytes）';



COMMENT ON COLUMN "public"."backup_jobs"."storage_provider" IS '儲存位置（gcs 或 vercel_blob）';



COMMENT ON COLUMN "public"."backup_jobs"."storage_url" IS '雲端檔案 URL（GCS: gs://bucket/path, Vercel: https://...）';



COMMENT ON COLUMN "public"."backup_jobs"."backup_type" IS '備份類型（auto 或 manual）';



COMMENT ON COLUMN "public"."backup_jobs"."status" IS '執行狀態（in_progress, success, failed）';



COMMENT ON COLUMN "public"."backup_jobs"."metadata" IS '備份元數據（資料表數量、記錄數量、壓縮率）';



COMMENT ON COLUMN "public"."backup_jobs"."error_message" IS '失敗時錯誤訊息';



COMMENT ON COLUMN "public"."backup_jobs"."created_by" IS '手動備份操作者（自動備份時為 NULL）';



COMMENT ON COLUMN "public"."backup_jobs"."started_at" IS '備份開始時間';



COMMENT ON COLUMN "public"."backup_jobs"."completed_at" IS '備份完成時間';



COMMENT ON COLUMN "public"."backup_jobs"."created_at" IS '記錄建立時間';



COMMENT ON COLUMN "public"."backup_jobs"."includes_storage" IS '是否包含 Supabase Storage 圖片';



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(10) NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'active'::"text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "categories_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"]))),
    CONSTRAINT "check_categories_code_format" CHECK ((("code")::"text" ~ '^[A-Z]{3,10}$'::"text"))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."categories" IS '商品分類表：定義商品的頂層分類（如飲料、零食、日用品）';



COMMENT ON COLUMN "public"."categories"."id" IS '分類 ID（UUID）';



COMMENT ON COLUMN "public"."categories"."code" IS '分類代碼（3-10 個大寫字母，如 DRK, SNK, DAI）';



COMMENT ON COLUMN "public"."categories"."name" IS '分類名稱（如「飲料」、「零食」）';



COMMENT ON COLUMN "public"."categories"."description" IS '分類描述';



COMMENT ON COLUMN "public"."categories"."status" IS '狀態：active 顯示，inactive 隱藏';



COMMENT ON COLUMN "public"."categories"."sort_order" IS '排序順序（數字越小越前面）';



COMMENT ON COLUMN "public"."categories"."created_at" IS '建立時間';



COMMENT ON COLUMN "public"."categories"."updated_at" IS '最後更新時間';



CREATE TABLE IF NOT EXISTS "public"."coupon_series_restrictions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coupon_id" "uuid" NOT NULL,
    "series_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."coupon_series_restrictions" OWNER TO "postgres";


COMMENT ON TABLE "public"."coupon_series_restrictions" IS '優惠券系列限制表 - 多對多關聯表，限制優惠券僅特定商品系列可使用';



COMMENT ON COLUMN "public"."coupon_series_restrictions"."coupon_id" IS '優惠券 ID';



COMMENT ON COLUMN "public"."coupon_series_restrictions"."series_id" IS '商品系列 ID';



CREATE TABLE IF NOT EXISTS "public"."coupon_tier_restrictions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coupon_id" "uuid" NOT NULL,
    "tier_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."coupon_tier_restrictions" OWNER TO "postgres";


COMMENT ON TABLE "public"."coupon_tier_restrictions" IS '優惠券等級限制表 - 多對多關聯表，限制優惠券僅特定會員等級可使用';



COMMENT ON COLUMN "public"."coupon_tier_restrictions"."coupon_id" IS '優惠券 ID';



COMMENT ON COLUMN "public"."coupon_tier_restrictions"."tier_id" IS '會員等級 ID';



CREATE TABLE IF NOT EXISTS "public"."order_coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "coupon_code" character varying(20) NOT NULL,
    "discount_type" character varying(20) NOT NULL,
    "discount_value" numeric(10,2) NOT NULL,
    "discount_amount" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_coupons" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_coupons" IS '訂單優惠券快照表 - 不使用 FK 到 coupons，永久保留優惠券資訊（即使優惠券被刪除）';



COMMENT ON COLUMN "public"."order_coupons"."order_id" IS '訂單 ID';



COMMENT ON COLUMN "public"."order_coupons"."coupon_code" IS '優惠券代碼快照（大寫）';



COMMENT ON COLUMN "public"."order_coupons"."discount_type" IS '折扣方式快照：fixed (現金折扣) 或 percentage (百分比折扣)';



COMMENT ON COLUMN "public"."order_coupons"."discount_value" IS '折扣值快照（現金折扣：固定金額；百分比折扣：1-100）';



COMMENT ON COLUMN "public"."order_coupons"."discount_amount" IS '實際折扣金額（訂單總額 - 折扣後金額，單位：NT$）';



CREATE TABLE IF NOT EXISTS "public"."order_custom_fees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "fee_name" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "order_custom_fees_amount_check" CHECK (("amount" <> (0)::numeric)),
    CONSTRAINT "order_custom_fees_fee_name_check" CHECK ((("length"("fee_name") > 0) AND ("length"("fee_name") <= 50)))
);


ALTER TABLE "public"."order_custom_fees" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_custom_fees" IS '訂單自訂費用項目（如手續費、包裝費、額外運費、總額調整等）';



COMMENT ON COLUMN "public"."order_custom_fees"."id" IS '自訂費用唯一識別碼 (UUID)';



COMMENT ON COLUMN "public"."order_custom_fees"."order_id" IS '所屬訂單 (FK: orders.id，CASCADE 刪除)';



COMMENT ON COLUMN "public"."order_custom_fees"."fee_name" IS '費用名稱（例如: 手續費、包裝費、額外運費，最多 50 字元）';



COMMENT ON COLUMN "public"."order_custom_fees"."amount" IS '費用金額（正數=收費、負數=減免，例如: +50 = 收 50 元手續費，-100 = 減免 100 元）';



COMMENT ON COLUMN "public"."order_custom_fees"."created_at" IS '費用建立時間';



COMMENT ON COLUMN "public"."order_custom_fees"."created_by" IS '建立者 (FK: auth.users.id，通常為管理員)';



CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "product_name_snapshot" "text" NOT NULL,
    "deal_price" numeric(10,2) NOT NULL,
    "quantity" integer NOT NULL,
    "subtotal" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "series_id_snapshot" "uuid",
    CONSTRAINT "order_items_deal_price_check" CHECK (("deal_price" >= (0)::numeric)),
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "order_items_subtotal_check" CHECK (("subtotal" >= (0)::numeric))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_items" IS '訂單明細表 - 記錄每筆訂單包含的商品與成交價格';



COMMENT ON COLUMN "public"."order_items"."id" IS '訂單明細唯一識別碼 (UUID)';



COMMENT ON COLUMN "public"."order_items"."order_id" IS '所屬訂單 (FK: orders.id，CASCADE 刪除)';



COMMENT ON COLUMN "public"."order_items"."product_id" IS '商品 ID（可為 NULL，刪除商品時自動設為 NULL，訂單仍保留商品名稱快照）';



COMMENT ON COLUMN "public"."order_items"."product_name_snapshot" IS '商品名稱快照 (避免商品刪除後無法顯示歷史訂單)';



COMMENT ON COLUMN "public"."order_items"."deal_price" IS '成交價格 (下單當時的等級價格，用於記錄歷史)';



COMMENT ON COLUMN "public"."order_items"."quantity" IS '訂購數量';



COMMENT ON COLUMN "public"."order_items"."subtotal" IS '小計 = deal_price × quantity (冗餘欄位，提升查詢效能)';



COMMENT ON COLUMN "public"."order_items"."created_at" IS '明細建立時間';



COMMENT ON COLUMN "public"."order_items"."series_id_snapshot" IS '系列 ID 快照（用於優惠券系列限制驗證，商品刪除時保留）';



CREATE TABLE IF NOT EXISTS "public"."order_timelines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "actor_id" "uuid",
    "actor_role" "text",
    "old_status" "text",
    "new_status" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "modifications" "jsonb",
    CONSTRAINT "order_timelines_action_type_check" CHECK (("action_type" = ANY (ARRAY['created'::"text", 'confirmed'::"text", 'status_updated'::"text", 'cancelled'::"text", 'comment'::"text", 'deleted'::"text", 'order_modified'::"text"]))),
    CONSTRAINT "order_timelines_actor_role_check" CHECK (("actor_role" = ANY (ARRAY['client'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."order_timelines" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_timelines" IS '訂單操作歷史表 - 稽核追蹤所有訂單相關操作';



COMMENT ON COLUMN "public"."order_timelines"."id" IS '歷史記錄唯一識別碼 (UUID)';



COMMENT ON COLUMN "public"."order_timelines"."order_id" IS '所屬訂單 (FK: orders.id，CASCADE 刪除)';



COMMENT ON COLUMN "public"."order_timelines"."action_type" IS '操作類型: created (訂單建立), confirmed (訂單確認), status_updated (狀態變更), cancelled (訂單取消), comment (留言), deleted (訂單刪除)';



COMMENT ON COLUMN "public"."order_timelines"."actor_id" IS '操作者 (FK: auth.users.id，可為客戶或管理員)';



COMMENT ON COLUMN "public"."order_timelines"."actor_role" IS '操作者角色: client (客戶), admin (管理員)';



COMMENT ON COLUMN "public"."order_timelines"."old_status" IS '舊狀態 (僅 status_updated 需要，記錄狀態變更前的狀態)';



COMMENT ON COLUMN "public"."order_timelines"."new_status" IS '新狀態 (記錄狀態變更後的狀態)';



COMMENT ON COLUMN "public"."order_timelines"."notes" IS '操作備註 (例如: 取消原因、留言內容)';



COMMENT ON COLUMN "public"."order_timelines"."created_at" IS '操作時間';



COMMENT ON COLUMN "public"."order_timelines"."modifications" IS '訂單修改詳情 (JSON 格式): 包含商品價格/數量變更、費用新增/移除、運費調整、優惠券移除等';



CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "shipping_fee" numeric(10,2) DEFAULT 0 NOT NULL,
    CONSTRAINT "orders_shipping_fee_check" CHECK (("shipping_fee" >= (0)::numeric)),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'shipping'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "orders_total_amount_check" CHECK (("total_amount" >= (0)::numeric))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."orders" IS '訂單主表 - 記錄所有訂單的基本資訊與狀態';



COMMENT ON COLUMN "public"."orders"."id" IS '訂單唯一識別碼 (UUID)';



COMMENT ON COLUMN "public"."orders"."order_number" IS '訂單編號 (格式: ORD-YYYYMMDD-XXXX，由 generate_order_number() 產生)';



COMMENT ON COLUMN "public"."orders"."user_id" IS '下單客戶 (FK: auth.users.id)';



COMMENT ON COLUMN "public"."orders"."total_amount" IS '訂單總金額 (新台幣，含運費與優惠券折扣)';



COMMENT ON COLUMN "public"."orders"."status" IS '訂單狀態: pending (待確認), confirmed (已確認), shipping (出貨中), completed (已完成), cancelled (已取消)';



COMMENT ON COLUMN "public"."orders"."notes" IS '客戶備註 (最多 500 字，例如: 指定配送時間、特殊需求)';



COMMENT ON COLUMN "public"."orders"."created_at" IS '訂單建立時間';



COMMENT ON COLUMN "public"."orders"."updated_at" IS '最後更新時間 (由 Trigger 自動更新)';



COMMENT ON COLUMN "public"."orders"."shipping_fee" IS '訂單運費金額（建立時快照儲存，依客戶等級與訂單金額計算）';



COMMENT ON CONSTRAINT "orders_status_check" ON "public"."orders" IS '訂單狀態流程（簡化版）: pending → shipping → completed (可取消: pending→cancelled, shipping→cancelled)';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "name" "text" NOT NULL,
    "series_id" "uuid" NOT NULL,
    "description" "text",
    "retail_price" numeric(10,2) NOT NULL,
    "stock" integer DEFAULT 0 NOT NULL,
    "stock_status" "text" DEFAULT 'sufficient'::"text",
    "unit" "text" DEFAULT '件'::"text" NOT NULL,
    "image_url" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_products_tags_length" CHECK ((("array_length"("tags", 1) IS NULL) OR ("array_length"("tags", 1) <= 5))),
    CONSTRAINT "products_retail_price_check" CHECK (("retail_price" >= (0)::numeric)),
    CONSTRAINT "products_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"]))),
    CONSTRAINT "products_stock_status_check" CHECK (("stock_status" = ANY (ARRAY['sufficient'::"text", 'low'::"text", 'out_of_stock'::"text"])))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON TABLE "public"."products" IS '商品表：儲存所有商品資訊（商品編號、名稱、庫存、價格等）';



COMMENT ON COLUMN "public"."products"."id" IS '商品 ID（UUID）';



COMMENT ON COLUMN "public"."products"."code" IS '商品編號（自動生成，格式：[分類代碼]-[系列代碼]-[01]，如 DRK-TEA-01）';



COMMENT ON COLUMN "public"."products"."name" IS '商品名稱（必須唯一）';



COMMENT ON COLUMN "public"."products"."series_id" IS '所屬系列 ID（必填）';



COMMENT ON COLUMN "public"."products"."description" IS '商品描述';



COMMENT ON COLUMN "public"."products"."retail_price" IS '零售價格（必填）- 產品的基準價格，所有等級價格以此為參考';



COMMENT ON COLUMN "public"."products"."stock" IS '庫存數量（支援負庫存）';



COMMENT ON COLUMN "public"."products"."stock_status" IS '庫存狀態：sufficient 充足、low 緊張、out_of_stock 缺貨（與實際庫存數量分離）';



COMMENT ON COLUMN "public"."products"."unit" IS '單位（如「件」、「箱」、「瓶」）';



COMMENT ON COLUMN "public"."products"."image_url" IS '商品圖片 URL';



COMMENT ON COLUMN "public"."products"."tags" IS '商品標籤陣列，如 {"熱銷", "新品", "限量"}，最多 5 個';



COMMENT ON COLUMN "public"."products"."status" IS '狀態：active 顯示，inactive 隱藏';



COMMENT ON COLUMN "public"."products"."created_at" IS '建立時間';



COMMENT ON COLUMN "public"."products"."updated_at" IS '最後更新時間';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "phone" "text",
    "email" "text",
    "role" "text" NOT NULL,
    "tier_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "display_name" "text",
    "notes" "text",
    "username" "text",
    "address" "text",
    "admin_notes" "text",
    CONSTRAINT "admin_must_have_email" CHECK ((("role" <> 'admin'::"text") OR ("email" IS NOT NULL))),
    CONSTRAINT "admin_must_have_username" CHECK ((("role" <> 'admin'::"text") OR (("username" IS NOT NULL) AND ("email" IS NOT NULL)))),
    CONSTRAINT "client_must_have_phone" CHECK ((("role" <> 'client'::"text") OR (("phone" IS NOT NULL) AND ("tier_id" IS NOT NULL)))),
    CONSTRAINT "must_have_identifier" CHECK ((("phone" IS NOT NULL) OR ("email" IS NOT NULL))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['client'::"text", 'admin'::"text"]))),
    CONSTRAINT "username_format" CHECK ((("username" IS NULL) OR ("username" ~ '^[a-z0-9_]{3,20}$'::"text"))),
    CONSTRAINT "username_only_for_admin" CHECK ((("role" = 'admin'::"text") OR ("username" IS NULL)))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS '使用者業務資料表：擴充 auth.users，儲存手機號碼、角色、會員等級等業務資訊';



COMMENT ON COLUMN "public"."profiles"."id" IS '使用者 ID（關聯 auth.users.id）';



COMMENT ON COLUMN "public"."profiles"."phone" IS '手機號碼（客戶必填，用於登入）';



COMMENT ON COLUMN "public"."profiles"."email" IS '電子郵件（管理員必填，用於登入）';



COMMENT ON COLUMN "public"."profiles"."role" IS '角色類型（client: 客戶, admin: 管理員）';



COMMENT ON COLUMN "public"."profiles"."tier_id" IS '會員等級 ID（客戶必填，管理員可為 NULL）';



COMMENT ON COLUMN "public"."profiles"."created_at" IS '建立時間';



COMMENT ON COLUMN "public"."profiles"."display_name" IS '顯示暱稱 (客戶看到的名字，如「小愛」)';



COMMENT ON COLUMN "public"."profiles"."notes" IS '備註（管理員可用）';



COMMENT ON COLUMN "public"."profiles"."username" IS '管理員登入帳號 (僅管理員使用，3-20 字元，小寫字母+數字+底線)';



COMMENT ON COLUMN "public"."profiles"."address" IS '客戶常用地址（選填）';



COMMENT ON COLUMN "public"."profiles"."admin_notes" IS '管理員備註（僅管理員可見）';



CREATE TABLE IF NOT EXISTS "public"."series" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid",
    "code" character varying(10) NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_series_code_format" CHECK ((("code")::"text" ~ '^[A-Z]{3,10}$'::"text")),
    CONSTRAINT "series_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."series" OWNER TO "postgres";


COMMENT ON COLUMN "public"."series"."id" IS '系列 ID（UUID）';



COMMENT ON COLUMN "public"."series"."category_id" IS '所屬分類 ID，可為 NULL（未分類）';



COMMENT ON COLUMN "public"."series"."code" IS '系列代碼（3-10 個大寫字母，如 TEA, JUC）';



COMMENT ON COLUMN "public"."series"."name" IS '系列名稱（如「美粒果系列」）';



COMMENT ON COLUMN "public"."series"."description" IS '系列描述';



COMMENT ON COLUMN "public"."series"."image_url" IS '系列圖片 URL';



COMMENT ON COLUMN "public"."series"."status" IS '系列狀態：active 顯示，inactive 隱藏';



COMMENT ON COLUMN "public"."series"."sort_order" IS '排序順序（數字越小越前面）';



COMMENT ON COLUMN "public"."series"."created_at" IS '建立時間';



COMMENT ON COLUMN "public"."series"."updated_at" IS '最後更新時間';



CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "value_type" "text" NOT NULL,
    "category" "text" NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "description" "text",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "system_settings_category_check" CHECK (("category" = ANY (ARRAY['general'::"text", 'branding'::"text", 'carousel'::"text", 'system'::"text"]))),
    CONSTRAINT "system_settings_value_type_check" CHECK (("value_type" = ANY (ARRAY['text'::"text", 'number'::"text", 'boolean'::"text", 'json'::"text", 'image_url'::"text"])))
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."system_settings" IS '系統設定表 - Key-Value 模式儲存，支援多種資料型別';



COMMENT ON COLUMN "public"."system_settings"."key" IS '設定鍵 (唯一識別，如 site_title)';



COMMENT ON COLUMN "public"."system_settings"."value" IS '設定值 (TEXT 統一儲存，依 value_type 解析)';



COMMENT ON COLUMN "public"."system_settings"."value_type" IS '值類型：text (文字), number (數字), boolean (布林), json (JSON), image_url (圖片 URL)';



COMMENT ON COLUMN "public"."system_settings"."category" IS '設定類別：general (一般), branding (品牌), carousel (輪播), system (系統)';



COMMENT ON COLUMN "public"."system_settings"."is_public" IS '是否公開 (true: 客戶可讀取, false: 僅管理員可讀取)';



COMMENT ON COLUMN "public"."system_settings"."description" IS '設定說明（顯示於管理介面）';



COMMENT ON COLUMN "public"."system_settings"."updated_by" IS '最後更新者 (管理員 ID)';



CREATE TABLE IF NOT EXISTS "public"."tier_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tier_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tier_prices_price_check" CHECK (("price" >= (0)::numeric))
);


ALTER TABLE "public"."tier_prices" OWNER TO "postgres";


COMMENT ON TABLE "public"."tier_prices" IS '等級價格表：儲存每個商品在每個會員等級的對應價格';



COMMENT ON COLUMN "public"."tier_prices"."id" IS '價格記錄 ID（UUID）';



COMMENT ON COLUMN "public"."tier_prices"."tier_id" IS '會員等級 ID';



COMMENT ON COLUMN "public"."tier_prices"."product_id" IS '商品 ID';



COMMENT ON COLUMN "public"."tier_prices"."price" IS '該等級對應的價格';



COMMENT ON COLUMN "public"."tier_prices"."created_at" IS '建立時間';



COMMENT ON COLUMN "public"."tier_prices"."updated_at" IS '最後更新時間';



CREATE TABLE IF NOT EXISTS "public"."tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "rank" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_protected" boolean DEFAULT false,
    "shipping_fee" numeric(10,2) DEFAULT 0 NOT NULL,
    "free_shipping_threshold" numeric(10,2) DEFAULT NULL::numeric,
    CONSTRAINT "tiers_free_shipping_threshold_check" CHECK ((("free_shipping_threshold" IS NULL) OR ("free_shipping_threshold" > (0)::numeric))),
    CONSTRAINT "tiers_shipping_fee_check" CHECK (("shipping_fee" >= (0)::numeric))
);


ALTER TABLE "public"."tiers" OWNER TO "postgres";


COMMENT ON TABLE "public"."tiers" IS '會員等級表：定義批發系統的客戶等級（零售、批發、經銷商），用於綁定等級價格';



COMMENT ON COLUMN "public"."tiers"."id" IS '等級 ID（UUID）';



COMMENT ON COLUMN "public"."tiers"."name" IS '等級名稱（如「零售」、「批發」、「經銷商」）';



COMMENT ON COLUMN "public"."tiers"."rank" IS '等級排序（數字越大等級越高）';



COMMENT ON COLUMN "public"."tiers"."created_at" IS '建立時間';



COMMENT ON COLUMN "public"."tiers"."updated_at" IS '最後更新時間';



COMMENT ON COLUMN "public"."tiers"."is_protected" IS '是否為受保護等級（零售）：true 表示此等級的價格不能低於 retail_price';



COMMENT ON COLUMN "public"."tiers"."shipping_fee" IS '基本運費金額（0 表示不收運費）';



COMMENT ON COLUMN "public"."tiers"."free_shipping_threshold" IS '滿額免運門檻（NULL 表示不提供免運，例如：滿 1000 免運）';



CREATE TABLE IF NOT EXISTS "public"."user_coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "coupon_id" "uuid" NOT NULL,
    "claimed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "used_at" timestamp with time zone,
    "order_id" "uuid",
    CONSTRAINT "user_coupons_check" CHECK (((("used_at" IS NULL) AND ("order_id" IS NULL)) OR (("used_at" IS NOT NULL) AND ("order_id" IS NOT NULL))))
);


ALTER TABLE "public"."user_coupons" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_coupons" IS '客戶優惠券領取記錄表 - 每次領取建立一筆記錄，支援同一優惠券多次領取';



COMMENT ON COLUMN "public"."user_coupons"."user_id" IS '客戶 ID';



COMMENT ON COLUMN "public"."user_coupons"."coupon_id" IS '優惠券 ID';



COMMENT ON COLUMN "public"."user_coupons"."claimed_at" IS '領取時間';



COMMENT ON COLUMN "public"."user_coupons"."used_at" IS '使用時間（NULL 表示未使用）';



COMMENT ON COLUMN "public"."user_coupons"."order_id" IS '使用於哪個訂單（NULL 表示未使用）';



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."backup_jobs"
    ADD CONSTRAINT "backup_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupon_series_restrictions"
    ADD CONSTRAINT "coupon_series_restrictions_coupon_id_series_id_key" UNIQUE ("coupon_id", "series_id");



ALTER TABLE ONLY "public"."coupon_series_restrictions"
    ADD CONSTRAINT "coupon_series_restrictions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupon_tier_restrictions"
    ADD CONSTRAINT "coupon_tier_restrictions_coupon_id_tier_id_key" UNIQUE ("coupon_id", "tier_id");



ALTER TABLE ONLY "public"."coupon_tier_restrictions"
    ADD CONSTRAINT "coupon_tier_restrictions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_coupons"
    ADD CONSTRAINT "order_coupons_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."order_coupons"
    ADD CONSTRAINT "order_coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_custom_fees"
    ADD CONSTRAINT "order_custom_fees_order_id_fee_name_key" UNIQUE ("order_id", "fee_name");



ALTER TABLE ONLY "public"."order_custom_fees"
    ADD CONSTRAINT "order_custom_fees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_timelines"
    ADD CONSTRAINT "order_timelines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."series"
    ADD CONSTRAINT "series_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."series"
    ADD CONSTRAINT "series_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."series"
    ADD CONSTRAINT "series_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tier_prices"
    ADD CONSTRAINT "tier_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tier_prices"
    ADD CONSTRAINT "tier_prices_tier_id_product_id_key" UNIQUE ("tier_id", "product_id");



ALTER TABLE ONLY "public"."tiers"
    ADD CONSTRAINT "tiers_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tiers"
    ADD CONSTRAINT "tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_coupons"
    ADD CONSTRAINT "user_coupons_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_announcements_active_sort" ON "public"."announcements" USING "btree" ("is_active", "sort_order") WHERE ("is_active" = true);



CREATE INDEX "idx_audit_logs_action_type" ON "public"."audit_logs" USING "btree" ("action_type");



CREATE INDEX "idx_audit_logs_actor" ON "public"."audit_logs" USING "btree" ("actor_id", "created_at" DESC);



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_new_values_gin" ON "public"."audit_logs" USING "gin" ("new_values");



CREATE INDEX "idx_audit_logs_old_values_gin" ON "public"."audit_logs" USING "gin" ("old_values");



CREATE INDEX "idx_audit_logs_target" ON "public"."audit_logs" USING "btree" ("target_type", "target_id");



CREATE INDEX "idx_audit_logs_target_type" ON "public"."audit_logs" USING "btree" ("target_type");



CREATE INDEX "idx_backup_jobs_created_at" ON "public"."backup_jobs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_backup_jobs_status" ON "public"."backup_jobs" USING "btree" ("status");



CREATE INDEX "idx_backup_jobs_type_created" ON "public"."backup_jobs" USING "btree" ("backup_type", "created_at" DESC);



CREATE INDEX "idx_backup_jobs_type_status" ON "public"."backup_jobs" USING "btree" ("backup_type", "status");



CREATE INDEX "idx_categories_code" ON "public"."categories" USING "btree" ("code");



CREATE INDEX "idx_categories_name" ON "public"."categories" USING "btree" ("name");



CREATE INDEX "idx_categories_sort_order" ON "public"."categories" USING "btree" ("sort_order");



CREATE INDEX "idx_categories_status" ON "public"."categories" USING "btree" ("status");



CREATE INDEX "idx_coupon_series_restrictions_coupon_id" ON "public"."coupon_series_restrictions" USING "btree" ("coupon_id");



CREATE INDEX "idx_coupon_series_restrictions_series_id" ON "public"."coupon_series_restrictions" USING "btree" ("series_id");



CREATE INDEX "idx_coupon_tier_restrictions_coupon_id" ON "public"."coupon_tier_restrictions" USING "btree" ("coupon_id");



CREATE INDEX "idx_coupon_tier_restrictions_tier_id" ON "public"."coupon_tier_restrictions" USING "btree" ("tier_id");



CREATE UNIQUE INDEX "idx_coupons_code_normalized" ON "public"."coupons" USING "btree" ("code_normalized") WHERE (("status")::"text" <> 'deleted'::"text");



CREATE INDEX "idx_coupons_discount_type" ON "public"."coupons" USING "btree" ("discount_type");



CREATE INDEX "idx_coupons_status" ON "public"."coupons" USING "btree" ("status");



CREATE INDEX "idx_coupons_valid_time" ON "public"."coupons" USING "btree" ("valid_from", "valid_until");



CREATE INDEX "idx_order_coupons_coupon_code" ON "public"."order_coupons" USING "btree" ("coupon_code");



CREATE INDEX "idx_order_coupons_order_id" ON "public"."order_coupons" USING "btree" ("order_id");



CREATE INDEX "idx_order_custom_fees_created_at" ON "public"."order_custom_fees" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_order_custom_fees_order_id" ON "public"."order_custom_fees" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_product_id" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "idx_order_items_series_id_snapshot" ON "public"."order_items" USING "btree" ("series_id_snapshot");



CREATE INDEX "idx_order_timelines_created_at" ON "public"."order_timelines" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_order_timelines_modifications" ON "public"."order_timelines" USING "gin" ("modifications");



CREATE INDEX "idx_order_timelines_order_id" ON "public"."order_timelines" USING "btree" ("order_id");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "idx_orders_order_number" ON "public"."orders" USING "btree" ("order_number");



CREATE INDEX "idx_orders_pending_created" ON "public"."orders" USING "btree" ("created_at" DESC) WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_orders_user_status" ON "public"."orders" USING "btree" ("user_id", "status");



CREATE INDEX "idx_products_active_series_updated" ON "public"."products" USING "btree" ("series_id", "updated_at" DESC) WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_products_code" ON "public"."products" USING "btree" ("code");



COMMENT ON INDEX "public"."idx_products_code" IS '商品編號索引 - 用於全域搜尋';



CREATE INDEX "idx_products_name" ON "public"."products" USING "btree" ("name");



COMMENT ON INDEX "public"."idx_products_name" IS '商品名稱索引 - 用於全域搜尋';



CREATE INDEX "idx_products_series_id" ON "public"."products" USING "btree" ("series_id");



CREATE INDEX "idx_products_series_status" ON "public"."products" USING "btree" ("series_id", "status");



CREATE INDEX "idx_products_status" ON "public"."products" USING "btree" ("status");



COMMENT ON INDEX "public"."idx_products_status" IS '商品狀態索引 - 用於篩選 active 商品';



CREATE INDEX "idx_products_status_updated_at" ON "public"."products" USING "btree" ("status", "updated_at" DESC);



COMMENT ON INDEX "public"."idx_products_status_updated_at" IS '商品狀態與更新時間組合索引 - 用於前台商品列表排序';



CREATE INDEX "idx_products_stock_status" ON "public"."products" USING "btree" ("stock_status");



CREATE INDEX "idx_products_tags" ON "public"."products" USING "gin" ("tags");



COMMENT ON INDEX "public"."idx_products_tags" IS '商品標籤 GIN 索引 - 支援陣列查詢';



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email") WHERE ("email" IS NOT NULL);



CREATE INDEX "idx_profiles_phone" ON "public"."profiles" USING "btree" ("phone") WHERE ("phone" IS NOT NULL);



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_profiles_tier_id" ON "public"."profiles" USING "btree" ("tier_id");



CREATE UNIQUE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "idx_series_category_id" ON "public"."series" USING "btree" ("category_id");



CREATE INDEX "idx_series_code" ON "public"."series" USING "btree" ("code");



CREATE INDEX "idx_series_name" ON "public"."series" USING "btree" ("name");



CREATE INDEX "idx_series_sort_order" ON "public"."series" USING "btree" ("sort_order");



CREATE INDEX "idx_series_status" ON "public"."series" USING "btree" ("status");



CREATE INDEX "idx_system_settings_category" ON "public"."system_settings" USING "btree" ("category");



CREATE INDEX "idx_system_settings_is_public" ON "public"."system_settings" USING "btree" ("is_public");



CREATE UNIQUE INDEX "idx_system_settings_key" ON "public"."system_settings" USING "btree" ("key");



CREATE INDEX "idx_tier_prices_lookup" ON "public"."tier_prices" USING "btree" ("tier_id", "product_id");



CREATE INDEX "idx_tier_prices_product_id" ON "public"."tier_prices" USING "btree" ("product_id");



CREATE INDEX "idx_tier_prices_tier_id" ON "public"."tier_prices" USING "btree" ("tier_id");



CREATE INDEX "idx_tiers_rank" ON "public"."tiers" USING "btree" ("rank");



CREATE INDEX "idx_user_coupons_coupon_id" ON "public"."user_coupons" USING "btree" ("coupon_id");



CREATE INDEX "idx_user_coupons_used_at" ON "public"."user_coupons" USING "btree" ("used_at");



CREATE INDEX "idx_user_coupons_user_coupon" ON "public"."user_coupons" USING "btree" ("user_id", "coupon_id");



CREATE INDEX "idx_user_coupons_user_id" ON "public"."user_coupons" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trigger_auto_generate_product_code" BEFORE INSERT ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."auto_generate_product_code"();



COMMENT ON TRIGGER "trigger_auto_generate_product_code" ON "public"."products" IS '商品建立時自動產生商品編號';



CREATE OR REPLACE TRIGGER "update_announcements_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_coupons_updated_at" BEFORE UPDATE ON "public"."coupons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_series_updated_at" BEFORE UPDATE ON "public"."series" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_system_settings_updated_at" BEFORE UPDATE ON "public"."system_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tier_prices_updated_at" BEFORE UPDATE ON "public"."tier_prices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tiers_updated_at" BEFORE UPDATE ON "public"."tiers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."backup_jobs"
    ADD CONSTRAINT "backup_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."coupon_series_restrictions"
    ADD CONSTRAINT "coupon_series_restrictions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_series_restrictions"
    ADD CONSTRAINT "coupon_series_restrictions_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_tier_restrictions"
    ADD CONSTRAINT "coupon_tier_restrictions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_tier_restrictions"
    ADD CONSTRAINT "coupon_tier_restrictions_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."tiers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_coupons"
    ADD CONSTRAINT "order_coupons_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_custom_fees"
    ADD CONSTRAINT "order_custom_fees_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_custom_fees"
    ADD CONSTRAINT "order_custom_fees_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_series_id_snapshot_fkey" FOREIGN KEY ("series_id_snapshot") REFERENCES "public"."series"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_timelines"
    ADD CONSTRAINT "order_timelines_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_timelines"
    ADD CONSTRAINT "order_timelines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."tiers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."series"
    ADD CONSTRAINT "series_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tier_prices"
    ADD CONSTRAINT "tier_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tier_prices"
    ADD CONSTRAINT "tier_prices_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."tiers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_coupons"
    ADD CONSTRAINT "user_coupons_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_coupons"
    ADD CONSTRAINT "user_coupons_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_coupons"
    ADD CONSTRAINT "user_coupons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete order custom fees" ON "public"."order_custom_fees" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Admins can delete order custom fees" ON "public"."order_custom_fees" IS '管理員可刪除訂單自訂費用';



CREATE POLICY "Admins can insert order coupons" ON "public"."order_coupons" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert order custom fees" ON "public"."order_custom_fees" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Admins can insert order custom fees" ON "public"."order_custom_fees" IS '管理員可新增訂單自訂費用';



CREATE POLICY "Admins can manage backup jobs" ON "public"."backup_jobs" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage coupons" ON "public"."coupons" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage series restrictions" ON "public"."coupon_series_restrictions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage tier restrictions" ON "public"."coupon_tier_restrictions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update order custom fees" ON "public"."order_custom_fees" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Admins can update order custom fees" ON "public"."order_custom_fees" IS '管理員可修改訂單自訂費用';



CREATE POLICY "Admins can update orders" ON "public"."orders" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Admins can update orders" ON "public"."orders" IS '管理員可更新所有訂單';



CREATE POLICY "Admins can update settings" ON "public"."system_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all audit logs" ON "public"."audit_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all coupons" ON "public"."coupons" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all order coupons" ON "public"."order_coupons" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all order custom fees" ON "public"."order_custom_fees" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Admins can view all order custom fees" ON "public"."order_custom_fees" IS '管理員可查看所有訂單的自訂費用';



CREATE POLICY "Admins can view all order items" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Admins can view all order items" ON "public"."order_items" IS '管理員可查看所有訂單明細';



CREATE POLICY "Admins can view all order timelines" ON "public"."order_timelines" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Admins can view all order timelines" ON "public"."order_timelines" IS '管理員可查看所有訂單操作歷史';



CREATE POLICY "Admins can view all orders" ON "public"."orders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Admins can view all orders" ON "public"."orders" IS '管理員可查看所有訂單';



CREATE POLICY "Admins can view all settings" ON "public"."system_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all user coupons" ON "public"."user_coupons" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view backup jobs" ON "public"."backup_jobs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Allow admin to manage categories" ON "public"."categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Allow admin to manage categories" ON "public"."categories" IS '僅允許管理員新增、修改、刪除分類';



CREATE POLICY "Allow admin to manage products" ON "public"."products" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Allow admin to manage products" ON "public"."products" IS '僅允許管理員新增、修改、刪除商品';



CREATE POLICY "Allow admin to manage profiles" ON "public"."profiles" TO "authenticated" USING (("id" = "auth"."uid"()));



COMMENT ON POLICY "Allow admin to manage profiles" ON "public"."profiles" IS '僅允許修改自己的資料（管理員操作使用 Admin Client 繞過 RLS）';



CREATE POLICY "Allow admin to manage series" ON "public"."series" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Allow admin to manage series" ON "public"."series" IS '僅允許管理員新增、修改、刪除系列';



CREATE POLICY "Allow admin to manage tier_prices" ON "public"."tier_prices" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Allow admin to manage tier_prices" ON "public"."tier_prices" IS '僅允許管理員新增、修改、刪除等級價格';



CREATE POLICY "Allow admin to manage tiers" ON "public"."tiers" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Allow admin to manage tiers" ON "public"."tiers" IS '僅允許管理員新增、修改、刪除會員等級';



CREATE POLICY "Allow admin to read all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



COMMENT ON POLICY "Allow admin to read all profiles" ON "public"."profiles" IS '允許所有已認證用戶讀取 Profiles（RLS 層級寬鬆，權限由 Server Action 控制）';



CREATE POLICY "Allow authenticated users to read active series" ON "public"."series" FOR SELECT TO "authenticated" USING ((("status" = 'active'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



COMMENT ON POLICY "Allow authenticated users to read active series" ON "public"."series" IS '允許客戶讀取活躍系列，管理員可讀取所有系列';



CREATE POLICY "Allow authenticated users to read categories" ON "public"."categories" FOR SELECT TO "authenticated" USING (true);



COMMENT ON POLICY "Allow authenticated users to read categories" ON "public"."categories" IS '允許所有已認證使用者讀取分類';



CREATE POLICY "Allow authenticated users to read tier_prices" ON "public"."tier_prices" FOR SELECT TO "authenticated" USING (true);



COMMENT ON POLICY "Allow authenticated users to read tier_prices" ON "public"."tier_prices" IS '允許所有已認證使用者讀取等級價格（Server Action 會過濾）';



CREATE POLICY "Allow authenticated users to read tiers" ON "public"."tiers" FOR SELECT TO "authenticated" USING (true);



COMMENT ON POLICY "Allow authenticated users to read tiers" ON "public"."tiers" IS '允許所有已認證使用者讀取會員等級（用於前台顯示等級選項）';



CREATE POLICY "Allow users to read active products in active series" ON "public"."products" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."series" "s"
  WHERE (("s"."id" = "products"."series_id") AND ((("products"."status" = 'active'::"text") AND ("s"."status" = 'active'::"text")) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))))))));



COMMENT ON POLICY "Allow users to read active products in active series" ON "public"."products" IS '允許客戶讀取活躍系列中的活躍商品，管理員可讀取所有商品';



CREATE POLICY "Allow users to read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



COMMENT ON POLICY "Allow users to read own profile" ON "public"."profiles" IS '允許使用者讀取自己的 Profile 資料';



CREATE POLICY "Authenticated users can insert audit logs" ON "public"."audit_logs" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can insert timeline records" ON "public"."order_timelines" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



COMMENT ON POLICY "Authenticated users can insert timeline records" ON "public"."order_timelines" IS '已認證使用者可建立歷史記錄 (修復 RLS INSERT 阻擋問題)';



CREATE POLICY "Authenticated users can view series restrictions" ON "public"."coupon_series_restrictions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view tier restrictions" ON "public"."coupon_tier_restrictions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Clients can claim coupons" ON "public"."user_coupons" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Clients can create their own orders" ON "public"."orders" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



COMMENT ON POLICY "Clients can create their own orders" ON "public"."orders" IS '客戶僅能建立自己的訂單';



CREATE POLICY "Clients can insert items for their own orders" ON "public"."order_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



COMMENT ON POLICY "Clients can insert items for their own orders" ON "public"."order_items" IS '客戶建立訂單時可新增明細 (修復 RLS INSERT 阻擋問題)';



CREATE POLICY "Clients can insert order coupons for their own orders" ON "public"."order_coupons" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_coupons"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "Clients can view active coupons" ON "public"."coupons" FOR SELECT TO "authenticated" USING (((("status")::"text" = 'active'::"text") AND (("now"() >= "valid_from") AND ("now"() <= "valid_until"))));



CREATE POLICY "Clients can view their order coupons" ON "public"."order_coupons" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_coupons"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "Clients can view their order custom fees" ON "public"."order_custom_fees" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_custom_fees"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



COMMENT ON POLICY "Clients can view their order custom fees" ON "public"."order_custom_fees" IS '客戶僅能查看自己訂單的自訂費用';



CREATE POLICY "Clients can view their order items" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



COMMENT ON POLICY "Clients can view their order items" ON "public"."order_items" IS '客戶僅能查看自己訂單的明細';



CREATE POLICY "Clients can view their order timelines" ON "public"."order_timelines" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_timelines"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



COMMENT ON POLICY "Clients can view their order timelines" ON "public"."order_timelines" IS '客戶僅能查看自己訂單的操作歷史';



CREATE POLICY "Clients can view their own coupons" ON "public"."user_coupons" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Clients can view their own orders" ON "public"."orders" FOR SELECT USING (("user_id" = "auth"."uid"()));



COMMENT ON POLICY "Clients can view their own orders" ON "public"."orders" IS '客戶僅能查看自己的訂單';



CREATE POLICY "Public can view public settings" ON "public"."system_settings" FOR SELECT USING (("is_public" = true));



CREATE POLICY "admin_manage_announcements" ON "public"."announcements" TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")) WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "admin_select_all_announcements" ON "public"."announcements" FOR SELECT TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."backup_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupon_series_restrictions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupon_tier_restrictions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_coupons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_custom_fees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_timelines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_select_active_announcements" ON "public"."announcements" FOR SELECT USING (("is_active" = true));



ALTER TABLE "public"."series" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tier_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_coupons" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."auto_generate_product_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_generate_product_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_generate_product_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_shipping_fee"("p_user_id" "uuid", "p_subtotal" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_shipping_fee"("p_user_id" "uuid", "p_subtotal" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_shipping_fee"("p_user_id" "uuid", "p_subtotal" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_order_and_restore_stock"("p_order_id" "uuid", "p_actor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_order_and_restore_stock"("p_order_id" "uuid", "p_actor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_order_and_restore_stock"("p_order_id" "uuid", "p_actor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."confirm_order_and_deduct_stock"("p_order_id" "uuid", "p_actor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."confirm_order_and_deduct_stock"("p_order_id" "uuid", "p_actor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_order_and_deduct_stock"("p_order_id" "uuid", "p_actor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_order_pending"("p_order_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_order_pending"("p_order_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_order_pending"("p_order_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_product_code"("p_series_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_product_code"("p_series_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_product_code"("p_series_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_order_as_shipping"("p_order_id" "uuid", "p_actor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_order_as_shipping"("p_order_id" "uuid", "p_actor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_order_as_shipping"("p_order_id" "uuid", "p_actor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "text", "p_actor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "text", "p_actor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "text", "p_actor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_order_with_modifications"("p_order_id" "uuid", "p_modifications" "jsonb", "p_actor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_order_with_modifications"("p_order_id" "uuid", "p_modifications" "jsonb", "p_actor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_order_with_modifications"("p_order_id" "uuid", "p_modifications" "jsonb", "p_actor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."coupons" TO "anon";
GRANT ALL ON TABLE "public"."coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."coupons" TO "service_role";



GRANT ALL ON TABLE "public"."active_coupons" TO "anon";
GRANT ALL ON TABLE "public"."active_coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."active_coupons" TO "service_role";



GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."backup_jobs" TO "anon";
GRANT ALL ON TABLE "public"."backup_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."backup_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."coupon_series_restrictions" TO "anon";
GRANT ALL ON TABLE "public"."coupon_series_restrictions" TO "authenticated";
GRANT ALL ON TABLE "public"."coupon_series_restrictions" TO "service_role";



GRANT ALL ON TABLE "public"."coupon_tier_restrictions" TO "anon";
GRANT ALL ON TABLE "public"."coupon_tier_restrictions" TO "authenticated";
GRANT ALL ON TABLE "public"."coupon_tier_restrictions" TO "service_role";



GRANT ALL ON TABLE "public"."order_coupons" TO "anon";
GRANT ALL ON TABLE "public"."order_coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."order_coupons" TO "service_role";



GRANT ALL ON TABLE "public"."order_custom_fees" TO "anon";
GRANT ALL ON TABLE "public"."order_custom_fees" TO "authenticated";
GRANT ALL ON TABLE "public"."order_custom_fees" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."order_timelines" TO "anon";
GRANT ALL ON TABLE "public"."order_timelines" TO "authenticated";
GRANT ALL ON TABLE "public"."order_timelines" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."series" TO "anon";
GRANT ALL ON TABLE "public"."series" TO "authenticated";
GRANT ALL ON TABLE "public"."series" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."tier_prices" TO "anon";
GRANT ALL ON TABLE "public"."tier_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."tier_prices" TO "service_role";



GRANT ALL ON TABLE "public"."tiers" TO "anon";
GRANT ALL ON TABLE "public"."tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."tiers" TO "service_role";



GRANT ALL ON TABLE "public"."user_coupons" TO "anon";
GRANT ALL ON TABLE "public"."user_coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."user_coupons" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































