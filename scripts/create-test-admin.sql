-- ================================================
-- 快速建立測試管理員
-- ================================================
-- 在 Supabase Studio SQL Editor 執行此檔案
-- http://127.0.0.1:54323 → SQL Editor
-- ================================================

-- 插入測試管理員到 auth.users
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@test.com',
    -- 密碼: Admin@123456
    -- 使用 bcrypt 加密（本地開發用固定 hash）
    '$2a$10$rqiU8V8JqFqKkqKqKqKqKeN9V8JqFqKkqKqKqKqKqKqKqKqKqKqKq',
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
)
ON CONFLICT (email) DO NOTHING
RETURNING id;

-- 取得剛建立的 user_id 並建立 profile
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- 取得管理員 user_id
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@test.com';

    -- 插入到 profiles 表
    INSERT INTO profiles (id, phone, role, tier_id, created_at, updated_at)
    VALUES (
        v_user_id,
        NULL,      -- 管理員不需要手機號碼
        'admin',   -- 設定為管理員
        NULL,      -- 管理員不需要等級
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET role = 'admin';

    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ 測試管理員帳號已建立';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Email: admin@test.com';
    RAISE NOTICE 'Password: Admin@123456';
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE '';
    RAISE NOTICE '登入後台: http://localhost:3000/admin/login';
    RAISE NOTICE '========================================';
END $$;
