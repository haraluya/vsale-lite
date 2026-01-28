-- =====================================================
-- 功能: 客戶通知範本管理系統
-- 描述: 允許管理員建立多個自訂範本，並在需要時選擇使用
-- 建立日期: 2026-01-28
-- =====================================================

-- 建立通知範本資料表
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  template TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- 約束：範本名稱不可為空白
  CONSTRAINT notification_templates_name_not_empty CHECK (trim(name) <> ''),
  -- 約束：範本內容不可為空白
  CONSTRAINT notification_templates_template_not_empty CHECK (trim(template) <> '')
);

-- 建立索引
CREATE INDEX idx_notification_templates_name ON notification_templates(name);
CREATE INDEX idx_notification_templates_is_default ON notification_templates(is_default);
CREATE INDEX idx_notification_templates_created_at ON notification_templates(created_at DESC);

-- 插入預設範本（從現有的 system_settings 移轉）
INSERT INTO notification_templates (name, template, is_default, created_at)
VALUES
  (
    '預設範本',
    '【{公司名稱} - 登入資訊】

客戶名稱: {客戶名稱}
前台網址: {前台網址}
登入電話: {登入電話}
登入密碼: {登入密碼}

請使用以上資訊登入系統進行下單,首次使用輸入"NEW100"領取百元折價券。',
    true,
    NOW()
  );

-- 註解
COMMENT ON TABLE notification_templates IS '客戶通知範本管理';
COMMENT ON COLUMN notification_templates.id IS '範本 ID';
COMMENT ON COLUMN notification_templates.name IS '範本名稱（唯一）';
COMMENT ON COLUMN notification_templates.template IS '範本內容（支援變數：{公司名稱}、{客戶名稱}、{前台網址}、{登入電話}、{登入密碼}）';
COMMENT ON COLUMN notification_templates.is_default IS '是否為預設範本';
COMMENT ON COLUMN notification_templates.created_at IS '建立時間';
COMMENT ON COLUMN notification_templates.updated_at IS '更新時間';
COMMENT ON COLUMN notification_templates.created_by IS '建立者（管理員 ID）';
COMMENT ON COLUMN notification_templates.updated_by IS '更新者（管理員 ID）';

-- =====================================================
-- RLS 策略
-- =====================================================

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- 管理員可讀取所有範本
CREATE POLICY "管理員可讀取所有通知範本"
  ON notification_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 管理員可新增範本
CREATE POLICY "管理員可新增通知範本"
  ON notification_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 管理員可更新範本
CREATE POLICY "管理員可更新通知範本"
  ON notification_templates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 管理員可刪除範本（但不能刪除預設範本）
CREATE POLICY "管理員可刪除通知範本"
  ON notification_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    AND is_default = false
  );

-- =====================================================
-- 觸發器：確保只有一個預設範本
-- =====================================================

CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果新的範本設定為預設，將其他範本的 is_default 設為 false
  IF NEW.is_default = true THEN
    UPDATE notification_templates
    SET is_default = false
    WHERE id <> NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_template
  BEFORE INSERT OR UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_template();

-- =====================================================
-- 觸發器：自動更新 updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_notification_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_templates_updated_at();
