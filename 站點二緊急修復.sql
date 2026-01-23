-- 站點二緊急修復 SQL
-- 目的：建立 admin_users 表並新增管理員

-- 1. 建立 admin_users 表
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_users_role_check CHECK (role IN ('admin', 'super_admin')),
  CONSTRAINT admin_users_status_check CHECK (status IN ('active', 'inactive'))
);

-- 2. 啟用 RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 3. 建立 RLS 策略（管理員可以查看所有管理員）
CREATE POLICY "管理員可查看所有管理員" ON public.admin_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid()
    )
  );

-- 4. 建立 RLS 策略（管理員可以新增管理員）
CREATE POLICY "管理員可新增管理員" ON public.admin_users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid()
    )
  );

-- 5. 建立 RLS 策略（管理員可以更新管理員）
CREATE POLICY "管理員可更新管理員" ON public.admin_users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid()
    )
  );

-- 6. 新增剛才建立的管理員記錄
INSERT INTO public.admin_users (id, email, role, status)
VALUES (
  '39ab5470-b4d8-4867-a066-59274cd34026',
  'admin@vsale.com',
  'admin',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- 7. 驗證建立結果
SELECT
  id,
  email,
  role,
  status,
  created_at
FROM public.admin_users
WHERE email = 'admin@vsale.com';
