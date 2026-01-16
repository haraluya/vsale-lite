-- ==================================================
-- Vsale-lite Database Schema Consolidated Baseline
-- ==================================================
-- Version: 1.0.0
-- Created: 2026-01-17
-- Purpose: Consolidates all historical migrations (M1-M8 + 20 fix migrations)
--
-- This file contains a complete schema snapshot from production environment
-- Used for quick deployment in new environments
--
-- Consolidated Migrations:
-- - M1: 20260107100000_core_auth_and_tiers.sql
-- - M2: 20260107110000_product_catalog_system.sql
-- - M3: 20260107120000_orders_and_workflow.sql
-- - M4: 20260107130000_shipping_and_custom_fees.sql
-- - M5: 20260107140000_coupon_system.sql
-- - M6: 20260107150000_system_admin_and_audit.sql
-- - M7: 20260107160000_indexes_and_performance.sql
-- - M8: 20260107170000_rls_policies.sql
-- - Plus 20 fix migrations
--
-- IMPORTANT:
-- 1. This file is only for NEW environment deployment
-- 2. Historical migrations are archived in .archive/2026-01-17-pre-consolidation/
-- 3. Production environment will NOT re-execute historical migrations
-- ==================================================


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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."auto_assign_series_color"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_colors TEXT[] := ARRAY[
    '#FBBF24', '#F87171', '#34D399', '#60A5FA', '#A78BFA',
    '#FB923C', '#EC4899', '#14B8A6', '#F472B6', '#8B5CF6',
    '#10B981', '#3B82F6', '#EF4444', '#F59E0B', '#06B6D4'
  ];
  v_count INTEGER;
BEGIN
  -- ??芣??身摰??脫?嚗蝙?券?閮剖潘??芸???
  IF NEW.color = '#94A3B8' OR NEW.color IS NULL THEN
    -- 閮??暹?蝟餃??賊?嚗捱摰蝙?典????
    SELECT COUNT(*) INTO v_count FROM series;
    NEW.color := v_colors[(v_count % array_length(v_colors, 1)) + 1];
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_assign_series_color"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_assign_series_color"() IS '?芸???憿蝯行撱箇??頂??敺芰雿輻 15 蝔桅?閮剝??莎?';



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


COMMENT ON FUNCTION "public"."auto_generate_product_code"() IS '閫貊?典?賂???撱箇??????楊??;



CREATE OR REPLACE FUNCTION "public"."calculate_shipping_fee"("p_user_id" "uuid", "p_subtotal" numeric) RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_shipping_fee DECIMAL(10,2);
  v_free_threshold DECIMAL(10,2);
BEGIN
  -- ?亥岷摰Ｘ蝑???鞎餉身摰??格活?亥岷 JOIN嚗?
  SELECT t.shipping_fee, t.free_shipping_threshold
  INTO v_shipping_fee, v_free_threshold
  FROM profiles p
  JOIN tiers t ON t.id = p.tier_id
  WHERE p.id = p_user_id;

  -- ?交?∪恥?嗆?蝑?嚗?閮凋??園?鞎?
  IF v_shipping_fee IS NULL THEN
    RETURN 0;
  END IF;

  -- ?亙?祇?鞎餌 0嚗?亥???0
  IF v_shipping_fee = 0 THEN
    RETURN 0;
  END IF;

  -- ?亥身摰?皛輸????瑼颱???蝮賡???嚗???0
  IF v_free_threshold IS NOT NULL AND p_subtotal >= v_free_threshold THEN
    RETURN 0;
  END IF;

  -- ?血?餈??箸?祥
  RETURN v_shipping_fee;
END;
$$;


ALTER FUNCTION "public"."calculate_shipping_fee"("p_user_id" "uuid", "p_subtotal" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_shipping_fee"("p_user_id" "uuid", "p_subtotal" numeric) IS '閮?閮?祥嚗?摰Ｘ蝑????蜇憿??舀皛輸???嚗?;



CREATE OR REPLACE FUNCTION "public"."cancel_order_and_restore_stock"("p_order_id" "uuid", "p_actor_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  -- 1. 撽?閮摮????  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- ?迂?? pending ??shipping ???閮
  IF v_order.status NOT IN ('pending', 'shipping') THEN
    RETURN json_build_object('success', false, 'error', 'Cannot cancel order with status ' || v_order.status);
  END IF;

  -- 2. ?湔閮???  UPDATE orders
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_order_id;

  -- 3. ??摨怠?嚗??嗉??桀歇?箄疏??- 摨怠????撌脩宏??shipping ?挾嚗?  IF v_order.status = 'shipping' THEN
    FOR v_item IN
      SELECT * FROM order_items WHERE order_id = p_order_id
    LOOP
      UPDATE products
      SET stock = stock + v_item.quantity
      WHERE id = v_item.product_id;
    END LOOP;
  END IF;

  -- 4. ?? ???嚗?蝵?used_at ??order_id嚗?摰Ｘ?臬?甈∩蝙?剁?
  UPDATE user_coupons
  SET used_at = NULL, order_id = NULL
  WHERE order_id = p_order_id;

  -- 5. 閮?閮??甇瑕
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, old_status, new_status, notes)
  VALUES (
    p_order_id,
    'cancelled',
    p_actor_id,
    'admin',
    v_order.status,
    'cancelled',
    CASE
      WHEN v_order.status = 'shipping' THEN '閮撌脣?瘨?摨怠?撌脣?鋆??芣??詨歇???
      ELSE '閮撌脣?瘨??芣??詨歇???
    END
  );

  RETURN json_build_object(
    'success', true,
    'order_id', p_order_id,
    'message', '閮撌脫???瘨?
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


COMMENT ON FUNCTION "public"."cancel_order_and_restore_stock"("p_order_id" "uuid", "p_actor_id" "uuid") IS '閮??銝血?鋆澈摮??芣???(???扳?雿? - ?舀 pending/shipping ??cancelled嚗??芸????;



CREATE OR REPLACE FUNCTION "public"."confirm_order_and_deduct_stock"("p_order_id" "uuid", "p_actor_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  -- 1. 撽?閮摮????
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Order status must be pending');
  END IF;

  -- 2. ?湔閮???
  UPDATE orders
  SET status = 'confirmed', updated_at = NOW()
  WHERE id = p_order_id;

  -- 3. ???摨怠? (?舀鞎澈摮?
  FOR v_item IN
    SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    UPDATE products
    SET stock = stock - v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  -- 4. 閮???甇瑕 (雿輻 'confirmed' action_type)
  INSERT INTO order_timelines (
    order_id, action_type, actor_id, actor_role, old_status, new_status
  ) VALUES (
    p_order_id, 'confirmed', p_actor_id, 'admin', 'pending', 'confirmed'
  );

  RETURN json_build_object('success', true, 'order_id', p_order_id);

EXCEPTION
  WHEN OTHERS THEN
    -- ?芸??遝
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."confirm_order_and_deduct_stock"("p_order_id" "uuid", "p_actor_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."confirm_order_and_deduct_stock"("p_order_id" "uuid", "p_actor_id" "uuid") IS '閮蝣箄?銝行皜澈摮?(???扳?雿?';



CREATE OR REPLACE FUNCTION "public"."delete_order_pending"("p_order_id" "uuid", "p_actor_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- 1. 撽?閮摮????  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- 2. ??閮勗??pending ???閮
  IF v_order.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Can only delete pending orders');
  END IF;

  -- 3. ?? ???嚗?蝵?used_at ??order_id嚗?摰Ｘ?臬?甈∩蝙?剁?
  UPDATE user_coupons
  SET used_at = NULL, order_id = NULL
  WHERE order_id = p_order_id;

  -- 4. 閮??芷????order_timelines (CASCADE ??歹?雿?閮?銝甈?
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, notes)
  VALUES (
    p_order_id,
    'deleted',
    p_actor_id,
    'admin',
    COALESCE(p_reason, '蝞∠??∪?方??殷??芣??詨歇???)
  );

  -- 5. ?芷閮 (CASCADE ????order_items ??order_timelines)
  DELETE FROM orders WHERE id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'order_number', v_order.order_number,
    'message', '閮撌脣?歹??芣??詨歇???
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."delete_order_pending"("p_order_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_order_pending"("p_order_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") IS '?芷 pending ????桐蒂??? (???扳?雿?蝜? RLS)';



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

  -- ?亥岷?嗆?憭扳?瘞渲?
  SELECT COALESCE(
    MAX(
      SUBSTRING(order_number FROM LENGTH('ORD-' || today || '-') + 1)::INTEGER
    ), 0
  ) + 1
  INTO seq_num
  FROM orders
  WHERE order_number LIKE 'ORD-' || today || '-%';

  -- 瘙箏?瘚偌????(?撠?4 雿?頞? 9999 ?芸??游?)
  max_digits := GREATEST(4, LENGTH(seq_num::TEXT));

  -- ?Ｙ?閮蝺刻?
  order_num := 'ORD-' || today || '-' || LPAD(seq_num::TEXT, max_digits, '0');

  RETURN order_num;
END;
$$;


ALTER FUNCTION "public"."generate_order_number"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_order_number"() IS '?Ｙ??臭?閮蝺刻? (ORD-YYYYMMDD-XXXX)';



CREATE OR REPLACE FUNCTION "public"."generate_product_code"("p_series_id" "uuid") RETURNS character varying
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  v_category_code VARCHAR(10);
  v_series_code VARCHAR(10);
  v_max_number INTEGER;
  v_new_code VARCHAR(50);
BEGIN
  -- 1. ??蝟餃?隞?Ⅳ??憿誨蝣?
  SELECT c.code, s.code INTO v_category_code, v_series_code
  FROM series s
  INNER JOIN categories c ON s.category_id = c.id
  WHERE s.id = p_series_id;

  IF v_category_code IS NULL OR v_series_code IS NULL THEN
    RAISE EXCEPTION '?⊥??曉蝟餃?撠???憿誨蝣潭?蝟餃?隞?Ⅳ';
  END IF;

  -- 2. ?亥岷閰脩頂??撌脣??函??憭扳?瘞渲?
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(p.code FROM '(\d+)$') AS INTEGER)),
    0
  ) INTO v_max_number
  FROM products p
  WHERE p.series_id = p_series_id
    AND p.code ~ ('^' || v_category_code || '-' || v_series_code || '-\d{2}$');

  -- 3. ?Ｙ??啁楊???拐??豢?瘞渲?嚗?
  v_new_code := v_category_code || '-' || v_series_code || '-' || LPAD((v_max_number + 1)::TEXT, 2, '0');

  RETURN v_new_code;
END;
$_$;


ALTER FUNCTION "public"."generate_product_code"("p_series_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_product_code"("p_series_id" "uuid") IS '?芸??Ｙ???蝺刻?嚗??隞?Ⅳ]-[蝟餃?隞?Ⅳ]-[?拐?瘚偌?嚗? DRK-TEA-01嚗?;



CREATE OR REPLACE FUNCTION "public"."get_active_tags"() RETURNS TABLE("tag" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT unnest(tags)::TEXT AS tag
  FROM products
  WHERE status = 'active'
    AND tags IS NOT NULL
    AND array_length(tags, 1) > 0
  ORDER BY tag ASC;
END;
$$;


ALTER FUNCTION "public"."get_active_tags"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_active_tags"() IS '????暑頨???璅惜?”嚗??摨??踹?摰Ｘ蝡航???';



CREATE OR REPLACE FUNCTION "public"."get_products_with_user_price"("p_series_id" "uuid", "p_tier_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "retail_price" numeric, "image_url" "text", "stock" integer, "status" "text", "display_order" integer, "series_id" "uuid", "series_name" "text", "series_color" "text", "user_price" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.retail_price,
    p.image_url,
    p.stock,
    p.status,
    p.display_order,
    p.series_id,
    s.name AS series_name,
    s.color AS series_color,
    tp.price AS user_price
  FROM products p
  INNER JOIN series s ON p.series_id = s.id
  LEFT JOIN tier_prices tp ON (
    p.id = tp.product_id AND
    tp.tier_id = p_tier_id
  )
  WHERE p.status = 'active'
    AND s.id = p_series_id
    AND s.status = 'active'
  ORDER BY p.display_order ASC;
END;
$$;


ALTER FUNCTION "public"."get_products_with_user_price"("p_series_id" "uuid", "p_tier_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_products_with_user_price"("p_series_id" "uuid", "p_tier_id" "uuid") IS '??蝟餃?銝????蝙?刻?蝝?潘??芸??亥岷嚗??N+1 ??嚗?;



CREATE OR REPLACE FUNCTION "public"."mark_order_as_shipping"("p_order_id" "uuid", "p_actor_id" "uuid") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_status TEXT;
  v_item RECORD;
BEGIN
  -- 瑼Ｘ閮???
  SELECT status INTO v_current_status FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT FALSE, '閮銝???;
    RETURN;
  END IF;

  IF v_current_status <> 'pending' THEN
    RETURN QUERY SELECT FALSE, '??蝣箄?閮?舀?閮鞎?;
    RETURN;
  END IF;

  -- ???摨怠?嚗?渲?摨怠?嚗?
  FOR v_item IN
    SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
  LOOP
    UPDATE products SET stock = stock - v_item.quantity WHERE id = v_item.product_id;
  END LOOP;

  -- ?湔閮???
  UPDATE orders SET status = 'shipping', updated_at = NOW() WHERE id = p_order_id;

  -- 閮???甇瑕
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, old_status, new_status)
  VALUES (p_order_id, 'status_updated', p_actor_id, 'admin', 'pending', 'shipping');

  RETURN QUERY SELECT TRUE, '閮撌脫?閮?箄疏銝哨?摨怠?撌脫皜?;
END;
$$;


ALTER FUNCTION "public"."mark_order_as_shipping"("p_order_id" "uuid", "p_actor_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mark_order_as_shipping"("p_order_id" "uuid", "p_actor_id" "uuid") IS '璅?閮?箏鞎其葉銝行皜澈摮????扳?雿?嚗?隞????confirm_order_and_deduct_stock';



CREATE OR REPLACE FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "text", "p_actor_id" "uuid") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_old_status TEXT;
  v_item RECORD;
BEGIN
  -- 瑼Ｘ閮
  SELECT status INTO v_old_status FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_old_status IS NULL THEN
    RETURN QUERY SELECT FALSE, '閮銝???;
    RETURN;
  END IF;

  -- 撽????蝔?蝪∪?敺?閬?嚗?
  IF v_old_status = 'shipping' AND p_new_status = 'completed' THEN
    -- ?迂嚗hipping ??completed
    NULL;
  ELSIF v_old_status = 'pending' AND p_new_status = 'cancelled' THEN
    -- ?迂嚗ending ??cancelled嚗???摨怠?嚗?
    NULL;
  ELSIF v_old_status = 'shipping' AND p_new_status = 'cancelled' THEN
    -- ?迂嚗hipping ??cancelled嚗???摨怠?嚗?
    FOR v_item IN
      SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
    LOOP
      UPDATE products SET stock = stock + v_item.quantity WHERE id = v_item.product_id;
    END LOOP;
  ELSE
    RETURN QUERY SELECT FALSE, '銝?閮梁??????' || v_old_status || ' ??' || p_new_status;
    RETURN;
  END IF;

  -- ?湔???
  UPDATE orders SET status = p_new_status, updated_at = NOW() WHERE id = p_order_id;

  -- 閮?甇瑕
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, old_status, new_status)
  VALUES (p_order_id, 'status_updated', p_actor_id, 'admin', v_old_status, p_new_status);

  RETURN QUERY SELECT TRUE, '閮??歇?湔';
END;
$$;


ALTER FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "text", "p_actor_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "text", "p_actor_id" "uuid") IS '?湔閮???蝪∪???蝘駁 confirmed ?????閮梁?頧?嚗hipping?ompleted, pending?ancelled, shipping?ancelled嚗?鋆澈摮?';



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
  -- ===== 1. ?亥岷 actor_role嚗??蝥閰Ｚ???NULL嚗?====
  SELECT role INTO v_actor_role FROM profiles WHERE id = p_actor_id;

  IF v_actor_role IS NULL THEN
    RETURN QUERY SELECT FALSE, '???澈隞賡?霅仃??, NULL::DECIMAL;
    RETURN;
  END IF;

  -- ===== 2. 瑼Ｘ閮???=====
  SELECT status INTO v_current_status FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT FALSE, '閮銝???, NULL::DECIMAL;
    RETURN;
  END IF;

  IF v_current_status NOT IN ('pending') THEN
    RETURN QUERY SELECT FALSE, '??蝣箄?閮?臭耨?對?甇方??桃?? ' || v_current_status, NULL::DECIMAL;
    RETURN;
  END IF;

  -- ===== 3. ????靽格 =====
  IF p_modifications->'items' IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_modifications->'items')
    LOOP
      CASE v_item->>'type'
        -- A. ?寞霈
        WHEN 'price_changed' THEN
          UPDATE order_items
          SET deal_price = (v_item->>'new_price')::DECIMAL,
              subtotal = (v_item->>'new_price')::DECIMAL * quantity
          WHERE id = (v_item->>'item_id')::UUID AND order_id = p_order_id;

          IF NOT FOUND THEN
            RETURN QUERY SELECT FALSE, '?曆??啣???ID: ' || (v_item->>'item_id'), NULL::DECIMAL;
            RETURN;
          END IF;

        -- B. ?賊?霈
        WHEN 'quantity_changed' THEN
          UPDATE order_items
          SET quantity = (v_item->>'new_quantity')::INTEGER,
              subtotal = deal_price * (v_item->>'new_quantity')::INTEGER
          WHERE id = (v_item->>'item_id')::UUID AND order_id = p_order_id;

          IF NOT FOUND THEN
            RETURN QUERY SELECT FALSE, '?曆??啣???ID: ' || (v_item->>'item_id'), NULL::DECIMAL;
            RETURN;
          END IF;

        -- C. 蝘駁??
        WHEN 'removed' THEN
          DELETE FROM order_items WHERE id = (v_item->>'item_id')::UUID AND order_id = p_order_id;

          IF NOT FOUND THEN
            RETURN QUERY SELECT FALSE, '?曆??啣???ID: ' || (v_item->>'item_id'), NULL::DECIMAL;
            RETURN;
          END IF;

        -- D. ?啣???
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

  -- ===== 4. 瑼Ｘ?臬????嚗撠???????=====
  IF (SELECT COUNT(*) FROM order_items WHERE order_id = p_order_id) = 0 THEN
    RETURN QUERY SELECT FALSE, '閮?喳??靽?銝?????⊥??券蝘駁', NULL::DECIMAL;
    RETURN;
  END IF;

  -- ===== 5. ??鞎餌靽格 =====
  IF p_modifications->'fees' IS NOT NULL THEN
    FOR v_fee IN SELECT * FROM jsonb_array_elements(p_modifications->'fees')
    LOOP
      CASE v_fee->>'type'
        -- A. ?啣?鞎餌
        WHEN 'added' THEN
          -- ??靽格迤嚗蝙?冽迤蝣箇?甈???"amount" ?? "fee_amount"
          INSERT INTO order_custom_fees (order_id, fee_name, amount, created_by)
          VALUES (
            p_order_id,
            v_fee->>'fee_name',
            (v_fee->>'amount')::DECIMAL,
            p_actor_id
          );

        -- B. 蝘駁鞎餌
        WHEN 'removed' THEN
          DELETE FROM order_custom_fees
          WHERE order_id = p_order_id AND fee_name = v_fee->>'fee_name';
      END CASE;
    END LOOP;
  END IF;

  -- ===== 6. ???祥靽格 =====
  IF p_modifications->'shipping' IS NOT NULL THEN
    UPDATE orders
    SET shipping_fee = (p_modifications->'shipping'->>'new_fee')::DECIMAL
    WHERE id = p_order_id;
  END IF;

  -- ===== 7. ???酉靽格 =====
  IF p_modifications->'notes' IS NOT NULL THEN
    v_new_notes := p_modifications->'notes'->>'new_notes';
    UPDATE orders
    SET notes = NULLIF(v_new_notes, '')
    WHERE id = p_order_id;
  END IF;

  -- ===== 8. ???芣??貊宏??=====
  IF p_modifications->'coupon' IS NOT NULL THEN
    IF p_modifications->'coupon'->>'action' = 'removed' THEN
      DELETE FROM order_coupons WHERE order_id = p_order_id;
      UPDATE user_coupons
      SET used_at = NULL, order_id = NULL
      WHERE order_id = p_order_id;
    END IF;
  END IF;

  -- ===== 9. ?閮?閮蝮賡?憿?=====
  SELECT COALESCE(SUM(subtotal), 0) INTO v_items_subtotal
  FROM order_items WHERE order_id = p_order_id;

  SELECT COALESCE(shipping_fee, 0) INTO v_shipping_fee
  FROM orders WHERE id = p_order_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_custom_fees_total
  FROM order_custom_fees WHERE order_id = p_order_id;

  SELECT COALESCE(discount_amount, 0) INTO v_coupon_discount
  FROM order_coupons WHERE order_id = p_order_id;

  v_new_total := v_items_subtotal - v_coupon_discount + v_shipping_fee + v_custom_fees_total;

  UPDATE orders SET total_amount = v_new_total WHERE id = p_order_id;

  -- ===== 10. 閮?靽格甇瑞? =====
  -- ??靽格迤嚗蝙?冽迤蝣箇?甈???"action_type" ?? "action"
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

  -- ===== 11. 餈???蝯? =====
  RETURN QUERY SELECT TRUE, '閮靽格??', v_new_total;
END;
$$;


ALTER FUNCTION "public"."update_order_with_modifications"("p_order_id" "uuid", "p_modifications" "jsonb", "p_actor_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_order_with_modifications"("p_order_id" "uuid", "p_modifications" "jsonb", "p_actor_id" "uuid") IS '?寞活靽格閮嚗??祥?具?鞎颯?閮颯?嚗蒂閮?靽格甇瑞???   靽格迤??歇?亙?憿?
   - 雿輻 action_type ?? action
   - 雿輻 amount ?? fee_amount
   - 雿輻 NULLIF 甇?Ⅱ???酉?征??;



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_updated_at_column"() IS '閫貊?典?賂??芸??湔銵函? updated_at 甈??箇????;


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
    "total_limit" integer,
    CONSTRAINT "code_length" CHECK ((("length"(("code")::"text") >= 4) AND ("length"(("code")::"text") <= 20))),
    CONSTRAINT "coupons_check" CHECK ((((("discount_type")::"text" = 'fixed'::"text") AND ("discount_value" > (0)::numeric)) OR ((("discount_type")::"text" = 'percentage'::"text") AND ("discount_value" >= (1)::numeric) AND ("discount_value" <= (100)::numeric)))),
    CONSTRAINT "coupons_claim_limit_check" CHECK (("claim_limit" >= 1)),
    CONSTRAINT "coupons_code_check" CHECK ((("code")::"text" ~ '^[A-Z0-9]+$'::"text")),
    CONSTRAINT "coupons_discount_type_check" CHECK ((("discount_type")::"text" = ANY ((ARRAY['fixed'::character varying, 'percentage'::character varying])::"text"[]))),
    CONSTRAINT "coupons_min_order_amount_check" CHECK (("min_order_amount" >= (0)::numeric)),
    CONSTRAINT "coupons_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'deleted'::character varying])::"text"[]))),
    CONSTRAINT "coupons_total_limit_check" CHECK ((("total_limit" IS NULL) OR ("total_limit" >= 1))),
    CONSTRAINT "valid_time_range" CHECK (("valid_until" > "valid_from"))
);


ALTER TABLE "public"."coupons" OWNER TO "postgres";


COMMENT ON TABLE "public"."coupons" IS '?芣??訾蜓銵?- ?脣??芣??訾誨蝣潦???撘蝙?券??嗚?????;



COMMENT ON COLUMN "public"."coupons"."code" IS '?芣??訾誨蝣潘?蝞∠??∟撓?伐?4-20 摮?嚗??迂?望摮?';



COMMENT ON COLUMN "public"."coupons"."code_normalized" IS '?芸?頧之撖怎??芣??訾誨蝣潘??冽?臭??扳炎?亥??亥岷嚗之撠神銝???';



COMMENT ON COLUMN "public"."coupons"."discount_type" IS '??孵?嚗ixed (?暸??) ??percentage (?曉?瘥???';



COMMENT ON COLUMN "public"."coupons"."discount_value" IS '??潘??暸??嚗摰?憿?NT$嚗???嚗?-100 隞?”??曉?瘥?';



COMMENT ON COLUMN "public"."coupons"."min_order_amount" IS '?雿??桅?憿??塚??詨‵嚗ULL 銵函內?⊿??塚?';



COMMENT ON COLUMN "public"."coupons"."valid_from" IS '?芣??貊???憪???;



COMMENT ON COLUMN "public"."coupons"."valid_until" IS '?芣??貊???????;



COMMENT ON COLUMN "public"."coupons"."claim_limit" IS '瘥?摰Ｘ?舫??撐?訾????身 1 撘蛛??舀憭撐??嚗?;



COMMENT ON COLUMN "public"."coupons"."status" IS '?芣??貊???active (?), inactive (?), deleted (撌脣??';



COMMENT ON COLUMN "public"."coupons"."deleted_at" IS '?芷??嚗??芷嚗?;



COMMENT ON COLUMN "public"."coupons"."total_limit" IS '蝮賢撐?訾?????恥?嗅?閮??撘菜嚗ULL 銵函內?⊿??潭嚗?;



CREATE OR REPLACE VIEW "public"."active_coupons" WITH ("security_invoker"='true') AS
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
    "updated_at",
    "total_limit"
   FROM "public"."coupons"
  WHERE ((("status")::"text" = 'active'::"text") AND (CURRENT_DATE >= ("valid_from")::"date") AND (CURRENT_DATE <= ("valid_until")::"date"));


ALTER VIEW "public"."active_coupons" OWNER TO "postgres";


COMMENT ON VIEW "public"."active_coupons" IS '???芣???View - ?芸??蕪???歇?芷?芣??賂?雿輻 SECURITY INVOKER 蝣箔? RLS 蝑甇?Ⅱ?';



CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "image_url" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "series_id" "uuid"
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


COMMENT ON TABLE "public"."announcements" IS '撱??頛芣銵?- ?冽擐?頛芣璈怠?';



COMMENT ON COLUMN "public"."announcements"."id" IS '撱?? ID (UUID)';



COMMENT ON COLUMN "public"."announcements"."title" IS '撱??璅?';



COMMENT ON COLUMN "public"."announcements"."image_url" IS '撱???? URL';



COMMENT ON COLUMN "public"."announcements"."sort_order" IS '????嚗?潭??唾矽?湛?';



COMMENT ON COLUMN "public"."announcements"."is_active" IS '?臬?';



COMMENT ON COLUMN "public"."announcements"."series_id" IS '??頂??ID嚗??誨??頝唾??唾府蝟餃???????;



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


COMMENT ON TABLE "public"."audit_logs" IS '???亥?銵?- 蝔賣餈質馱嚗?????閬?雿?撱箇??耨?嫘?扎澈摮矽?氬?閮嚗?;



COMMENT ON COLUMN "public"."audit_logs"."target_type" IS '?格?撖阡?憿?嚗roduct, client, order, tier, series, coupon, setting, etc.';



COMMENT ON COLUMN "public"."audit_logs"."target_id" IS '?格?撖阡? ID (UUID 頧 TEXT ?脣?)';



COMMENT ON COLUMN "public"."audit_logs"."action_type" IS '??憿?嚗reated (撱箇?), updated (?湔), deleted (?芷), stock_adjusted (摨怠?隤踵), comment_added (?啣???)';



COMMENT ON COLUMN "public"."audit_logs"."actor_id" IS '????ID (摰Ｘ?恣?)';



COMMENT ON COLUMN "public"."audit_logs"."actor_role" IS '??????(client ??admin)';



COMMENT ON COLUMN "public"."audit_logs"."actor_display_name" IS '???蝔勗翰??(?踹??芷撣唾?敺＊蝷箝?乩蝙?刻?';



COMMENT ON COLUMN "public"."audit_logs"."old_values" IS '霈????(JSONB ?澆?嚗? updated/deleted ????';



COMMENT ON COLUMN "public"."audit_logs"."new_values" IS '霈敺???(JSONB ?澆?嚗? created/updated ????';



COMMENT ON COLUMN "public"."audit_logs"."notes" IS '???酉 (憿?隤芣?)';



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


COMMENT ON TABLE "public"."backup_jobs" IS '?脩垢?遢閮?銵?;



COMMENT ON COLUMN "public"."backup_jobs"."id" IS '?臭?霅蝣?;



COMMENT ON COLUMN "public"."backup_jobs"."filename" IS '?遢瑼??迂嚗sale-backup-YYYYMMDD-HHMMSS.sql.gz嚗?;



COMMENT ON COLUMN "public"."backup_jobs"."file_size" IS '憯葬敺?獢之撠?bytes嚗?;



COMMENT ON COLUMN "public"."backup_jobs"."storage_provider" IS '?脣?雿蔭嚗cs ??vercel_blob嚗?;



COMMENT ON COLUMN "public"."backup_jobs"."storage_url" IS '?脩垢瑼? URL嚗CS: gs://bucket/path, Vercel: https://...嚗?;



COMMENT ON COLUMN "public"."backup_jobs"."backup_type" IS '?遢憿?嚗uto ??manual嚗?;



COMMENT ON COLUMN "public"."backup_jobs"."status" IS '?瑁????in_progress, success, failed嚗?;



COMMENT ON COLUMN "public"."backup_jobs"."metadata" IS '?遢???鞈?銵冽?????蝮桃?嚗?;



COMMENT ON COLUMN "public"."backup_jobs"."error_message" IS '憭望??隤方???;



COMMENT ON COLUMN "public"."backup_jobs"."created_by" IS '???遢?????芸??遢? NULL嚗?;



COMMENT ON COLUMN "public"."backup_jobs"."started_at" IS '?遢????';



COMMENT ON COLUMN "public"."backup_jobs"."completed_at" IS '?遢摰???';



COMMENT ON COLUMN "public"."backup_jobs"."created_at" IS '閮?撱箇???';



COMMENT ON COLUMN "public"."backup_jobs"."includes_storage" IS '?臬? Supabase Storage ??';



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


COMMENT ON TABLE "public"."categories" IS '????銵剁?摰儔????撅文?憿?憒ㄡ?憌?典?嚗?;



COMMENT ON COLUMN "public"."categories"."id" IS '?? ID嚗UID嚗?;



COMMENT ON COLUMN "public"."categories"."code" IS '??隞?Ⅳ嚗?-10 ?之撖怠?瘥?憒?DRK, SNK, DAI嚗?;



COMMENT ON COLUMN "public"."categories"."name" IS '???迂嚗??ㄡ?憌?';



COMMENT ON COLUMN "public"."categories"."description" IS '???膩';



COMMENT ON COLUMN "public"."categories"."status" IS '???active 憿舐內嚗nactive ?梯?';



COMMENT ON COLUMN "public"."categories"."sort_order" IS '????嚗摮?撠??嚗?;



COMMENT ON COLUMN "public"."categories"."created_at" IS '撱箇???';



COMMENT ON COLUMN "public"."categories"."updated_at" IS '?敺?唳???;



CREATE TABLE IF NOT EXISTS "public"."coupon_series_restrictions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coupon_id" "uuid" NOT NULL,
    "series_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."coupon_series_restrictions" OWNER TO "postgres";


COMMENT ON TABLE "public"."coupon_series_restrictions" IS '?芣??貊頂???嗉” - 憭?憭??航”嚗??嗅??摰??頂?雿輻';



COMMENT ON COLUMN "public"."coupon_series_restrictions"."coupon_id" IS '?芣???ID';



COMMENT ON COLUMN "public"."coupon_series_restrictions"."series_id" IS '??蝟餃? ID';



CREATE TABLE IF NOT EXISTS "public"."coupon_tier_restrictions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coupon_id" "uuid" NOT NULL,
    "tier_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."coupon_tier_restrictions" OWNER TO "postgres";


COMMENT ON TABLE "public"."coupon_tier_restrictions" IS '?芣??貊?蝝??嗉” - 憭?憭??航”嚗??嗅??摰??∠?蝝雿輻';



COMMENT ON COLUMN "public"."coupon_tier_restrictions"."coupon_id" IS '?芣???ID';



COMMENT ON COLUMN "public"."coupon_tier_restrictions"."tier_id" IS '?蝑? ID';



CREATE TABLE IF NOT EXISTS "public"."home_page_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "block_type" "text" NOT NULL,
    "config" "jsonb" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "home_page_blocks_block_type_check" CHECK (("block_type" = ANY (ARRAY['image_carousel'::"text", 'product_display'::"text", 'text_block'::"text"])))
);


ALTER TABLE "public"."home_page_blocks" OWNER TO "postgres";


COMMENT ON TABLE "public"."home_page_blocks" IS '擐?撱???憛”嚗?游??憚?准???蝷箝?摮?憛?';



COMMENT ON COLUMN "public"."home_page_blocks"."block_type" IS '?憛???image_carousel嚗??憚?哨??roduct_display嚗???蝷綽??ext_block嚗?摮?憛?';



COMMENT ON COLUMN "public"."home_page_blocks"."config" IS '?憛?蝵殷?JSONB嚗?靘?block_type 銝?蝯?';



COMMENT ON COLUMN "public"."home_page_blocks"."sort_order" IS '????嚗摮?撠???嚗?;



COMMENT ON COLUMN "public"."home_page_blocks"."is_active" IS '?臬?嚗????憛?憿舐內?典??堆?';



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


COMMENT ON TABLE "public"."order_coupons" IS '閮?芣??詨翰?扯” - 銝蝙??FK ??coupons嚗偶銋???鞈?嚗雿踹?鋡怠?歹?';



COMMENT ON COLUMN "public"."order_coupons"."order_id" IS '閮 ID';



COMMENT ON COLUMN "public"."order_coupons"."coupon_code" IS '?芣??訾誨蝣澆翰?改?憭批神嚗?;



COMMENT ON COLUMN "public"."order_coupons"."discount_type" IS '??孵?敹怎嚗ixed (?暸??) ??percentage (?曉?瘥???';



COMMENT ON COLUMN "public"."order_coupons"."discount_value" IS '??澆翰?改??暸??嚗摰?憿??曉?瘥????1-100嚗?;



COMMENT ON COLUMN "public"."order_coupons"."discount_amount" IS '撖阡????嚗??桃蜇憿?- ?敺?憿??桐?嚗T$嚗?;



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


COMMENT ON TABLE "public"."order_custom_fees" IS '閮?芾?鞎餌?嚗???鞎颯?鋆祥??憭?鞎颯蜇憿矽?渡?嚗?;



COMMENT ON COLUMN "public"."order_custom_fees"."id" IS '?芾?鞎餌?臭?霅蝣?(UUID)';



COMMENT ON COLUMN "public"."order_custom_fees"."order_id" IS '?撅祈???(FK: orders.id嚗ASCADE ?芷)';



COMMENT ON COLUMN "public"."order_custom_fees"."fee_name" IS '鞎餌?迂嚗?憒? ??鞎颯?鋆祥??憭?鞎鳴??憭?50 摮?嚗?;



COMMENT ON COLUMN "public"."order_custom_fees"."amount" IS '鞎餌??嚗迤???嗉祥????皜?嚗?憒? +50 = ??50 ??蝥祥嚗?100 = 皜? 100 ??';



COMMENT ON COLUMN "public"."order_custom_fees"."created_at" IS '鞎餌撱箇???';



COMMENT ON COLUMN "public"."order_custom_fees"."created_by" IS '撱箇???(FK: auth.users.id嚗虜?箇恣?)';



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


COMMENT ON TABLE "public"."order_items" IS '閮?敦銵?- 閮?瘥?閮??????漱?寞';



COMMENT ON COLUMN "public"."order_items"."id" IS '閮?敦?臭?霅蝣?(UUID)';



COMMENT ON COLUMN "public"."order_items"."order_id" IS '?撅祈???(FK: orders.id嚗ASCADE ?芷)';



COMMENT ON COLUMN "public"."order_items"."product_id" IS '?? ID嚗??NULL嚗?文????芸?閮剔 NULL嚗??桐?靽????迂敹怎嚗?;



COMMENT ON COLUMN "public"."order_items"."product_name_snapshot" IS '???迂敹怎 (?踹????芷敺瘜＊蝷箸風?脰???';



COMMENT ON COLUMN "public"."order_items"."deal_price" IS '?漱?寞 (銝?嗆???蝝?潘??冽閮?甇瑕)';



COMMENT ON COLUMN "public"."order_items"."quantity" IS '閮頃?賊?';



COMMENT ON COLUMN "public"."order_items"."subtotal" IS '撠? = deal_price ? quantity (??甈?嚗??閰Ｘ???';



COMMENT ON COLUMN "public"."order_items"."created_at" IS '?敦撱箇???';



COMMENT ON COLUMN "public"."order_items"."series_id_snapshot" IS '蝟餃? ID 敹怎嚗?澆?蝟餃??撽?嚗???斗?靽?嚗?;



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
    "content" "text",
    CONSTRAINT "order_timelines_action_type_check" CHECK (("action_type" = ANY (ARRAY['created'::"text", 'confirmed'::"text", 'status_updated'::"text", 'cancelled'::"text", 'comment'::"text", 'deleted'::"text", 'order_modified'::"text"]))),
    CONSTRAINT "order_timelines_actor_role_check" CHECK (("actor_role" = ANY (ARRAY['client'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."order_timelines" OWNER TO "postgres";


COMMENT ON TABLE "public"."order_timelines" IS '閮??甇瑕銵?- 蝔賣餈質馱????桃??雿?;



COMMENT ON COLUMN "public"."order_timelines"."id" IS '甇瑕閮??臭?霅蝣?(UUID)';



COMMENT ON COLUMN "public"."order_timelines"."order_id" IS '?撅祈???(FK: orders.id嚗ASCADE ?芷)';



COMMENT ON COLUMN "public"."order_timelines"."action_type" IS '??憿?: created (閮撱箇?), confirmed (閮蝣箄?嚗歇璉), status_updated (?????, cancelled (閮??), comment (??), deleted (閮?芷), order_modified (閮靽格)';



COMMENT ON COLUMN "public"."order_timelines"."actor_id" IS '????(FK: auth.users.id嚗?箏恥?嗆?蝞∠???';



COMMENT ON COLUMN "public"."order_timelines"."actor_role" IS '?????? client (摰Ｘ), admin (蝞∠???';



COMMENT ON COLUMN "public"."order_timelines"."old_status" IS '????(??status_updated ?閬?閮?????游?????';



COMMENT ON COLUMN "public"."order_timelines"."new_status" IS '?啁???(閮?????游?????';



COMMENT ON COLUMN "public"."order_timelines"."notes" IS '蝟餌絞???酉嚗????桀歇蝣箄????桀歇????';



COMMENT ON COLUMN "public"."order_timelines"."created_at" IS '????';



COMMENT ON COLUMN "public"."order_timelines"."modifications" IS '閮靽格閰單?嚗? action_type = ''order_modified'' ?蝙?剁?嚗摮耨?寧????祥?具?鞎颯?蝑?閮?JSONB ?澆?嚗?;



COMMENT ON COLUMN "public"."order_timelines"."content" IS '???批捆嚗? action_type = ''comment'' ?蝙?剁?';



CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" "text" NOT NULL,
    "user_id" "uuid",
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


COMMENT ON TABLE "public"."orders" IS '閮銝餉” - 閮?????桃??箸鞈?????;



COMMENT ON COLUMN "public"."orders"."id" IS '閮?臭?霅蝣?(UUID)';



COMMENT ON COLUMN "public"."orders"."order_number" IS '閮蝺刻? (?澆?: ORD-YYYYMMDD-XXXX嚗 generate_order_number() ?Ｙ?)';



COMMENT ON COLUMN "public"."orders"."user_id" IS '摰Ｘ ID嚗?閮?NULL嚗?文恥?嗅?閮靽?雿瘜???恥?塚?';



COMMENT ON COLUMN "public"."orders"."total_amount" IS '閮蝮賡?憿?(?啣撟???恍?鞎餉??芣??豢???';



COMMENT ON COLUMN "public"."orders"."status" IS '閮??? pending (敺Ⅱ隤?, confirmed (撌脩Ⅱ隤?, shipping (?箄疏銝?, completed (撌脣???, cancelled (撌脣?瘨?';



COMMENT ON COLUMN "public"."orders"."notes" IS '摰Ｘ?酉 (?憭?500 摮?靘?: ?????畾?瘙?';



COMMENT ON COLUMN "public"."orders"."created_at" IS '閮撱箇???';



COMMENT ON COLUMN "public"."orders"."updated_at" IS '?敺?唳???(??Trigger ?芸??湔)';



COMMENT ON COLUMN "public"."orders"."shipping_fee" IS '閮?祥??嚗遣蝡?敹怎?脣?嚗?摰Ｘ蝑????桅?憿?蝞?';



COMMENT ON CONSTRAINT "orders_status_check" ON "public"."orders" IS '閮???蝔?蝪∪???: pending ??shipping ??completed (?臬?瘨? pending?ancelled, shipping?ancelled)';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "name" "text" NOT NULL,
    "series_id" "uuid" NOT NULL,
    "description" "text",
    "retail_price" numeric(10,2) NOT NULL,
    "stock" integer DEFAULT 0 NOT NULL,
    "stock_status" "text" DEFAULT 'sufficient'::"text",
    "unit" "text" DEFAULT '隞?::"text" NOT NULL,
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


COMMENT ON TABLE "public"."products" IS '??銵剁??脣??????閮???蝺刻???蝔晞澈摮?潛?嚗?;



COMMENT ON COLUMN "public"."products"."id" IS '?? ID嚗UID嚗?;



COMMENT ON COLUMN "public"."products"."code" IS '??蝺刻?嚗?????澆?嚗??隞?Ⅳ]-[蝟餃?隞?Ⅳ]-[01]嚗? DRK-TEA-01嚗?;



COMMENT ON COLUMN "public"."products"."name" IS '???迂嚗??銝嚗?;



COMMENT ON COLUMN "public"."products"."series_id" IS '?撅祉頂??ID嚗?憛恬?';



COMMENT ON COLUMN "public"."products"."description" IS '???膩';



COMMENT ON COLUMN "public"."products"."retail_price" IS '?嗅?寞嚗?憛恬?- ?Ｗ??皞?潘????蝝?潔誑甇斤??;



COMMENT ON COLUMN "public"."products"."stock" IS '摨怠??賊?嚗?渲?摨怠?嚗?;



COMMENT ON COLUMN "public"."products"."stock_status" IS '摨怠????sufficient ?雲?ow 蝺撐?ut_of_stock 蝻箄疏嚗?撖阡?摨怠??賊??嚗?;



COMMENT ON COLUMN "public"."products"."unit" IS '?桐?嚗??辣?拳???';



COMMENT ON COLUMN "public"."products"."image_url" IS '???? URL';



COMMENT ON COLUMN "public"."products"."tags" IS '??璅惜???嚗? {"?梢", "?啣?", "??"}嚗?憭?5 ??;



COMMENT ON COLUMN "public"."products"."status" IS '???active 憿舐內嚗nactive ?梯?';



COMMENT ON COLUMN "public"."products"."created_at" IS '撱箇???';



COMMENT ON COLUMN "public"."products"."updated_at" IS '?敺?唳???;



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


COMMENT ON TABLE "public"."profiles" IS '雿輻?平???”嚗??auth.users嚗摮?璈?蝣潦??脯??∠?蝝?璆剖?鞈?';



COMMENT ON COLUMN "public"."profiles"."id" IS '雿輻??ID嚗???auth.users.id嚗?;



COMMENT ON COLUMN "public"."profiles"."phone" IS '???Ⅳ嚗恥?嗅?憛恬??冽?餃嚗?;



COMMENT ON COLUMN "public"."profiles"."email" IS '?餃??萎辣嚗恣?敹‵嚗?潛?伐?';



COMMENT ON COLUMN "public"."profiles"."role" IS '閫憿?嚗lient: 摰Ｘ, admin: 蝞∠??∴?';



COMMENT ON COLUMN "public"."profiles"."tier_id" IS '?蝑? ID嚗恥?嗅?憛恬?蝞∠??∪??NULL嚗?;



COMMENT ON COLUMN "public"."profiles"."created_at" IS '撱箇???';



COMMENT ON COLUMN "public"."profiles"."display_name" IS '憿舐內?梁迂 (摰Ｘ???摮?憒???';



COMMENT ON COLUMN "public"."profiles"."notes" IS '?酉嚗恣??舐嚗?;



COMMENT ON COLUMN "public"."profiles"."username" IS '蝞∠??∠?亙董??(?恣?雿輻嚗?-20 摮?嚗?撖怠?瘥??詨?+摨?)';



COMMENT ON COLUMN "public"."profiles"."address" IS '摰Ｘ撣貊?啣?嚗憛恬?';



COMMENT ON COLUMN "public"."profiles"."admin_notes" IS '蝞∠??∪?閮鳴??恣??航?嚗?;



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
    "color" character varying(7) DEFAULT '#94A3B8'::character varying,
    CONSTRAINT "check_series_code_format" CHECK ((("code")::"text" ~ '^[A-Z]{3,10}$'::"text")),
    CONSTRAINT "check_series_color_format" CHECK ((("color")::"text" ~ '^#[0-9A-Fa-f]{6}$'::"text")),
    CONSTRAINT "series_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."series" OWNER TO "postgres";


COMMENT ON COLUMN "public"."series"."id" IS '蝟餃? ID嚗UID嚗?;



COMMENT ON COLUMN "public"."series"."category_id" IS '?撅砍?憿?ID嚗??NULL嚗??嚗?;



COMMENT ON COLUMN "public"."series"."code" IS '蝟餃?隞?Ⅳ嚗?-10 ?之撖怠?瘥?憒?TEA, JUC嚗?;



COMMENT ON COLUMN "public"."series"."name" IS '蝟餃??迂嚗???蝎?蝟餃???';



COMMENT ON COLUMN "public"."series"."description" IS '蝟餃??膩';



COMMENT ON COLUMN "public"."series"."image_url" IS '蝟餃??? URL';



COMMENT ON COLUMN "public"."series"."status" IS '蝟餃????active 憿舐內嚗nactive ?梯?';



COMMENT ON COLUMN "public"."series"."sort_order" IS '????嚗摮?撠??嚗?;



COMMENT ON COLUMN "public"."series"."created_at" IS '撱箇???';



COMMENT ON COLUMN "public"."series"."updated_at" IS '?敺?唳???;



COMMENT ON COLUMN "public"."series"."color" IS '蝟餃?憿隞?Ⅳ嚗ex ?澆?嚗? #FBBF24嚗??UI 憿舐內嚗?;



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
    CONSTRAINT "system_settings_category_check" CHECK (("category" = ANY (ARRAY['general'::"text", 'branding'::"text", 'carousel'::"text", 'system'::"text", 'client_notifications'::"text"]))),
    CONSTRAINT "system_settings_value_type_check" CHECK (("value_type" = ANY (ARRAY['text'::"text", 'number'::"text", 'boolean'::"text", 'json'::"text", 'image_url'::"text"])))
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."system_settings" IS '蝟餌絞閮剖?銵?- Key-Value 璅∪??脣?嚗?游?蝔株?????;



COMMENT ON COLUMN "public"."system_settings"."key" IS '閮剖???(?臭?霅嚗? site_title)';



COMMENT ON COLUMN "public"."system_settings"."value" IS '閮剖???(TEXT 蝯曹??脣?嚗? value_type 閫??)';



COMMENT ON COLUMN "public"."system_settings"."value_type" IS '?潮???text (??), number (?詨?), boolean (撣?), json (JSON), image_url (?? URL)';



COMMENT ON COLUMN "public"."system_settings"."category" IS '閮剖?憿嚗eneral (銝??, branding (??), carousel (頛芣), system (蝟餌絞), client_notifications (摰Ｘ?)';



COMMENT ON COLUMN "public"."system_settings"."is_public" IS '?臬?祇? (true: 摰Ｘ?航??? false: ?恣??航???';



COMMENT ON COLUMN "public"."system_settings"."description" IS '閮剖?隤芣?嚗＊蝷箸蝞∠?隞嚗?;



COMMENT ON COLUMN "public"."system_settings"."updated_by" IS '?敺?啗?(蝞∠???ID)';



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


COMMENT ON TABLE "public"."tier_prices" IS '蝑??寞銵剁??脣?瘥??瘥??∠?蝝?撠??寞';



COMMENT ON COLUMN "public"."tier_prices"."id" IS '?寞閮? ID嚗UID嚗?;



COMMENT ON COLUMN "public"."tier_prices"."tier_id" IS '?蝑? ID';



COMMENT ON COLUMN "public"."tier_prices"."product_id" IS '?? ID';



COMMENT ON COLUMN "public"."tier_prices"."price" IS '閰脩?蝝????寞';



COMMENT ON COLUMN "public"."tier_prices"."created_at" IS '撱箇???';



COMMENT ON COLUMN "public"."tier_prices"."updated_at" IS '?敺?唳???;



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


COMMENT ON TABLE "public"."tiers" IS '?蝑?銵剁?摰儔?寧蝟餌絞?恥?嗥?蝝??嗅??潦??瑕?嚗??冽蝬?蝑??寞';



COMMENT ON COLUMN "public"."tiers"."id" IS '蝑? ID嚗UID嚗?;



COMMENT ON COLUMN "public"."tiers"."name" IS '蝑??迂嚗???柴?潦??瑕???';



COMMENT ON COLUMN "public"."tiers"."rank" IS '蝑???嚗摮?憭抒?蝝?擃?';



COMMENT ON COLUMN "public"."tiers"."created_at" IS '撱箇???';



COMMENT ON COLUMN "public"."tiers"."updated_at" IS '?敺?唳???;



COMMENT ON COLUMN "public"."tiers"."is_protected" IS '?臬?箏?靽風蝑?嚗?殷?嚗rue 銵函內甇斤?蝝??寞銝雿 retail_price';



COMMENT ON COLUMN "public"."tiers"."shipping_fee" IS '?箸?祥??嚗? 銵函內銝?祥嚗?;



COMMENT ON COLUMN "public"."tiers"."free_shipping_threshold" IS '皛輸????瑼鳴?NULL 銵函內銝?靘???靘?嚗遛 1000 ??嚗?;



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


COMMENT ON TABLE "public"."user_coupons" IS '摰Ｘ?芣??賊????” - 瘥活??撱箇?銝蝑????舀???芣??詨?甈⊿???;



COMMENT ON COLUMN "public"."user_coupons"."user_id" IS '摰Ｘ ID';



COMMENT ON COLUMN "public"."user_coupons"."coupon_id" IS '?芣???ID';



COMMENT ON COLUMN "public"."user_coupons"."claimed_at" IS '????';



COMMENT ON COLUMN "public"."user_coupons"."used_at" IS '雿輻??嚗ULL 銵函內?芯蝙?剁?';



COMMENT ON COLUMN "public"."user_coupons"."order_id" IS '雿輻?澆???殷?NULL 銵函內?芯蝙?剁?';



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



ALTER TABLE ONLY "public"."home_page_blocks"
    ADD CONSTRAINT "home_page_blocks_pkey" PRIMARY KEY ("id");



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
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_series_id_name_key" UNIQUE ("series_id", "name");



COMMENT ON CONSTRAINT "products_series_id_name_key" ON "public"."products" IS '???迂?典?蝟餃??批??銝嚗?閮曹??頂??????嚗?;



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



CREATE INDEX "idx_announcements_series_id" ON "public"."announcements" USING "btree" ("series_id");



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



CREATE INDEX "idx_home_blocks_active_sort" ON "public"."home_page_blocks" USING "btree" ("is_active", "sort_order");



CREATE INDEX "idx_home_blocks_type" ON "public"."home_page_blocks" USING "btree" ("block_type");



CREATE INDEX "idx_order_coupons_coupon_code" ON "public"."order_coupons" USING "btree" ("coupon_code");



CREATE INDEX "idx_order_coupons_order_id" ON "public"."order_coupons" USING "btree" ("order_id");



CREATE INDEX "idx_order_custom_fees_created_at" ON "public"."order_custom_fees" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_order_custom_fees_order_id" ON "public"."order_custom_fees" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_product_id" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "idx_order_items_series_id_snapshot" ON "public"."order_items" USING "btree" ("series_id_snapshot");



CREATE INDEX "idx_order_timelines_action_type" ON "public"."order_timelines" USING "btree" ("action_type") WHERE ("action_type" = 'comment'::"text");



CREATE INDEX "idx_order_timelines_created_at" ON "public"."order_timelines" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_order_timelines_modifications" ON "public"."order_timelines" USING "gin" ("modifications");



COMMENT ON INDEX "public"."idx_order_timelines_modifications" IS '???桐耨?寡底???亥岷嚗SONB GIN 蝝Ｗ?嚗?;



CREATE INDEX "idx_order_timelines_order_id" ON "public"."order_timelines" USING "btree" ("order_id");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_orders_number_pattern" ON "public"."orders" USING "gin" ("order_number" "public"."gin_trgm_ops");



COMMENT ON INDEX "public"."idx_orders_number_pattern" IS '???桃楊?芋蝟?撠?ILIKE ?亥岷嚗?;



CREATE UNIQUE INDEX "idx_orders_order_number" ON "public"."orders" USING "btree" ("order_number");



CREATE INDEX "idx_orders_pending_created" ON "public"."orders" USING "btree" ("created_at" DESC) WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_status_created" ON "public"."orders" USING "btree" ("status", "created_at" DESC);



COMMENT ON INDEX "public"."idx_orders_status_created" IS '???桀?銵函祟?貉???嚗tatus + created_at 蝯?嚗?;



CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_orders_user_status" ON "public"."orders" USING "btree" ("user_id", "status");



CREATE INDEX "idx_products_active_series_updated" ON "public"."products" USING "btree" ("series_id", "updated_at" DESC) WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_products_code" ON "public"."products" USING "btree" ("code");



COMMENT ON INDEX "public"."idx_products_code" IS '??蝺刻?蝝Ｗ? - ?冽?典???';



CREATE INDEX "idx_products_name" ON "public"."products" USING "btree" ("name");



COMMENT ON INDEX "public"."idx_products_name" IS '???迂蝝Ｗ? - ?冽?典???';



CREATE INDEX "idx_products_series_id" ON "public"."products" USING "btree" ("series_id");



CREATE INDEX "idx_products_series_id_name" ON "public"."products" USING "btree" ("series_id", "name");



COMMENT ON INDEX "public"."idx_products_series_id_name" IS '銴?蝝Ｗ?嚗頂??+ ???迂嚗?銝?扳炎?亥??亥岷嚗?;



CREATE INDEX "idx_products_series_status" ON "public"."products" USING "btree" ("series_id", "status");



CREATE INDEX "idx_products_status" ON "public"."products" USING "btree" ("status");



COMMENT ON INDEX "public"."idx_products_status" IS '????揣撘?- ?冽蝭拚 active ??';



CREATE INDEX "idx_products_status_updated_at" ON "public"."products" USING "btree" ("status", "updated_at" DESC);



COMMENT ON INDEX "public"."idx_products_status_updated_at" IS '??????湔??蝯?蝝Ｗ? - ?冽????”??';



CREATE INDEX "idx_products_stock_status" ON "public"."products" USING "btree" ("stock_status");



CREATE INDEX "idx_products_tags" ON "public"."products" USING "gin" ("tags");



COMMENT ON INDEX "public"."idx_products_tags" IS '??璅惜 GIN 蝝Ｗ? - ?舀????亥岷';



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



CREATE INDEX "idx_tier_prices_product_tier" ON "public"."tier_prices" USING "btree" ("product_id", "tier_id");



COMMENT ON INDEX "public"."idx_tier_prices_product_tier" IS '??蝝?潭閰ｇ?product_id + tier_id 銴??亥岷嚗?;



CREATE INDEX "idx_tier_prices_tier_id" ON "public"."tier_prices" USING "btree" ("tier_id");



CREATE INDEX "idx_tiers_rank" ON "public"."tiers" USING "btree" ("rank");



CREATE INDEX "idx_user_coupons_coupon_id" ON "public"."user_coupons" USING "btree" ("coupon_id");



CREATE INDEX "idx_user_coupons_used_at" ON "public"."user_coupons" USING "btree" ("used_at");



CREATE INDEX "idx_user_coupons_user_coupon" ON "public"."user_coupons" USING "btree" ("user_id", "coupon_id");



CREATE INDEX "idx_user_coupons_user_id" ON "public"."user_coupons" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trigger_auto_assign_series_color" BEFORE INSERT ON "public"."series" FOR EACH ROW EXECUTE FUNCTION "public"."auto_assign_series_color"();



COMMENT ON TRIGGER "trigger_auto_assign_series_color" ON "public"."series" IS '?啁頂?遣蝡??芸???憿';



CREATE OR REPLACE TRIGGER "trigger_auto_generate_product_code" BEFORE INSERT ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."auto_generate_product_code"();



COMMENT ON TRIGGER "trigger_auto_generate_product_code" ON "public"."products" IS '??撱箇??????楊??;



CREATE OR REPLACE TRIGGER "update_announcements_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_coupons_updated_at" BEFORE UPDATE ON "public"."coupons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_home_page_blocks_updated_at" BEFORE UPDATE ON "public"."home_page_blocks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_series_updated_at" BEFORE UPDATE ON "public"."series" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_system_settings_updated_at" BEFORE UPDATE ON "public"."system_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tier_prices_updated_at" BEFORE UPDATE ON "public"."tier_prices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tiers_updated_at" BEFORE UPDATE ON "public"."tiers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE SET NULL;



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
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



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



COMMENT ON POLICY "Admins can delete order custom fees" ON "public"."order_custom_fees" IS '蝞∠??∪?芷閮?芾?鞎餌';



CREATE POLICY "Admins can insert order coupons" ON "public"."order_coupons" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert order custom fees" ON "public"."order_custom_fees" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Admins can insert order custom fees" ON "public"."order_custom_fees" IS '蝞∠??∪?啣?閮?芾?鞎餌';



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



CREATE POLICY "Admins can update all user coupons" ON "public"."user_coupons" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Admins can update all user coupons" ON "public"."user_coupons" IS '蝞∠??∪?湔??恥?嗥??芣??貉????冽??閮???嚗?;



CREATE POLICY "Admins can update order custom fees" ON "public"."order_custom_fees" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Admins can update order custom fees" ON "public"."order_custom_fees" IS '蝞∠??∪靽格閮?芾?鞎餌';



CREATE POLICY "Admins can update orders" ON "public"."orders" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Admins can update orders" ON "public"."orders" IS '蝞∠??∪?湔?????;



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



COMMENT ON POLICY "Admins can view all order custom fees" ON "public"."order_custom_fees" IS '蝞∠??∪?亦?????桃??芾?鞎餌';



CREATE POLICY "Admins can view all order items" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Admins can view all order items" ON "public"."order_items" IS '蝞∠??∪?亦?????格?蝝?;



CREATE POLICY "Admins can view all order timelines" ON "public"."order_timelines" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Admins can view all order timelines" ON "public"."order_timelines" IS '蝞∠??∪?亦?????格?雿風??;



CREATE POLICY "Admins can view all orders" ON "public"."orders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Admins can view all orders" ON "public"."orders" IS '蝞∠??∪?亦??????;



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



COMMENT ON POLICY "Allow admin to manage categories" ON "public"."categories" IS '??閮梁恣??啣??耨?嫘?文?憿?;



CREATE POLICY "Allow admin to manage products" ON "public"."products" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Allow admin to manage products" ON "public"."products" IS '??閮梁恣??啣??耨?嫘?文???;



CREATE POLICY "Allow admin to manage profiles" ON "public"."profiles" TO "authenticated" USING (("id" = "auth"."uid"()));



COMMENT ON POLICY "Allow admin to manage profiles" ON "public"."profiles" IS '??閮曹耨?寡撌梁?鞈?嚗恣???雿輻 Admin Client 蝜? RLS嚗?;



CREATE POLICY "Allow admin to manage series" ON "public"."series" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Allow admin to manage series" ON "public"."series" IS '??閮梁恣??啣??耨?嫘?斤頂??;



CREATE POLICY "Allow admin to manage tier_prices" ON "public"."tier_prices" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Allow admin to manage tier_prices" ON "public"."tier_prices" IS '??閮梁恣??啣??耨?嫘?斤?蝝??;



CREATE POLICY "Allow admin to manage tiers" ON "public"."tiers" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



COMMENT ON POLICY "Allow admin to manage tiers" ON "public"."tiers" IS '??閮梁恣??啣??耨?嫘?斗??∠?蝝?;



CREATE POLICY "Allow admin to read all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



COMMENT ON POLICY "Allow admin to read all profiles" ON "public"."profiles" IS '?迂??歇隤??冽霈??Profiles嚗LS 撅斤?撖祇?嚗?? Server Action ?批嚗?;



CREATE POLICY "Allow authenticated users to read active series" ON "public"."series" FOR SELECT TO "authenticated" USING ((("status" = 'active'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



COMMENT ON POLICY "Allow authenticated users to read active series" ON "public"."series" IS '?迂摰Ｘ霈?暑頨頂??蝞∠??∪霈???頂??;



CREATE POLICY "Allow authenticated users to read categories" ON "public"."categories" FOR SELECT TO "authenticated" USING (true);



COMMENT ON POLICY "Allow authenticated users to read categories" ON "public"."categories" IS '?迂??歇隤?雿輻????憿?;



CREATE POLICY "Allow authenticated users to read tier_prices" ON "public"."tier_prices" FOR SELECT TO "authenticated" USING (true);



COMMENT ON POLICY "Allow authenticated users to read tier_prices" ON "public"."tier_prices" IS '?迂??歇隤?雿輻????蝝?潘?Server Action ??瞈橘?';



CREATE POLICY "Allow authenticated users to read tiers" ON "public"."tiers" FOR SELECT TO "authenticated" USING (true);



COMMENT ON POLICY "Allow authenticated users to read tiers" ON "public"."tiers" IS '?迂??歇隤?雿輻?????∠?蝝??冽?憿舐內蝑??賊?嚗?;



CREATE POLICY "Allow users to read active products in active series" ON "public"."products" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."series" "s"
  WHERE (("s"."id" = "products"."series_id") AND ((("products"."status" = 'active'::"text") AND ("s"."status" = 'active'::"text")) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))))))));



COMMENT ON POLICY "Allow users to read active products in active series" ON "public"."products" IS '?迂摰Ｘ霈?暑頨頂?葉?暑頨???蝞∠??∪霈??????;



CREATE POLICY "Allow users to read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



COMMENT ON POLICY "Allow users to read own profile" ON "public"."profiles" IS '?迂雿輻???撌梁? Profile 鞈?';



CREATE POLICY "Authenticated users can insert audit logs" ON "public"."audit_logs" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can insert timeline records" ON "public"."order_timelines" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



COMMENT ON POLICY "Authenticated users can insert timeline records" ON "public"."order_timelines" IS '撌脰?霅蝙?刻撱箇?甇瑕閮? (靽桀儔 RLS INSERT ?餅???)';



CREATE POLICY "Authenticated users can view series restrictions" ON "public"."coupon_series_restrictions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view tier restrictions" ON "public"."coupon_tier_restrictions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Clients can claim coupons" ON "public"."user_coupons" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Clients can create their own orders" ON "public"."orders" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



COMMENT ON POLICY "Clients can create their own orders" ON "public"."orders" IS '摰Ｘ?撱箇??芸楛????;



CREATE POLICY "Clients can insert items for their own orders" ON "public"."order_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



COMMENT ON POLICY "Clients can insert items for their own orders" ON "public"."order_items" IS '摰Ｘ撱箇?閮??啣??敦 (靽桀儔 RLS INSERT ?餅???)';



CREATE POLICY "Clients can insert order coupons for their own orders" ON "public"."order_coupons" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_coupons"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "Clients can mark their coupons as used" ON "public"."user_coupons" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



COMMENT ON POLICY "Clients can mark their coupons as used" ON "public"."user_coupons" IS '摰Ｘ?舀?閮撌梁??芣??貊撌脖蝙?剁?閮撱箇????used_at ??order_id嚗?;



CREATE POLICY "Clients can view active coupons" ON "public"."coupons" FOR SELECT TO "authenticated" USING (((("status")::"text" = 'active'::"text") AND (("now"() >= "valid_from") AND ("now"() <= "valid_until"))));



CREATE POLICY "Clients can view their order coupons" ON "public"."order_coupons" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_coupons"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "Clients can view their order custom fees" ON "public"."order_custom_fees" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_custom_fees"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



COMMENT ON POLICY "Clients can view their order custom fees" ON "public"."order_custom_fees" IS '摰Ｘ??亦??芸楛閮?閮祥??;



CREATE POLICY "Clients can view their order items" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



COMMENT ON POLICY "Clients can view their order items" ON "public"."order_items" IS '摰Ｘ??亦??芸楛閮??蝝?;



CREATE POLICY "Clients can view their order timelines" ON "public"."order_timelines" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_timelines"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



COMMENT ON POLICY "Clients can view their order timelines" ON "public"."order_timelines" IS '摰Ｘ??亦??芸楛閮??雿風??;



CREATE POLICY "Clients can view their own coupons" ON "public"."user_coupons" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Clients can view their own orders" ON "public"."orders" FOR SELECT USING (("user_id" = "auth"."uid"()));



COMMENT ON POLICY "Clients can view their own orders" ON "public"."orders" IS '摰Ｘ??亦??芸楛????;



CREATE POLICY "Public can view public settings" ON "public"."system_settings" FOR SELECT USING (("is_public" = true));



CREATE POLICY "admin_manage_announcements" ON "public"."announcements" TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")) WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "admin_select_all_announcements" ON "public"."announcements" FOR SELECT TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "allow_admin_to_manage_blocks" ON "public"."home_page_blocks" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "allow_authenticated_users_to_read_active_blocks" ON "public"."home_page_blocks" FOR SELECT TO "authenticated" USING (("is_active" = true));



ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."backup_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupon_series_restrictions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupon_tier_restrictions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."home_page_blocks" ENABLE ROW LEVEL SECURITY;


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


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_assign_series_color"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_assign_series_color"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_assign_series_color"() TO "service_role";



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



GRANT ALL ON FUNCTION "public"."get_active_tags"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_tags"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_tags"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_products_with_user_price"("p_series_id" "uuid", "p_tier_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_products_with_user_price"("p_series_id" "uuid", "p_tier_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_products_with_user_price"("p_series_id" "uuid", "p_tier_id" "uuid") TO "service_role";



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



GRANT ALL ON TABLE "public"."home_page_blocks" TO "anon";
GRANT ALL ON TABLE "public"."home_page_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."home_page_blocks" TO "service_role";



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







