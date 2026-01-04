-- Migration: 後台系統管理功能 (Feature 008)
-- Created: 2026-01-04
-- Description: 擴充 profiles 表、建立 system_settings 與 audit_logs 表

-- =============================================
-- 1. 擴充 profiles 表 (管理員帳號相關欄位)
-- =============================================

-- 新增 username 與 display_name 欄位
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- 約束條件
ALTER TABLE profiles
  ADD CONSTRAINT admin_must_have_username
    CHECK (role != 'admin' OR (username IS NOT NULL AND email IS NOT NULL));

ALTER TABLE profiles
  ADD CONSTRAINT username_only_for_admin
    CHECK (role = 'admin' OR username IS NULL);

ALTER TABLE profiles
  ADD CONSTRAINT username_format
    CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$');

-- 註解
COMMENT ON COLUMN profiles.username IS '管理員登入帳號 (僅管理員使用，3-20 字元，小寫字母+數字+底線)';
COMMENT ON COLUMN profiles.display_name IS '顯示暱稱 (客戶看到的名字，如「小愛」)';

-- =============================================
-- 2. 建立 system_settings 表 (系統設定)
-- =============================================

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

-- 自動更新 updated_at
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 註解
COMMENT ON TABLE system_settings IS '系統設定表 (Key-Value 模式)';
COMMENT ON COLUMN system_settings.key IS '設定鍵 (唯一，如 site_title)';
COMMENT ON COLUMN system_settings.value IS '設定值 (TEXT 統一儲存，依 value_type 解析)';
COMMENT ON COLUMN system_settings.value_type IS '值類型: text, number, boolean, json, image_url';
COMMENT ON COLUMN system_settings.category IS '設定類別: general, branding, carousel, system';
COMMENT ON COLUMN system_settings.is_public IS '是否公開 (true: 客戶可讀, false: 僅管理員可讀)';
COMMENT ON COLUMN system_settings.updated_by IS '最後更新者 (管理員)';

-- =============================================
-- 3. 建立 audit_logs 表 (操作日誌)
-- =============================================

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
COMMENT ON TABLE audit_logs IS '操作日誌表 (稽核追蹤)';
COMMENT ON COLUMN audit_logs.target_type IS '目標實體類型: product, client, order, tier, series, etc.';
COMMENT ON COLUMN audit_logs.target_id IS '目標實體 ID (UUID 轉為 TEXT)';
COMMENT ON COLUMN audit_logs.action_type IS '操作類型: created, updated, deleted, stock_adjusted, comment_added';
COMMENT ON COLUMN audit_logs.actor_id IS '操作者 (客戶或管理員)';
COMMENT ON COLUMN audit_logs.actor_display_name IS '操作者暱稱快照 (避免刪除帳號後顯示「未知」)';
COMMENT ON COLUMN audit_logs.old_values IS '變更前資料 (JSONB)';
COMMENT ON COLUMN audit_logs.new_values IS '變更後資料 (JSONB)';

-- =============================================
-- 4. RLS Policies - system_settings
-- =============================================

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

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

-- =============================================
-- 5. RLS Policies - audit_logs
-- =============================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

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

-- 注意：操作日誌不可修改或刪除（僅新增），不開放 UPDATE / DELETE 權限

-- =============================================
-- 6. 插入預設系統設定
-- =============================================

INSERT INTO system_settings (key, value, value_type, category, is_public, description) VALUES
  ('site_title', 'Vsale-lite - B2B 批發訂貨系統', 'text', 'general', true, '網站標題'),
  ('company_name', '您的公司名稱', 'text', 'general', true, '公司名稱'),
  ('customer_service_phone', '02-1234-5678', 'text', 'general', true, '客服電話'),
  ('logo_url', '', 'image_url', 'branding', true, '完整版 Logo（200×60）'),
  ('logo_icon_url', '', 'image_url', 'branding', true, '圖示版 Logo（60×60）'),
  ('favicon_url', '', 'image_url', 'branding', true, 'Favicon（60×60）'),
  ('carousel_auto_play', 'true', 'boolean', 'carousel', true, '廣告輪播自動播放'),
  ('carousel_interval', '5000', 'number', 'carousel', true, '廣告輪播間隔（毫秒）'),
  ('carousel_recommended_size', '1200 × 300 像素（4:1 比例）', 'text', 'carousel', true, '建議圖片尺寸')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- 7. 現有管理員帳號遷移
-- =============================================

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
