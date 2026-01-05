-- Migration: 授予訂單相關 PostgreSQL Functions 的執行權限
-- Date: 2026-01-17
-- Description: 修復訂單確認功能，授予 authenticated 使用者執行訂單相關函式的權限

-- ============================================================
-- 授予 Function 執行權限給已認證使用者
-- ============================================================

-- 1. 產生訂單編號
GRANT EXECUTE ON FUNCTION generate_order_number() TO authenticated;

-- 2. 確認訂單並扣減庫存
GRANT EXECUTE ON FUNCTION confirm_order_and_deduct_stock(UUID, UUID) TO authenticated;

-- 3. 取消訂單並回補庫存
GRANT EXECUTE ON FUNCTION cancel_order_and_restore_stock(UUID, UUID) TO authenticated;

-- 4. 更新訂單狀態
GRANT EXECUTE ON FUNCTION update_order_status(UUID, TEXT, UUID) TO authenticated;

-- ============================================================
-- 註解說明
-- ============================================================

COMMENT ON FUNCTION generate_order_number() IS '產生唯一訂單編號 - 已授權給 authenticated';
COMMENT ON FUNCTION confirm_order_and_deduct_stock(UUID, UUID) IS '確認訂單並扣減庫存 (原子性操作) - 已授權給 authenticated';
COMMENT ON FUNCTION cancel_order_and_restore_stock(UUID, UUID) IS '取消訂單並回補庫存 (原子性操作) - 已授權給 authenticated';
COMMENT ON FUNCTION update_order_status(UUID, TEXT, UUID) IS '更新訂單狀態並記錄歷史 (原子性操作) - 已授權給 authenticated';

-- ============================================================
-- Migration 完成
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 完成：已授予訂單 Functions 執行權限給 authenticated 角色';
END $$;
