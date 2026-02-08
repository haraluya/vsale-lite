-- 站點二 Storage Policies 修復 SQL
-- 請在 Supabase Dashboard 的 SQL Editor 中執行
-- 專案：rdyvmgomjdglflrcfijs

-- 1. 刪除舊的 policies（如果存在）
DROP POLICY IF EXISTS "Allow public to read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON storage.objects;

-- 2. 創建新的 Storage Policies for products bucket

-- Policy 1: 公開讀取
CREATE POLICY "Allow public to read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');

-- Policy 2: 認證使用者上傳
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

-- Policy 3: 認證使用者更新
CREATE POLICY "Allow authenticated users to update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'products');

-- Policy 4: 認證使用者刪除
CREATE POLICY "Allow authenticated users to delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products');

-- 驗證 policies 已創建
SELECT policyname, cmd, roles::text[]
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%Allow%'
ORDER BY policyname;
