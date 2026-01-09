-- Migration: 補充整合時遺漏的欄位
-- Date: 2026-01-09
-- Description: 整合 Migration 時遺漏了以下欄位，此 Migration 補上：
--   - profiles.address, profiles.admin_notes (Feature 007)
--   - order_timelines.content (Feature 007 - 訂單留言功能)
--   - order_timelines.modifications (Feature 011 - 訂單修改歷程)

-- =====================================================
-- 1. 擴充 profiles 表 (Feature 007 - 客戶資訊完整化)
-- =====================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

COMMENT ON COLUMN profiles.address IS '客戶常用地址（選填）';
COMMENT ON COLUMN profiles.admin_notes IS '管理員備註（僅管理員可見）';

-- =====================================================
-- 2. 擴充 order_timelines 表 (Feature 007, 011)
-- =====================================================
-- 2.1 新增 content 欄位（Feature 007 - 訂單留言內容）
ALTER TABLE order_timelines
  ADD COLUMN IF NOT EXISTS content TEXT;

COMMENT ON COLUMN order_timelines.content IS '留言內容（當 action_type = comment 時使用）';

-- 2.2 新增 modifications 欄位（Feature 011 - 訂單修改歷程）
ALTER TABLE order_timelines
  ADD COLUMN IF NOT EXISTS modifications JSONB;

COMMENT ON COLUMN order_timelines.modifications IS '訂單修改內容（當 action_type = order_modified 時使用，JSONB 格式）';

-- 2.3 更新 action_type 約束（新增 order_modified）
ALTER TABLE order_timelines DROP CONSTRAINT IF EXISTS order_timelines_action_type_check;
ALTER TABLE order_timelines ADD CONSTRAINT order_timelines_action_type_check
  CHECK (action_type IN ('created', 'confirmed', 'status_updated', 'cancelled', 'comment', 'deleted', 'order_modified'));

-- =====================================================
-- 3. 遷移既有資料（若有）
-- =====================================================
-- 將 notes 資料遷移到 content（若 content 為空）
UPDATE order_timelines SET content = notes WHERE notes IS NOT NULL AND content IS NULL;
