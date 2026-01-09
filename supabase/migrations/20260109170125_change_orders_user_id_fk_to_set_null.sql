-- ============================================================================
-- Migration: 修改 orders.user_id 外鍵策略為 ON DELETE SET NULL
-- Date: 2026-01-09
-- Purpose: 允許刪除有訂單的客戶，訂單保留但 user_id 設為 NULL
-- ============================================================================
--
-- 背景說明:
-- 原本 orders.user_id 使用 ON DELETE RESTRICT，導致有訂單的客戶無法刪除。
-- 現在改為 ON DELETE SET NULL，允許刪除客戶，但訂單記錄保留，user_id 設為 NULL。
--
-- 影響範圍:
-- 1. orders.user_id 欄位允許 NULL 值
-- 2. 刪除客戶時，相關訂單的 user_id 會自動設為 NULL
-- 3. 優惠券記錄 (user_coupons) 會自動刪除（已使用 ON DELETE CASCADE）
--
-- 注意事項:
-- - 訂單相關 RLS Policy 需更新，允許 user_id IS NULL 的訂單被管理員查詢
-- - UI 需處理「已刪除客戶」的顯示邏輯
--
-- ============================================================================

-- ============================================================================
-- 1. 修改 orders.user_id 欄位允許 NULL
-- ============================================================================

ALTER TABLE orders
  ALTER COLUMN user_id DROP NOT NULL;

-- ============================================================================
-- 2. 移除舊的外鍵約束
-- ============================================================================

-- 查詢外鍵名稱（格式通常為 orders_user_id_fkey）
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'orders'::regclass
    AND confrelid = 'auth.users'::regclass
    AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'orders'::regclass AND attname = 'user_id')];

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE '已移除外鍵約束: %', constraint_name;
  END IF;
END $$;

-- ============================================================================
-- 3. 新增新的外鍵約束（ON DELETE SET NULL）
-- ============================================================================

ALTER TABLE orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- ============================================================================
-- 4. 更新索引（確保 NULL 值也被索引）
-- ============================================================================

-- 移除舊索引（若存在）
DROP INDEX IF EXISTS idx_orders_user_id;

-- 重新建立索引（包含 NULL 值）
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- ============================================================================
-- 5. 新增註解
-- ============================================================================

COMMENT ON COLUMN orders.user_id IS '客戶 ID（允許 NULL，刪除客戶後訂單保留但無法連結回客戶）';

-- ============================================================================
-- 6. 驗證 Migration
-- ============================================================================

-- 驗證外鍵約束已正確設定
DO $$
DECLARE
  fk_info RECORD;
BEGIN
  SELECT
    con.conname AS constraint_name,
    con.confdeltype AS on_delete_action
  INTO fk_info
  FROM pg_constraint con
  WHERE con.conrelid = 'orders'::regclass
    AND con.confrelid = 'auth.users'::regclass
    AND con.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'orders'::regclass AND attname = 'user_id')];

  IF fk_info.on_delete_action = 'n' THEN
    RAISE NOTICE '✅ Migration 成功: orders.user_id 外鍵已設為 ON DELETE SET NULL';
  ELSE
    RAISE EXCEPTION '❌ Migration 失敗: orders.user_id 外鍵設定不正確（expected: n, actual: %）', fk_info.on_delete_action;
  END IF;
END $$;
