-- ============================================================================
-- Migration: 新增客戶通知設定分類
-- Date: 2026-01-11
-- Feature: 系統設定頁面重構
-- Description: 新增 client_notifications 分類，並插入預設登入資訊範本
-- ============================================================================

-- 1. 擴充 system_settings.category 檢查約束（新增 'client_notifications'）
ALTER TABLE system_settings DROP CONSTRAINT IF EXISTS system_settings_category_check;
ALTER TABLE system_settings
  ADD CONSTRAINT system_settings_category_check
  CHECK (category IN ('general', 'branding', 'carousel', 'system', 'client_notifications'));

-- 2. 插入預設客戶通知設定
INSERT INTO system_settings (key, value, value_type, category, is_public, description) VALUES
  (
    'client_login_info_template',
    '【快速下單系統 - 登入資訊】

客戶名稱: {客戶名稱}
前台網址: {前台網址}
登入電話: {登入電話}
登入密碼: {登入密碼}

請使用以上資訊登入系統進行下單,首次使用輸入"NEW100"領取百元折價券。',
    'text',
    'client_notifications',
    false,
    '客戶登入資訊範本（支援變數：{客戶名稱}、{前台網址}、{登入電話}、{登入密碼}）'
  )
ON CONFLICT (key) DO NOTHING;

-- 3. 更新型別定義註解
COMMENT ON COLUMN system_settings.category IS '設定類別：general (一般), branding (品牌), carousel (輪播), system (系統), client_notifications (客戶通知)';
