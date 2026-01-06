-- ========================================
-- Rollback Script: 訂單修改歷程擴展
-- ========================================
-- Migration: 20260124_extend_order_timelines.sql
-- 建立日期: 2026-01-06
--
-- ⚠️ 警告: 此腳本會刪除訂單修改功能與相關歷程記錄
-- ⚠️ 執行前請先備份資料庫！
--
-- 使用方式:
-- psql -h <host> -p <port> -U postgres -d postgres -f rollback/03_rollback_order_modifications.sql
--
-- ========================================

BEGIN;

-- 1. 刪除 update_order_with_modifications 函數
DROP FUNCTION IF EXISTS update_order_with_modifications(UUID, JSONB, UUID);

-- 2. 移除 order_timelines 表的 modifications 欄位
ALTER TABLE order_timelines DROP COLUMN IF EXISTS modifications;

-- 3. 恢復 action_type CHECK 約束（移除 order_modified）
ALTER TABLE order_timelines DROP CONSTRAINT IF EXISTS order_timelines_action_type_check;
ALTER TABLE order_timelines ADD CONSTRAINT order_timelines_action_type_check
  CHECK (action_type IN ('created', 'status_changed', 'cancelled', 'comment'));

-- 4. 刪除 JSONB 索引
DROP INDEX IF EXISTS idx_order_timelines_modifications;

-- 5. 驗證回滾結果
DO $$
BEGIN
  -- 檢查 modifications 欄位是否已刪除
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'order_timelines' AND column_name = 'modifications'
  ) THEN
    RAISE EXCEPTION 'order_timelines.modifications 欄位刪除失敗';
  END IF;

  -- 檢查 action_type 是否不包含 order_modified
  IF EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'order_timelines_action_type_check'
      AND consrc LIKE '%order_modified%'
  ) THEN
    RAISE EXCEPTION 'order_timelines_action_type_check 約束恢復失敗';
  END IF;

  -- 檢查 update_order_with_modifications 函數是否已刪除
  IF EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'update_order_with_modifications'
  ) THEN
    RAISE EXCEPTION 'update_order_with_modifications 函數刪除失敗';
  END IF;

  -- 檢查索引是否已刪除
  IF EXISTS (
    SELECT FROM pg_indexes
    WHERE indexname = 'idx_order_timelines_modifications'
  ) THEN
    RAISE EXCEPTION 'idx_order_timelines_modifications 索引刪除失敗';
  END IF;

  RAISE NOTICE '訂單修改歷程功能回滾成功！';
END;
$$;

COMMIT;

-- ========================================
-- 回滾完成檢查清單
-- ========================================
--
-- [ ] 1. 確認 order_timelines.modifications 欄位已刪除
-- [ ] 2. 確認 order_timelines_action_type_check 約束不包含 order_modified
-- [ ] 3. 確認 update_order_with_modifications 函數已刪除
-- [ ] 4. 確認 idx_order_timelines_modifications 索引已刪除
-- [ ] 5. 前端程式碼已回滾（移除訂單編輯器與修改歷程顯示器）
-- [ ] 6. Server Actions 已回滾（移除 updateOrderDetails）
-- [ ] 7. TypeScript 型別定義已回滾（移除 OrderModifications 型別）
-- [ ] 8. Zod Schema 已回滾（移除 orderModificationsSchema）
-- [ ] 9. 現有訂單歷史記錄完整（comment 與 status_changed 記錄未受影響）
--
-- ========================================
