-- ================================================
-- 建立測試管理員帳號
-- ================================================
-- Email: admin@test.com
-- Password: Admin@123456
-- ================================================

-- 1. 插入到 auth.users（Supabase Auth 表）
-- 注意：本地開發需要手動建立 auth 用戶

-- 使用 Supabase Studio 建立用戶：
-- 1. 開啟 http://127.0.0.1:54323
-- 2. 左側選單 → Authentication → Users
-- 3. 點擊 "Add User" 或 "Invite User"
-- 4. Email: admin@test.com
-- 5. Password: Admin@123456
-- 6. 確認建立

-- 或者使用以下 SQL（需要 Supabase 內部權限）：

-- 插入 auth.users（需要在 Supabase Studio SQL Editor 執行）
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- 檢查用戶是否已存在
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@test.com';

    IF v_user_id IS NULL THEN
        -- 生成新的 UUID
        v_user_id := gen_random_uuid();

        -- 插入到 auth.users
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            aud,
            role
        ) VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            'admin@test.com',
            crypt('Admin@123456', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            'authenticated',
            'authenticated'
        );

        -- 插入到 profiles 表
        INSERT INTO profiles (id, phone, role, tier_id)
        VALUES (
            v_user_id,
            NULL,  -- 管理員不需要手機號碼
            'admin',
            NULL   -- 管理員不需要等級
        );

        RAISE NOTICE '✓ 管理員帳號建立成功';
        RAISE NOTICE '  Email: admin@test.com';
        RAISE NOTICE '  Password: Admin@123456';
        RAISE NOTICE '  User ID: %', v_user_id;
    ELSE
        RAISE NOTICE '管理員帳號已存在';
        RAISE NOTICE '  User ID: %', v_user_id;
    END IF;
END $$;
