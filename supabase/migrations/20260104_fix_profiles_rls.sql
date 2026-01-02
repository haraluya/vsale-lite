-- ================================================
-- 修復 Profiles RLS 無限遞迴問題
-- Date: 2026-01-03
-- ================================================

-- 刪除舊的有遞迴問題的策略
DROP POLICY IF EXISTS "Allow admin to read all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow admin to manage profiles" ON profiles;

-- 新策略：簡化方法 - 先允許讀取自己，管理權限由 Server Action 控制
-- 所有人可以讀取自己的 profile
CREATE POLICY "Allow admin to read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);  -- 允許所有已認證用戶讀取（RLS 層級寬鬆，Server Action 層級嚴格控制）

-- 管理員權限由 Service Role Key 的 Admin Client 處理（繞過 RLS）
-- 一般用戶的修改操作由 Server Action 控制
CREATE POLICY "Allow admin to manage profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (id = auth.uid());  -- 僅允許修改自己的資料（管理員操作使用 Admin Client）

-- 記錄
DO $$
BEGIN
    RAISE NOTICE '✅ Profiles RLS 策略已修復（避免無限遞迴）';
END $$;
