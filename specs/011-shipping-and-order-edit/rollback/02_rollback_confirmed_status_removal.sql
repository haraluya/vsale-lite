-- ========================================
-- Rollback Script: 移除 confirmed 狀態
-- ========================================
-- Migration: 20260123_remove_confirmed_status.sql
-- 建立日期: 2026-01-06
--
-- ⚠️ 警告: 此腳本會恢復 confirmed 狀態與舊的狀態流程
-- ⚠️ 執行前請先備份資料庫！
--
-- 使用方式:
-- psql -h <host> -p <port> -U postgres -d postgres -f rollback/02_rollback_confirmed_status_removal.sql
--
-- ========================================

BEGIN;

-- 1. 恢復 CHECK 約束（包含 confirmed）
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'shipping', 'completed', 'cancelled'));

-- 2. 刪除新的 Functions
DROP FUNCTION IF EXISTS mark_order_as_shipping(UUID, UUID);
DROP FUNCTION IF EXISTS update_order_status(UUID, TEXT, UUID);

-- 3. 恢復舊的 confirm_order_and_deduct_stock 函數
-- 注意：此函數邏輯需從備份還原，以下為示例
CREATE OR REPLACE FUNCTION confirm_order_and_deduct_stock(p_order_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
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
    RETURN QUERY SELECT FALSE, '僅待確認訂單可進行確認操作';
    RETURN;
  END IF;

  -- 扣減庫存（原子性操作）
  FOR v_item IN
    SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
  LOOP
    -- 支援負庫存（不檢查 stock >= 0）
    UPDATE products SET stock = stock - v_item.quantity WHERE id = v_item.product_id;
  END LOOP;

  -- 更新訂單狀態為 confirmed
  UPDATE orders SET status = 'confirmed', updated_at = NOW() WHERE id = p_order_id;

  -- 記錄操作歷史
  INSERT INTO order_timelines (order_id, action_type, old_status, new_status)
  VALUES (p_order_id, 'status_changed', 'pending', 'confirmed');

  RETURN QUERY SELECT TRUE, '訂單已確認，庫存已扣減';
END;
$$;

-- 4. 恢復舊的 update_order_status 函數（包含 confirmed 邏輯）
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_actor_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_status TEXT;
BEGIN
  -- 檢查訂單
  SELECT status INTO v_old_status FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_old_status IS NULL THEN
    RETURN QUERY SELECT FALSE, '訂單不存在';
    RETURN;
  END IF;

  -- 驗證狀態流程
  IF v_old_status = 'confirmed' AND p_new_status = 'shipping' THEN
    -- 允許：confirmed → shipping
    NULL;
  ELSIF v_old_status = 'shipping' AND p_new_status = 'completed' THEN
    -- 允許：shipping → completed
    NULL;
  ELSIF v_old_status = 'confirmed' AND p_new_status = 'cancelled' THEN
    -- 允許：confirmed → cancelled（需回補庫存）
    DECLARE
      v_item RECORD;
    BEGIN
      FOR v_item IN
        SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
      LOOP
        UPDATE products SET stock = stock + v_item.quantity WHERE id = v_item.product_id;
      END LOOP;
    END;
  ELSE
    RETURN QUERY SELECT FALSE, '不允許的狀態轉換';
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

-- 5. 更新現有訂單狀態（shipping → confirmed）
-- 注意：此步驟需根據業務需求決定是否執行
-- UPDATE orders SET status = 'confirmed' WHERE status = 'shipping';

-- 6. 驗證回滾結果
DO $$
BEGIN
  -- 檢查 CHECK 約束是否包含 confirmed
  IF NOT EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'orders_status_check'
      AND consrc LIKE '%confirmed%'
  ) THEN
    RAISE WARNING 'orders_status_check 約束可能未正確恢復';
  END IF;

  -- 檢查 confirm_order_and_deduct_stock 函數是否存在
  IF NOT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'confirm_order_and_deduct_stock'
  ) THEN
    RAISE EXCEPTION 'confirm_order_and_deduct_stock 函數恢復失敗';
  END IF;

  -- 檢查新函數是否已刪除
  IF EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'mark_order_as_shipping'
  ) THEN
    RAISE EXCEPTION 'mark_order_as_shipping 函數刪除失敗';
  END IF;

  RAISE NOTICE 'confirmed 狀態回滾成功！';
END;
$$;

COMMIT;

-- ========================================
-- 回滾完成檢查清單
-- ========================================
--
-- [ ] 1. 確認 orders_status_check 約束包含 confirmed
-- [ ] 2. 確認 confirm_order_and_deduct_stock 函數已恢復
-- [ ] 3. 確認 mark_order_as_shipping 與 update_order_status 新版本已刪除
-- [ ] 4. 前端程式碼已回滾（「確認訂單」按鈕 vs 「標記出貨」按鈕）
-- [ ] 5. Server Actions 已回滾（confirmOrder vs markAsShipping）
-- [ ] 6. TypeScript 型別定義已回滾（OrderStatus 型別）
-- [ ] 7. 現有訂單狀態正確（根據業務需求決定是否轉換 shipping → confirmed）
--
-- ========================================
