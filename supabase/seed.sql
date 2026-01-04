-- ================================================
-- Seed 資料：Feature 003 基礎測試資料
-- ================================================

-- 建立管理員帳號
DO $$
DECLARE
    v_user_id UUID := gen_random_uuid();
    v_encrypted_password TEXT;
BEGIN
    -- 產生密碼雜湊 (password123)
    v_encrypted_password := crypt('password123', gen_salt('bf'));

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
        role,
        confirmation_token,
        recovery_token,
        email_change,
        email_change_token_new,
        email_change_token_current
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'admin@example.com',
        v_encrypted_password,
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        'authenticated',
        'authenticated',
        '',
        '',
        '',
        '',
        ''
    );

    -- 插入到 profiles
    INSERT INTO profiles (
        id,
        email,
        role,
        display_name,
        username
    ) VALUES (
        v_user_id,
        'admin@example.com',
        'admin',
        '系統管理員',
        'admin'
    );

    RAISE NOTICE '✅ 管理員帳號建立成功 (admin@example.com / password123)';
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE '管理員帳號已存在';
END $$;

-- 建立測試分類
INSERT INTO categories (name, code, sort_order) VALUES
    ('飲料', 'DRK', 1),
    ('零食', 'SNK', 2),
    ('日用品', 'DAI', 3)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- 建立測試會員等級
INSERT INTO tiers (name, rank) VALUES
    ('批發', 1),
    ('零售', 2),
    ('經銷商', 3)
ON CONFLICT (name) DO UPDATE SET rank = EXCLUDED.rank;
