-- ============================================================================
-- 站點 2 & 3 手動執行 SQL
-- Migration: 20260130114619_fix_combo_deals_snapshot_column_name.sql
-- Date: 2026-01-30
--
-- ⚠️ 本檔案用於站點 2 和站點 3 的手動 Migration 同步
-- ⚠️ 請在對應站點的 Supabase Dashboard SQL Editor 中執行
--
-- 站點 2 Dashboard: https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs/sql/new
-- 站點 3 Dashboard: https://supabase.com/dashboard/project/dewhcpfzrzewgknaqzwy/sql/new
--
-- 或使用 CLI：
-- supabase link --project-ref rdyvmgomjdglflrcfijs && supabase db execute --file supabase/migrations/20260130114619_fix_combo_deals_snapshot_column_name.sql
-- supabase link --project-ref dewhcpfzrzewgknaqzwy && supabase db execute --file supabase/migrations/20260130114619_fix_combo_deals_snapshot_column_name.sql
-- ============================================================================

-- ============================================================================
-- 1. 修復 mark_order_as_shipping：使用正確的欄位名稱
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."mark_order_as_shipping"("p_order_id" "uuid", "p_actor_id" "uuid")
RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_status TEXT;
  v_item RECORD;
  v_combo_item RECORD;
  v_selected_product JSONB;
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

  -- 1️⃣ 扣減普通商品庫存（支援負庫存）
  FOR v_item IN
    SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
  LOOP
    UPDATE products SET stock = stock - v_item.quantity WHERE id = v_item.product_id;
  END LOOP;

  -- 2️⃣ 扣減組合優惠商品庫存（支援負庫存）
  -- ✅ 修復：使用正確的欄位名稱 combo_deal_snapshot
  FOR v_combo_item IN
    SELECT combo_deal_snapshot FROM order_combo_deal_items WHERE order_id = p_order_id
  LOOP
    -- 遍歷 combo_deal_snapshot.selectedProducts 陣列
    FOR v_selected_product IN
      SELECT * FROM jsonb_array_elements(v_combo_item.combo_deal_snapshot->'selectedProducts')
    LOOP
      -- 扣減庫存
      UPDATE products
      SET stock = stock - (v_selected_product->>'quantity')::INTEGER
      WHERE id = (v_selected_product->>'product_id')::UUID;
    END LOOP;
  END LOOP;

  -- 3️⃣ 更新訂單狀態
  UPDATE orders SET status = 'shipping', updated_at = NOW() WHERE id = p_order_id;

  -- 4️⃣ 記錄操作歷史
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, old_status, new_status)
  VALUES (p_order_id, 'status_updated', p_actor_id, 'admin', 'pending', 'shipping');

  RETURN QUERY SELECT TRUE, '訂單已標記為出貨中，庫存已扣減（含組合優惠商品）';
END;
$$;

COMMENT ON FUNCTION "public"."mark_order_as_shipping"("p_order_id" "uuid", "p_actor_id" "uuid") IS '標記訂單為出貨中並扣減庫存（原子性操作），包含組合優惠商品庫存';

-- ============================================================================
-- 2. 修復 cancel_order_and_restore_stock：使用正確的欄位名稱
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."cancel_order_and_restore_stock"("p_order_id" "uuid", "p_actor_id" "uuid")
RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_combo_item RECORD;
  v_selected_product JSONB;
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
    -- 3.1️⃣ 回補普通商品庫存
    FOR v_item IN
      SELECT * FROM order_items WHERE order_id = p_order_id
    LOOP
      UPDATE products
      SET stock = stock + v_item.quantity
      WHERE id = v_item.product_id;
    END LOOP;

    -- 3.2️⃣ 回補組合優惠商品庫存
    -- ✅ 修復：使用正確的欄位名稱 combo_deal_snapshot
    FOR v_combo_item IN
      SELECT combo_deal_snapshot FROM order_combo_deal_items WHERE order_id = p_order_id
    LOOP
      -- 遍歷 combo_deal_snapshot.selectedProducts 陣列
      FOR v_selected_product IN
        SELECT * FROM jsonb_array_elements(v_combo_item.combo_deal_snapshot->'selectedProducts')
      LOOP
        -- 回補庫存
        UPDATE products
        SET stock = stock + (v_selected_product->>'quantity')::INTEGER
        WHERE id = (v_selected_product->>'product_id')::UUID;
      END LOOP;
    END LOOP;
  END IF;

  -- 4. 退還優惠券（重置 used_at 與 order_id，讓客戶可再次使用）
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
      WHEN v_order.status = 'shipping' THEN '訂單已取消，庫存已回補（含組合優惠商品），優惠券已退還'
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
$$;

COMMENT ON FUNCTION "public"."cancel_order_and_restore_stock"("p_order_id" "uuid", "p_actor_id" "uuid") IS '訂單取消並回補庫存與優惠券 (原子性操作) - 支援 pending/shipping → cancelled，包含組合優惠商品庫存';

-- ============================================================================
-- 完成
-- ============================================================================
