-- ============================================================================
-- Migration: M6 - 系統管理與稽核
-- Feature: 008-system-admin
-- Date: 2026-01-07
-- Version: 1.0 (整合版)
-- ============================================================================
--
-- 此檔案整合以下 Migration:
-- - 20260113_system_admin.sql (管理員與系統設定)
-- - 20260114_add_audit_logs_insert_policy.sql (操作日誌 RLS)
-- - 20260115_update_system_settings_description.sql (設定描述欄位)
--
-- 功能模組:
-- - profiles 表擴充 (username, display_name)
-- - 系統設定表 (system_settings)
-- - 操作日誌表 (audit_logs)
--
-- ============================================================================

-- ============================================================================
-- 1. 擴充 profiles 表 (管理員帳號相關欄位)
-- ============================================================================

-- 新增 username 與 display_name 欄位
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 唯一性約束
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;
END $$;

-- 索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- 約束條件
DO $$
BEGIN
  -- 管理員必須有 username 與 email
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_must_have_username'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT admin_must_have_username
        CHECK (role != 'admin' OR (username IS NOT NULL AND email IS NOT NULL));
  END IF;

  -- username 僅限管理員使用
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'username_only_for_admin'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT username_only_for_admin
        CHECK (role = 'admin' OR username IS NULL);
  END IF;

  -- username 格式限制
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'username_format'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT username_format
        CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$');
  END IF;
END $$;

-- 註解
COMMENT ON COLUMN profiles.username IS '管理員登入帳號 (僅管理員使用，3-20 字元，小寫字母+數字+底線)';
COMMENT ON COLUMN profiles.display_name IS '顯示暱稱 (客戶看到的名字，如「小愛」)';

-- ============================================================================
-- 2. 建立 system_settings 表 (系統設定)
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('text', 'number', 'boolean', 'json', 'image_url')),
  category TEXT NOT NULL CHECK (category IN ('general', 'branding', 'carousel', 'system')),
  is_public BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_is_public ON system_settings(is_public);

-- Trigger: 自動更新 updated_at
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 註解
COMMENT ON TABLE system_settings IS '系統設定表 - Key-Value 模式儲存，支援多種資料型別';
COMMENT ON COLUMN system_settings.key IS '設定鍵 (唯一識別，如 site_title)';
COMMENT ON COLUMN system_settings.value IS '設定值 (TEXT 統一儲存，依 value_type 解析)';
COMMENT ON COLUMN system_settings.value_type IS '值類型：text (文字), number (數字), boolean (布林), json (JSON), image_url (圖片 URL)';
COMMENT ON COLUMN system_settings.category IS '設定類別：general (一般), branding (品牌), carousel (輪播), system (系統)';
COMMENT ON COLUMN system_settings.is_public IS '是否公開 (true: 客戶可讀取, false: 僅管理員可讀取)';
COMMENT ON COLUMN system_settings.description IS '設定說明（顯示於管理介面）';
COMMENT ON COLUMN system_settings.updated_by IS '最後更新者 (管理員 ID)';

-- ============================================================================
-- 3. 建立 audit_logs 表 (操作日誌)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'created',
    'updated',
    'deleted',
    'stock_adjusted',
    'comment_added'
  )),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT CHECK (actor_role IN ('client', 'admin')),
  actor_display_name TEXT,
  old_values JSONB,
  new_values JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 基本索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON audit_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 複合索引 (常用組合查詢)
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);

-- GIN 索引 (JSONB 查詢優化)
CREATE INDEX IF NOT EXISTS idx_audit_logs_old_values_gin ON audit_logs USING GIN (old_values);
CREATE INDEX IF NOT EXISTS idx_audit_logs_new_values_gin ON audit_logs USING GIN (new_values);

-- 註解
COMMENT ON TABLE audit_logs IS '操作日誌表 - 稽核追蹤，記錄所有重要操作（建立、修改、刪除、庫存調整、留言）';
COMMENT ON COLUMN audit_logs.target_type IS '目標實體類型：product, client, order, tier, series, coupon, setting, etc.';
COMMENT ON COLUMN audit_logs.target_id IS '目標實體 ID (UUID 轉為 TEXT 儲存)';
COMMENT ON COLUMN audit_logs.action_type IS '操作類型：created (建立), updated (更新), deleted (刪除), stock_adjusted (庫存調整), comment_added (新增留言)';
COMMENT ON COLUMN audit_logs.actor_id IS '操作者 ID (客戶或管理員)';
COMMENT ON COLUMN audit_logs.actor_role IS '操作者角色 (client 或 admin)';
COMMENT ON COLUMN audit_logs.actor_display_name IS '操作者暱稱快照 (避免刪除帳號後顯示「未知使用者」)';
COMMENT ON COLUMN audit_logs.old_values IS '變更前資料 (JSONB 格式，僅 updated/deleted 動作有值)';
COMMENT ON COLUMN audit_logs.new_values IS '變更後資料 (JSONB 格式，僅 created/updated 動作有值)';
COMMENT ON COLUMN audit_logs.notes IS '操作備註 (額外說明)';

-- ============================================================================
-- 4. 啟用 RLS（Row Level Security）
-- ============================================================================

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS Policies - system_settings
-- ============================================================================

-- 所有使用者（包含未登入）可查詢公開設定
CREATE POLICY "Public can view public settings"
  ON system_settings FOR SELECT
  USING (is_public = true);

-- 管理員可查詢所有設定（含私密設定）
CREATE POLICY "Admins can view all settings"
  ON system_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 管理員可更新設定
CREATE POLICY "Admins can update settings"
  ON system_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 6. RLS Policies - audit_logs
-- ============================================================================

-- 管理員可查詢所有操作日誌
CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 所有已認證使用者都可以插入操作日誌（Server Actions 會呼叫 logAudit）
CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 註解：操作日誌不可修改或刪除（僅新增），不開放 UPDATE / DELETE 權限

-- ============================================================================
-- 7. 插入預設系統設定
-- ============================================================================

INSERT INTO system_settings (key, value, value_type, category, is_public, description) VALUES
  ('site_title', 'Vsale-lite - B2B 批發訂貨系統', 'text', 'general', true, '網站標題'),
  ('company_name', '您的公司名稱', 'text', 'general', true, '公司名稱'),
  ('logo_url', '', 'image_url', 'branding', true, '完整版 Logo（200×60）'),
  ('logo_icon_url', '', 'image_url', 'branding', true, '圖示版 Logo（60×60）'),
  ('favicon_url', '', 'image_url', 'branding', true, 'Favicon（60×60）'),
  ('carousel_auto_play', 'true', 'boolean', 'carousel', true, '廣告輪播顯示開關（開啟=顯示，關閉=隱藏）'),
  ('carousel_interval', '5000', 'number', 'carousel', true, '廣告輪播間隔（毫秒）')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 8. 現有管理員帳號遷移（自動生成 username）
-- ============================================================================

-- 自動從 email 提取 username（取 @ 前的部分）
UPDATE profiles
SET username = SPLIT_PART(email, '@', 1)
WHERE role = 'admin' AND username IS NULL;

-- 處理重複的 username（加上數字後綴）
DO $$
DECLARE
  v_profile RECORD;
  v_new_username TEXT;
  v_counter INTEGER;
BEGIN
  FOR v_profile IN
    SELECT id, username
    FROM profiles
    WHERE role = 'admin' AND username IS NOT NULL
  LOOP
    -- 檢查 username 是否重複
    IF (SELECT COUNT(*) FROM profiles WHERE username = v_profile.username) > 1 THEN
      v_counter := 1;
      LOOP
        v_new_username := v_profile.username || v_counter;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE username = v_new_username);
        v_counter := v_counter + 1;
      END LOOP;

      UPDATE profiles
      SET username = v_new_username
      WHERE id = v_profile.id;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- Migration 完成 - M6 系統管理與稽核
-- ============================================================================
--
-- 資料表數量: 2 個
-- - system_settings (系統設定)
-- - audit_logs (操作日誌)
--
-- profiles 擴充欄位: 2 個
-- - username (管理員登入帳號)
-- - display_name (顯示暱稱)
--
-- RLS Policies 數量: 6 個
--
-- 關鍵特色:
-- - Key-Value 系統設定儲存（支援多種資料型別）
-- - 完整操作日誌（JSONB 儲存變更前後資料）
-- - 管理員 username 模式登入（無需 email 驗證）
-- - GIN 索引優化 JSONB 查詢效能
--
-- ============================================================================
