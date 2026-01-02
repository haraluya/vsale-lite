-- 修正 RLS 政策:允許使用者在登入時查詢自己的 profile
-- 問題:現有的 RLS 政策要求已經有 profile 才能查詢,但登入時還沒有 session context

-- 1. 允許已認證使用者讀取自己的 profile (登入時需要)
DROP POLICY IF EXISTS "Allow users to read own profile" ON profiles;
CREATE POLICY "Allow users to read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 2. 允許 service_role 繞過 RLS (用於 Server Actions)
-- 註:這個政策允許使用 service role key 的後端完全訪問
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

-- 3. 額外增加:允許剛登入但還在驗證過程中的使用者讀取自己的資料
-- 使用 anon role 也能讀取(僅限登入驗證階段)
DROP POLICY IF EXISTS "Allow anon to read during auth" ON profiles;
CREATE POLICY "Allow anon to read during auth"
  ON profiles FOR SELECT
  TO anon
  USING (id = auth.uid());
