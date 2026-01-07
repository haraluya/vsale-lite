-- ================================================================
-- Migration: M4 - 運費與自訂費用系統
-- Timestamp: 20260107130000
-- Description: 運費計算、自訂費用項目、訂單修改功能、訂單狀態流程簡化
-- ================================================================
-- 整合來源:
--   1. 20260122_add_shipping_features.sql - 運費設定與計算函數
--   2. 20260123_remove_confirmed_status.sql - 移除 confirmed 狀態，簡化流程
--   3. 20260124_extend_order_timelines.sql - 訂單修改歷程 (JSONB 欄位)
--   4. 20260125_fix_order_modifications_function.sql - 修改函數修復
--   5. 20260126_fix_cancel_order_allow_shipping.sql - 取消訂單修復
-- ================================================================
-- Dependencies:
--   - M1 (tiers, profiles) - 必須先執行
--   - M3 (orders, order_items, order_timelines) - 必須先執行
-- ================================================================

-- ================================================================
-- Part 1: 擴展 tiers 表 (運費設定)
-- ================================================================

-- 新增運費相關欄位
ALTER TABLE tiers
ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(10,2) DEFAULT 0 NOT NULL
  CHECK (shipping_fee >= 0);

ALTER TABLE tiers
ADD COLUMN IF NOT EXISTS free_shipping_threshold DECIMAL(10,2) DEFAULT NULL
  CHECK (free_shipping_threshold IS NULL OR free_shipping_threshold > 0);

-- 註解說明
COMMENT ON COLUMN tiers.shipping_fee IS '基本運費金額（0 表示不收運費）';
COMMENT ON COLUMN tiers.free_shipping_threshold IS '滿額免運門檻（NULL 表示不提供免運，例如：滿 1000 免運）';

-- ================================================================
-- Part 2: 擴展 orders 表 (訂單運費)
-- ================================================================

-- 新增運費欄位
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(10,2) DEFAULT 0 NOT NULL
  CHECK (shipping_fee >= 0);

-- 註解說明
COMMENT ON COLUMN orders.shipping_fee IS '訂單運費金額（建立時快照儲存，依客戶等級與訂單金額計算）';

-- ================================================================
-- Part 3: 建立 order_custom_fees 表 (自訂費用項目)
-- ================================================================

CREATE TABLE IF NOT EXISTS order_custom_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  fee_name TEXT NOT NULL CHECK (LENGTH(fee_name) > 0 AND LENGTH(fee_name) <= 50),
  amount DECIMAL(10,2) NOT NULL CHECK (amount <> 0),  -- 可為負數（減免）
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 確保同一訂單的費用名稱不重複
  UNIQUE(order_id, fee_name)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_order_custom_fees_order_id ON order_custom_fees(order_id);
CREATE INDEX IF NOT EXISTS idx_order_custom_fees_created_at ON order_custom_fees(created_at DESC);

-- 註解說明
COMMENT ON TABLE order_custom_fees IS '訂單自訂費用項目（如手續費、包裝費、額外運費、總額調整等）';
COMMENT ON COLUMN order_custom_fees.id IS '自訂費用唯一識別碼 (UUID)';
COMMENT ON COLUMN order_custom_fees.order_id IS '所屬訂單 (FK: orders.id，CASCADE 刪除)';
COMMENT ON COLUMN order_custom_fees.fee_name IS '費用名稱（例如: 手續費、包裝費、額外運費，最多 50 字元）';
COMMENT ON COLUMN order_custom_fees.amount IS '費用金額（正數=收費、負數=減免，例如: +50 = 收 50 元手續費，-100 = 減免 100 元）';
COMMENT ON COLUMN order_custom_fees.created_at IS '費用建立時間';
COMMENT ON COLUMN order_custom_fees.created_by IS '建立者 (FK: auth.users.id，通常為管理員)';

-- ================================================================
-- Part 4: 擴展 order_timelines 表 (訂單修改歷程)
-- ================================================================

-- 新增 modifications 欄位（JSONB）
-- 用於儲存訂單修改的詳細變更內容
ALTER TABLE order_timelines
ADD COLUMN IF NOT EXISTS modifications JSONB;

-- 新增 GIN 索引（優化 JSONB 查詢效能）
CREATE INDEX IF NOT EXISTS idx_order_timelines_modifications
  ON order_timelines USING GIN(modifications);

-- 擴展 action_type CHECK 約束（新增 order_modified）
ALTER TABLE order_timelines DROP CONSTRAINT IF EXISTS order_timelines_action_type_check;
ALTER TABLE order_timelines ADD CONSTRAINT order_timelines_action_type_check
  CHECK (action_type IN ('created', 'confirmed', 'status_updated', 'cancelled', 'comment', 'deleted', 'order_modified'));

-- 新增 JSONB 欄位註解
COMMENT ON COLUMN order_timelines.modifications IS '訂單修改詳情 (JSON 格式): 包含商品價格/數量變更、費用新增/移除、運費調整、優惠券移除等';

-- ================================================================
-- Part 5: 訂單狀態流程簡化 (移除 confirmed 狀態)
-- ================================================================

-- 1. 更新現有訂單狀態 (confirmed → shipping)
-- ⚠️ 重要：先更新資料，再修改約束，避免違反 CHECK 約束
UPDATE orders
SET status = 'shipping', updated_at = NOW()
WHERE status = 'confirmed';

-- 記錄更新數量（用於驗證）
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  IF v_updated_count > 0 THEN
    RAISE NOTICE '已將 % 筆訂單從 confirmed 狀態更新為 shipping', v_updated_count;
  END IF;
END $$;

-- 2. 修改 orders 表 CHECK 約束（移除 'confirmed'）
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'shipping', 'completed', 'cancelled'));

COMMENT ON CONSTRAINT orders_status_check ON orders IS
  '訂單狀態流程（簡化版）: pending → shipping → completed (可取消: pending→cancelled, shipping→cancelled)';

-- ================================================================
-- Part 6: PostgreSQL Functions - 運費計算
-- ================================================================

-- Function 1: 運費計算 (依客戶等級與訂單金額)
CREATE OR REPLACE FUNCTION calculate_shipping_fee(
  p_user_id UUID,
  p_subtotal DECIMAL
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
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

COMMENT ON FUNCTION calculate_shipping_fee(UUID, DECIMAL) IS '計算訂單運費（依客戶等級與商品總額，支援滿額免運）';

-- 授權給已認證用戶呼叫（客戶與管理員）
GRANT EXECUTE ON FUNCTION calculate_shipping_fee(UUID, DECIMAL) TO authenticated;

-- ================================================================
-- Part 7: PostgreSQL Functions - 訂單狀態管理 (簡化版)
-- ================================================================

-- Function 2: 標記出貨並扣減庫存 (取代舊的 confirm_order_and_deduct_stock)
CREATE OR REPLACE FUNCTION mark_order_as_shipping(
  p_order_id UUID,
  p_actor_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
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

COMMENT ON FUNCTION mark_order_as_shipping(UUID, UUID) IS
  '標記訂單為出貨中並扣減庫存（原子性操作），取代舊的 confirm_order_and_deduct_stock';

-- 授權給已認證用戶
GRANT EXECUTE ON FUNCTION mark_order_as_shipping(UUID, UUID) TO authenticated;

-- Function 3: 更新訂單狀態 (簡化版，移除 confirmed 狀態)
-- 覆寫 M3 建立的 update_order_status 函數
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_actor_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
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

COMMENT ON FUNCTION update_order_status(UUID, TEXT, UUID) IS
  '更新訂單狀態（簡化版，移除 confirmed 狀態）。允許的轉換：shipping→completed, pending→cancelled, shipping→cancelled（回補庫存）';

-- 授權給已認證用戶
GRANT EXECUTE ON FUNCTION update_order_status(UUID, TEXT, UUID) TO authenticated;

-- Function 4: 訂單取消並回補庫存 (修復版，支援 shipping → cancelled)
-- 覆寫 M3 建立的 cancel_order_and_restore_stock 函數
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cancel_order_and_restore_stock(UUID, UUID) IS '訂單取消並回補庫存 (原子性操作) - 支援 pending/shipping → cancelled';

-- ================================================================
-- Part 8: PostgreSQL Functions - 訂單修改功能
-- ================================================================

-- Function 5: 批次修改訂單 (修復版)
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

COMMENT ON FUNCTION update_order_with_modifications(UUID, JSONB, UUID) IS '[修復版] 批次修改訂單內容（商品、費用、運費、優惠券），確保原子性操作與正確錯誤處理';

-- 授權給已認證用戶
GRANT EXECUTE ON FUNCTION update_order_with_modifications(UUID, JSONB, UUID) TO authenticated;

-- ================================================================
-- Part 9: RLS Policies for order_custom_fees
-- ================================================================

ALTER TABLE order_custom_fees ENABLE ROW LEVEL SECURITY;

-- 客戶僅能查看自己的訂單費用
DROP POLICY IF EXISTS "Clients can view their order custom fees" ON order_custom_fees;
CREATE POLICY "Clients can view their order custom fees"
ON order_custom_fees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_custom_fees.order_id
    AND orders.user_id = auth.uid()
  )
);

-- 管理員可查看所有費用
DROP POLICY IF EXISTS "Admins can view all order custom fees" ON order_custom_fees;
CREATE POLICY "Admins can view all order custom fees"
ON order_custom_fees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 管理員可新增費用
DROP POLICY IF EXISTS "Admins can insert order custom fees" ON order_custom_fees;
CREATE POLICY "Admins can insert order custom fees"
ON order_custom_fees
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 管理員可修改費用
DROP POLICY IF EXISTS "Admins can update order custom fees" ON order_custom_fees;
CREATE POLICY "Admins can update order custom fees"
ON order_custom_fees
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 管理員可刪除費用
DROP POLICY IF EXISTS "Admins can delete order custom fees" ON order_custom_fees;
CREATE POLICY "Admins can delete order custom fees"
ON order_custom_fees
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ================================================================
-- Part 10: Policy 註解
-- ================================================================

COMMENT ON POLICY "Clients can view their order custom fees" ON order_custom_fees IS '客戶僅能查看自己訂單的自訂費用';
COMMENT ON POLICY "Admins can view all order custom fees" ON order_custom_fees IS '管理員可查看所有訂單的自訂費用';
COMMENT ON POLICY "Admins can insert order custom fees" ON order_custom_fees IS '管理員可新增訂單自訂費用';
COMMENT ON POLICY "Admins can update order custom fees" ON order_custom_fees IS '管理員可修改訂單自訂費用';
COMMENT ON POLICY "Admins can delete order custom fees" ON order_custom_fees IS '管理員可刪除訂單自訂費用';

-- ================================================================
-- Migration 完成
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration M4 (運費與自訂費用系統) 執行完成';
  RAISE NOTICE '   - 已擴展 tiers 表: 新增 shipping_fee, free_shipping_threshold';
  RAISE NOTICE '   - 已擴展 orders 表: 新增 shipping_fee';
  RAISE NOTICE '   - 已建立 order_custom_fees 表（自訂費用項目）';
  RAISE NOTICE '   - 已擴展 order_timelines 表: 新增 modifications (JSONB)';
  RAISE NOTICE '   - 已移除 confirmed 訂單狀態（簡化流程: pending → shipping → completed）';
  RAISE NOTICE '   - 已建立 5 個 PostgreSQL Functions';
  RAISE NOTICE '   - 已建立 5 個 RLS Policies (order_custom_fees)';
  RAISE NOTICE '   - 已建立 3 個索引';
  RAISE NOTICE '   ';
  RAISE NOTICE '整合檔案:';
  RAISE NOTICE '   1. 20260122_add_shipping_features.sql - 運費設定與計算函數';
  RAISE NOTICE '   2. 20260123_remove_confirmed_status.sql - 移除 confirmed 狀態';
  RAISE NOTICE '   3. 20260124_extend_order_timelines.sql - 訂單修改歷程';
  RAISE NOTICE '   4. 20260125_fix_order_modifications_function.sql - 修改函數修復';
  RAISE NOTICE '   5. 20260126_fix_cancel_order_allow_shipping.sql - 取消訂單修復';
  RAISE NOTICE '   ';
  RAISE NOTICE '訂單狀態流程（簡化版）:';
  RAISE NOTICE '   - pending → shipping → completed';
  RAISE NOTICE '   - pending → cancelled (無需回補庫存)';
  RAISE NOTICE '   - shipping → cancelled (回補庫存)';
END $$;
