-- =====================================================
-- Migration: 新增備份包含圖片選項
-- Feature: 015-cloud-backup
-- Created: 2026-01-09
-- =====================================================

-- 擴充 backup_jobs 表：新增 includes_storage 欄位
ALTER TABLE backup_jobs
ADD COLUMN IF NOT EXISTS includes_storage BOOLEAN DEFAULT false;

COMMENT ON COLUMN backup_jobs.includes_storage IS '是否包含 Supabase Storage 圖片';

-- 新增系統設定：預設是否備份圖片
INSERT INTO system_settings (key, value, value_type, category, is_public, description)
VALUES
  ('backup_include_storage_default', 'false', 'boolean', 'system', false, '備份時預設是否包含 Supabase Storage 圖片')
ON CONFLICT (key) DO UPDATE SET
  value = 'false',
  description = '備份時預設是否包含 Supabase Storage 圖片';
