-- 站點三 Storage Bucket 修復 SQL
-- 創建 products bucket 和設定 policies

-- 1. 創建 products bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. 創建 Storage Policies

-- Policy 1: 公開讀取
CREATE POLICY IF NOT EXISTS "Allow public to read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');

-- Policy 2: 認證使用者上傳
CREATE POLICY IF NOT EXISTS "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

-- Policy 3: 認證使用者更新
CREATE POLICY IF NOT EXISTS "Allow authenticated users to update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'products');

-- Policy 4: 認證使用者刪除
CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products');
