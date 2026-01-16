-- ================================================================
-- M1: 核心認證與會員等級
-- Migration Consolidation: 012-migration-consolidation
-- Created: 2026-01-07
-- ================================================================
-- 整合來源:
--   1. 20260101_initial_schema.sql (基礎資料表)
--   2. 20260104_fix_profiles_rls.sql (RLS 修復)
-- ================================================================

-- ================================================================
-- 1. CREATE TABLES
-- ================================================================

-- 會員等級表
CREATE TABLE IF NOT EXISTS tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  rank INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tiers IS '會員等級表：定義批發系統的客戶等級（零售、批發、經銷商），用於綁定等級價格';
COMMENT ON COLUMN tiers.id IS '等級 ID（UUID）';
COMMENT ON COLUMN tiers.name IS '等級名稱（如「零售」、「批發」、「經銷商」）';
COMMENT ON COLUMN tiers.rank IS '等級排序（數字越大等級越高）';
COMMENT ON COLUMN tiers.created_at IS '建立時間';
COMMENT ON COLUMN tiers.updated_at IS '最後更新時間';

-- 使用者業務資料表
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('client', 'admin')),
  tier_id UUID REFERENCES tiers(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  display_name TEXT,
  notes TEXT
);

COMMENT ON TABLE profiles IS '使用者業務資料表：擴充 auth.users，儲存手機號碼、角色、會員等級等業務資訊';

COMMENT ON COLUMN profiles.id IS '使用者 ID（關聯 auth.users.id）';
COMMENT ON COLUMN profiles.phone IS '手機號碼（客戶必填，用於登入）';
COMMENT ON COLUMN profiles.email IS '電子郵件（管理員必填，用於登入）';
COMMENT ON COLUMN profiles.role IS '角色類型（client: 客戶, admin: 管理員）';
COMMENT ON COLUMN profiles.tier_id IS '會員等級 ID（客戶必填，管理員可為 NULL）';
COMMENT ON COLUMN profiles.created_at IS '建立時間';
COMMENT ON COLUMN profiles.display_name IS '顯示名稱';
COMMENT ON COLUMN profiles.notes IS '備註（管理員可用）';

-- ================================================================
-- 2. ADD CONSTRAINTS
-- ================================================================

-- 客戶必須有手機號碼與等級
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_must_have_phone'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT client_must_have_phone
      CHECK (role != 'client' OR (phone IS NOT NULL AND tier_id IS NOT NULL));
  END IF;
END $$;

-- 管理員必須有電子郵件
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_must_have_email'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT admin_must_have_email
      CHECK (role != 'admin' OR email IS NOT NULL);
  END IF;
END $$;

-- 必須至少有手機或電子郵件其中之一
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'must_have_identifier'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT must_have_identifier
      CHECK (phone IS NOT NULL OR email IS NOT NULL);
  END IF;
END $$;

-- ================================================================
-- 3. CREATE INDEXES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_tiers_rank ON tiers(rank);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_tier_id ON profiles(tier_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ================================================================
-- 4. CREATE TRIGGERS
-- ================================================================

-- 自動更新 updated_at 欄位的函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS '觸發器函數：自動更新表的 updated_at 欄位為當前時間';

-- 為 tiers 表建立觸發器
DROP TRIGGER IF EXISTS update_tiers_updated_at ON tiers;
CREATE TRIGGER update_tiers_updated_at
BEFORE UPDATE ON tiers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 5. INSERT DEFAULT DATA
-- ================================================================

-- 插入預設會員等級
INSERT INTO tiers (name, rank) VALUES
  ('零售', 1),
  ('批發', 2),
  ('經銷商', 3)
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 7. CREATE RLS POLICIES
-- ================================================================

-- Tiers Policies
-- 允許所有已認證使用者讀取等級
DROP POLICY IF EXISTS "Allow authenticated users to read tiers" ON tiers;
CREATE POLICY "Allow authenticated users to read tiers"
  ON tiers FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON POLICY "Allow authenticated users to read tiers" ON tiers IS '允許所有已認證使用者讀取會員等級（用於前台顯示等級選項）';

-- 僅管理員可修改等級
DROP POLICY IF EXISTS "Allow admin to manage tiers" ON tiers;
CREATE POLICY "Allow admin to manage tiers"
  ON tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMENT ON POLICY "Allow admin to manage tiers" ON tiers IS '僅允許管理員新增、修改、刪除會員等級';

-- Profiles Policies
-- 客戶只能查看自己的資料
DROP POLICY IF EXISTS "Allow users to read own profile" ON profiles;
CREATE POLICY "Allow users to read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

COMMENT ON POLICY "Allow users to read own profile" ON profiles IS '允許使用者讀取自己的 Profile 資料';

-- 管理員可查看所有 profiles (修復版：避免無限遞迴)
DROP POLICY IF EXISTS "Allow admin to read all profiles" ON profiles;
CREATE POLICY "Allow admin to read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON POLICY "Allow admin to read all profiles" ON profiles IS '允許所有已認證用戶讀取 Profiles（RLS 層級寬鬆，權限由 Server Action 控制）';

-- 管理員權限由 Service Role Key 的 Admin Client 處理（繞過 RLS）
DROP POLICY IF EXISTS "Allow admin to manage profiles" ON profiles;
CREATE POLICY "Allow admin to manage profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (id = auth.uid());

COMMENT ON POLICY "Allow admin to manage profiles" ON profiles IS '僅允許修改自己的資料（管理員操作使用 Admin Client 繞過 RLS）';

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '[M1] 核心認證與會員等級 - Migration 完成';
    RAISE NOTICE '  - 資料表: tiers, profiles';
    RAISE NOTICE '  - 預設資料: 3 個會員等級（零售、批發、經銷商）';
    RAISE NOTICE '  - RLS Policies: 6 個';
END $$;
