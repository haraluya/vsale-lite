-- 建立 Function: 當新使用者註冊時自動建立 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 從 auth.users 的 raw_user_meta_data 取得 role
  -- 如果沒有指定,預設為 'client'
  INSERT INTO public.profiles (id, role, phone, tier_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    NEW.phone,
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'client') = 'client'
      THEN (SELECT id FROM tiers ORDER BY rank LIMIT 1)
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;

-- 建立 Trigger: 當 auth.users 新增使用者時觸發
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 為現有的管理員帳號建立 profile (如果不存在)
-- 使用您提供的 UUID: ebc36832-c6ab-4430-ba5d-3da9d88af1f0
INSERT INTO public.profiles (id, role, phone, tier_id)
SELECT
  'ebc36832-c6ab-4430-ba5d-3da9d88af1f0'::uuid,
  'admin',
  NULL,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = 'ebc36832-c6ab-4430-ba5d-3da9d88af1f0'::uuid
);
