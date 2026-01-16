-- ================================================================
-- Migration: 新增 order_timelines.action_type 的 'order_modified' 選項
-- Timestamp: 20260116162814
-- Description: 修復訂單修改功能的錯誤，新增缺少的 action_type
-- ================================================================
-- 問題說明:
--   update_order_with_modifications() 函數使用 'order_modified' action_type
--   但 order_timelines 表的 CHECK 約束不包含此值，導致 INSERT 失敗
-- ================================================================

-- 1. 刪除舊的 CHECK 約束
ALTER TABLE order_timelines
DROP CONSTRAINT IF EXISTS order_timelines_action_type_check;

-- 2. 新增包含 'order_modified' 的 CHECK 約束
ALTER TABLE order_timelines
ADD CONSTRAINT order_timelines_action_type_check
CHECK (action_type IN (
  'created',          -- 訂單建立
  'confirmed',        -- 訂單確認（保留以相容舊版，實際已棄用）
  'status_updated',   -- 狀態變更
  'cancelled',        -- 訂單取消
  'comment',          -- 留言
  'deleted',          -- 訂單刪除
  'order_modified'    -- 訂單修改（批次修改商品、費用、運費、優惠券）
));

-- 3. 更新註解
COMMENT ON COLUMN order_timelines.action_type IS
  '操作類型: created (訂單建立), confirmed (訂單確認，已棄用), status_updated (狀態變更), cancelled (訂單取消), comment (留言), deleted (訂單刪除), order_modified (訂單修改)';

-- ================================================================
-- Migration 完成
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration: add_order_modified_action_type 執行完成';
  RAISE NOTICE '   - 已新增 order_timelines.action_type CHECK 約束選項: order_modified';
  RAISE NOTICE '   - update_order_with_modifications() 函數現在可正常執行';
END $$;
