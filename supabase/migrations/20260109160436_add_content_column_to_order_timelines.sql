-- ================================================================
-- Migration: 新增 order_timelines.content 欄位
-- Date: 2026-01-09
-- Feature: 007-system-enhancement (訂單留言功能)
-- ================================================================
--
-- 問題：order_timelines 表缺少 content 欄位，導致新增留言失敗
-- 解決：新增 content 欄位用於儲存留言內容
--
-- 欄位用途：
-- - notes: 系統操作備註（如「訂單已確認」、「訂單已取消」）
-- - content: 使用者留言內容（客戶與管理員的對話）
--
-- ================================================================

-- 新增 content 欄位
ALTER TABLE order_timelines
ADD COLUMN IF NOT EXISTS content TEXT;

-- 新增註解說明
COMMENT ON COLUMN order_timelines.content IS '留言內容（僅 action_type = ''comment'' 時使用）';
COMMENT ON COLUMN order_timelines.notes IS '系統操作備註（如「訂單已確認」、「訂單已取消」）';

-- 建立索引以加速留言查詢
CREATE INDEX IF NOT EXISTS idx_order_timelines_action_type
ON order_timelines(action_type)
WHERE action_type = 'comment';

-- 驗證欄位是否成功新增
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'order_timelines'
    AND column_name = 'content'
  ) THEN
    RAISE EXCEPTION 'Failed to add content column to order_timelines table';
  END IF;

  RAISE NOTICE '✅ Successfully added content column to order_timelines table';
END $$;
