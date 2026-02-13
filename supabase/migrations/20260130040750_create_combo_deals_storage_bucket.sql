-- ================================================
-- 組合優惠 Storage Bucket Migration
-- Feature: 021-combo-deals
-- Date: 2026-01-30
-- ================================================

-- 1. 建立 Supabase Storage Bucket (combo-deals)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'combo-deals',
  'combo-deals',
  true,                                                  -- 公開存取
  3145728,                                               -- 3MB 檔案大小限制
  ARRAY['image/jpeg', 'image/png', 'image/webp']        -- 允許的檔案類型
)
ON CONFLICT (id) DO NOTHING;

-- 2. 建立 Storage RLS 策略（使用冪等性語法）

-- 允許公開讀取
DROP POLICY IF EXISTS "Allow public read access to combo-deals" ON storage.objects;
CREATE POLICY "Allow public read access to combo-deals"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'combo-deals');

-- 允許管理員上傳
DROP POLICY IF EXISTS "Allow admin to upload combo-deals images" ON storage.objects;
CREATE POLICY "Allow admin to upload combo-deals images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'combo-deals' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 允許管理員更新
DROP POLICY IF EXISTS "Allow admin to update combo-deals images" ON storage.objects;
CREATE POLICY "Allow admin to update combo-deals images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'combo-deals' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 允許管理員刪除
DROP POLICY IF EXISTS "Allow admin to delete combo-deals images" ON storage.objects;
CREATE POLICY "Allow admin to delete combo-deals images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'combo-deals' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
