-- ================================================
-- Vsale-lite Initial Schema Migration
-- Feature: 001-user-tier-management
-- Date: 2026-01-01
-- ================================================

-- 1. 建立會員等級表
CREATE TABLE IF NOT EXISTS tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  rank INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 建立使用者業務資料表
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

-- 3. 建立約束條件
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_must_have_phone'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT client_must_have_phone
      CHECK (role != 'client' OR (phone IS NOT NULL AND tier_id IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_must_have_email'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT admin_must_have_email
      CHECK (role != 'admin' OR email IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'must_have_identifier'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT must_have_identifier
      CHECK (phone IS NOT NULL OR email IS NOT NULL);
  END IF;
END $$;

-- 4. 建立索引
CREATE INDEX IF NOT EXISTS idx_tiers_rank ON tiers(rank);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_tier_id ON profiles(tier_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 5. 建立觸發器 (自動更新 updated_at)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tiers_updated_at ON tiers;
CREATE TRIGGER update_tiers_updated_at
BEFORE UPDATE ON tiers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 6. 插入預設會員等級
INSERT INTO tiers (name, rank) VALUES
  ('零售', 1),
  ('批發', 2),
  ('經銷商', 3)
ON CONFLICT (name) DO NOTHING;

-- 7. 建立 RLS (Row Level Security) 政策
ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 允許所有已認證使用者讀取等級
DROP POLICY IF EXISTS "Allow authenticated users to read tiers" ON tiers;
CREATE POLICY "Allow authenticated users to read tiers"
  ON tiers FOR SELECT
  TO authenticated
  USING (true);

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

-- 客戶只能查看自己的資料
DROP POLICY IF EXISTS "Allow users to read own profile" ON profiles;
CREATE POLICY "Allow users to read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 管理員可查看所有 profiles
DROP POLICY IF EXISTS "Allow admin to read all profiles" ON profiles;
CREATE POLICY "Allow admin to read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 管理員可管理所有 profiles
DROP POLICY IF EXISTS "Allow admin to manage profiles" ON profiles;
CREATE POLICY "Allow admin to manage profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
