-- 檢查 1: 查看 auth.users 中的管理員帳號
SELECT
  id,
  email,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'admin@test.com';

-- 檢查 2: 查看 profiles 表中是否有對應記錄
SELECT
  id,
  role,
  phone,
  tier_id,
  created_at
FROM public.profiles
WHERE id = 'ebc36832-c6ab-4430-ba5d-3da9d88af1f0'::uuid;

-- 檢查 3: 查看所有 profiles (確認表結構)
SELECT * FROM public.profiles LIMIT 5;
