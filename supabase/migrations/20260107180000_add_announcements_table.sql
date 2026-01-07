-- =====================================================
-- Migration: 新增 announcements 表（廣告輪播系統）
-- Feature: 007-system-enhancement (US4)
-- Date: 2026-01-07
-- Description: 補上在 012-migration-consolidation 時遺漏的 announcements 表
-- =====================================================

BEGIN;

-- =====================================================
-- 1. 建立 announcements 表
-- =====================================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 註解
COMMENT ON TABLE announcements IS '廣告輪播表 - 用於首頁輪播橫幅';
COMMENT ON COLUMN announcements.id IS '廣告 ID (UUID)';
COMMENT ON COLUMN announcements.title IS '廣告標題';
COMMENT ON COLUMN announcements.image_url IS '廣告圖片 URL';
COMMENT ON COLUMN announcements.link_url IS '點擊連結（選填）';
COMMENT ON COLUMN announcements.sort_order IS '排序順序（用於拖曳調整）';
COMMENT ON COLUMN announcements.is_active IS '是否啟用';

-- =====================================================
-- 2. 建立索引
-- =====================================================
-- 廣告輪播查詢索引（僅啟用的廣告，依排序順序）
CREATE INDEX IF NOT EXISTS idx_announcements_active_sort
  ON announcements(is_active, sort_order)
  WHERE is_active = true;

-- =====================================================
-- 3. 啟用 RLS
-- =====================================================
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. 建立 RLS 策略
-- =====================================================

-- 所有使用者（包含未登入）可查詢啟用的廣告
DROP POLICY IF EXISTS "public_select_active_announcements" ON announcements;
CREATE POLICY "public_select_active_announcements" ON announcements
  FOR SELECT
  TO public
  USING (is_active = true);

-- 管理員可查詢所有廣告
DROP POLICY IF EXISTS "admin_select_all_announcements" ON announcements;
CREATE POLICY "admin_select_all_announcements" ON announcements
  FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- 管理員可管理廣告（新增、編輯、刪除）
DROP POLICY IF EXISTS "admin_manage_announcements" ON announcements;
CREATE POLICY "admin_manage_announcements" ON announcements
  FOR ALL
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- =====================================================
-- 5. 建立 Trigger（自動更新 updated_at）
-- =====================================================
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
