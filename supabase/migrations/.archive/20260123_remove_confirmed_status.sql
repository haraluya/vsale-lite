-- =====================================================================
-- Migration: 移除 confirmed 訂單狀態
-- Feature: 011-shipping-and-order-edit (US6 - 訂單狀態流程調整)
-- Date: 2026-01-06
-- Description: 簡化訂單流程，將庫存扣減時機移至出貨階段
-- =====================================================================

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
  RAISE NOTICE '已將 % 筆訂單從 confirmed 狀態更新為 shipping', v_updated_count;
END $$;

-- 2. 修改 orders 表 CHECK 約束（移除 'confirmed'）
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'shipping', 'completed', 'cancelled'));

COMMENT ON CONSTRAINT orders_status_check ON orders IS
  '訂單狀態流程: pending → shipping → completed (可取消: pending→cancelled, shipping→cancelled)';

-- 3. 刪除舊的 confirm_order_and_deduct_stock 函數
-- 此函數在確認訂單時扣減庫存，新流程改為出貨時扣減
DROP FUNCTION IF EXISTS confirm_order_and_deduct_stock(UUID);

DO $$
BEGIN
  RAISE NOTICE '已刪除 confirm_order_and_deduct_stock 函數';
END $$;

-- 4. 建立新函數：標記出貨並扣減庫存
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
  VALUES (p_order_id, 'status_changed', p_actor_id, 'admin', 'pending', 'shipping');

  RETURN QUERY SELECT TRUE, '訂單已標記為出貨中，庫存已扣減';
END;
$$;

COMMENT ON FUNCTION mark_order_as_shipping(UUID, UUID) IS
  '標記訂單為出貨中並扣減庫存（原子性操作），取代舊的 confirm_order_and_deduct_stock';

-- 5. 建立新的 update_order_status 函數（簡化版）
-- 原函數支援 confirmed 狀態，新版本移除此狀態並簡化邏輯
DROP FUNCTION IF EXISTS update_order_status(UUID, TEXT, UUID);

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
  VALUES (p_order_id, 'status_changed', p_actor_id, 'admin', v_old_status, p_new_status);

  RETURN QUERY SELECT TRUE, '訂單狀態已更新';
END;
$$;

COMMENT ON FUNCTION update_order_status(UUID, TEXT, UUID) IS
  '更新訂單狀態（簡化版，移除 confirmed 狀態）。允許的轉換：shipping→completed, pending→cancelled, shipping→cancelled（回補庫存）';

-- =====================================================================
-- Migration 完成
-- =====================================================================
-- 驗證步驟：
-- 1. 確認所有 confirmed 訂單已轉為 shipping:
--    SELECT COUNT(*) FROM orders WHERE status = 'shipping';
-- 2. 確認 orders.status CHECK 約束正確：
--    SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conrelid = 'orders'::regclass AND conname = 'orders_status_check';
-- 3. 測試新函數：
--    SELECT * FROM mark_order_as_shipping('<order_id>', '<admin_user_id>');
-- =====================================================================
