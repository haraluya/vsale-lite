-- 驗證管理員帳號是否存在

-- 1. 檢查 profiles 表中的管理員
SELECT
  id,
  username,
  email,
  role,
  display_name,
  created_at
FROM profiles
WHERE role = 'admin';

-- 2. 檢查 auth.users 表中的對應帳號
SELECT
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'admin@example.com';
