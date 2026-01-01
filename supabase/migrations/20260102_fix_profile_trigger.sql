-- 修復 trigger: 只在有 phone 時才建立 profile,否則跳過讓手動建立
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 只在有 phone 時才自動建立 profile (傳統手機註冊)
  -- Email 註冊方式 (phone@temp.local) 會由應用程式手動建立
  IF NEW.phone IS NOT NULL THEN
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
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
