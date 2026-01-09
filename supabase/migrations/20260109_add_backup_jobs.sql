-- ============================================================================
-- Migration: 015-cloud-backup - Add backup_jobs table and settings
-- Created: 2026-01-09
-- Description: 建立雲端備份系統所需的資料表、索引、RLS Policies 與系統設定
-- ============================================================================

-- ============================================================================
-- 1. 建立 backup_jobs 資料表
-- ============================================================================

CREATE TABLE IF NOT EXISTS backup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 備份檔案資訊
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_provider TEXT NOT NULL CHECK (storage_provider IN ('gcs', 'vercel_blob')),
  storage_url TEXT NOT NULL,

  -- 類型與狀態
  backup_type TEXT NOT NULL CHECK (backup_type IN ('auto', 'manual')),
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'success', 'failed')),

  -- 元數據
  metadata JSONB,
  error_message TEXT,

  -- 執行者與時間
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. 建立索引（效能優化）
-- ============================================================================

-- 索引 1: 狀態查詢索引（查詢最近失敗備份）
CREATE INDEX IF NOT EXISTS idx_backup_jobs_status
  ON backup_jobs(status);

-- 索引 2: 時間排序索引（滾動刪除舊備份）
CREATE INDEX IF NOT EXISTS idx_backup_jobs_created_at
  ON backup_jobs(created_at DESC);

-- 索引 3: 組合索引（備份類型 + 狀態，查詢自動備份成功率）
CREATE INDEX IF NOT EXISTS idx_backup_jobs_type_status
  ON backup_jobs(backup_type, status);

-- 索引 4: 組合索引（類型 + 時間，分類查詢最近備份）
CREATE INDEX IF NOT EXISTS idx_backup_jobs_type_created
  ON backup_jobs(backup_type, created_at DESC);

-- ============================================================================
-- 3. 啟用 RLS (Row Level Security)
-- ============================================================================

ALTER TABLE backup_jobs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. 建立 RLS Policies
-- ============================================================================

-- Policy 1: 管理員可查看所有備份記錄
CREATE POLICY "Admins can view backup jobs"
  ON backup_jobs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Policy 2: 管理員可管理備份記錄（新增、修改、刪除）
CREATE POLICY "Admins can manage backup jobs"
  ON backup_jobs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- ============================================================================
-- 5. 新增 system_settings 備份相關設定
-- ============================================================================

INSERT INTO system_settings (key, value, value_type, category, is_public, description)
VALUES
  ('backup_enabled', 'true', 'boolean', 'system', false, '自動備份開關'),
  ('backup_max_keep', '10', 'number', 'system', false, '保留備份數量'),
  ('backup_storage_provider', 'gcs', 'text', 'system', false, '儲存位置'),
  ('backup_last_success', '', 'text', 'system', false, '上次成功時間'),
  ('backup_last_error', '', 'text', 'system', false, '上次錯誤訊息')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 6. 新增 COMMENT（資料表與欄位說明）
-- ============================================================================

COMMENT ON TABLE backup_jobs IS '雲端備份記錄表';
COMMENT ON COLUMN backup_jobs.id IS '唯一識別碼';
COMMENT ON COLUMN backup_jobs.filename IS '備份檔案名稱（vsale-backup-YYYYMMDD-HHMMSS.sql.gz）';
COMMENT ON COLUMN backup_jobs.file_size IS '壓縮後檔案大小（bytes）';
COMMENT ON COLUMN backup_jobs.storage_provider IS '儲存位置（gcs 或 vercel_blob）';
COMMENT ON COLUMN backup_jobs.storage_url IS '雲端檔案 URL（GCS: gs://bucket/path, Vercel: https://...）';
COMMENT ON COLUMN backup_jobs.backup_type IS '備份類型（auto 或 manual）';
COMMENT ON COLUMN backup_jobs.status IS '執行狀態（in_progress, success, failed）';
COMMENT ON COLUMN backup_jobs.metadata IS '備份元數據（資料表數量、記錄數量、壓縮率）';
COMMENT ON COLUMN backup_jobs.error_message IS '失敗時錯誤訊息';
COMMENT ON COLUMN backup_jobs.created_by IS '手動備份操作者（自動備份時為 NULL）';
COMMENT ON COLUMN backup_jobs.started_at IS '備份開始時間';
COMMENT ON COLUMN backup_jobs.completed_at IS '備份完成時間';
COMMENT ON COLUMN backup_jobs.created_at IS '記錄建立時間';

-- ============================================================================
-- Migration 完成
-- ============================================================================
