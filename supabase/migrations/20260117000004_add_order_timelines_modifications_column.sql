-- ================================================================
-- Migration: 新增 order_timelines.modifications 欄位
-- Timestamp: 20260117000004
-- Description: 修復訂單修改功能，新增 modifications JSONB 欄位儲存修改詳情
-- ================================================================
-- 問題說明:
--   update_order_with_modifications() 函數嘗試插入 modifications 欄位
--   但 order_timelines 表缺少此欄位，導致 INSERT 失敗
--   錯誤訊息: column "action" of relation "order_timelines" does not exist
--   （實際錯誤應為 column "modifications" does not exist，但錯誤訊息可能不準確）
-- ================================================================

-- 1. 新增 modifications 欄位（JSONB 類型，用於儲存修改詳情）
ALTER TABLE order_timelines
ADD COLUMN IF NOT EXISTS modifications JSONB;

-- 2. 更新欄位註解
COMMENT ON COLUMN order_timelines.modifications IS
  '訂單修改詳情（僅 action_type = ''order_modified'' 時使用），儲存修改的商品、費用、運費、優惠券等資訊（JSONB 格式）';

-- 3. 建立 GIN 索引以加速 JSONB 查詢（可選，但有助於後續分析）
CREATE INDEX IF NOT EXISTS idx_order_timelines_modifications
ON order_timelines USING gin(modifications);

COMMENT ON INDEX idx_order_timelines_modifications IS
  '加速訂單修改詳情的查詢（JSONB GIN 索引）';

-- ================================================================
-- Migration 完成
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration: add_order_timelines_modifications_column 執行完成';
  RAISE NOTICE '   - 已新增 order_timelines.modifications 欄位（JSONB）';
  RAISE NOTICE '   - update_order_with_modifications() 函數現在可正常執行';
  RAISE NOTICE '   - 已建立 GIN 索引以加速 JSONB 查詢';
END $$;
