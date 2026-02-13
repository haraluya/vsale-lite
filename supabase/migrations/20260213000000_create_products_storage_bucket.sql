-- ================================================
-- 商品圖片 Storage Bucket Migration
-- Feature: 修復站點 4 缺少 products bucket 問題
-- Date: 2026-02-13
-- ================================================
--
-- 背景：
-- - consolidated_v1_baseline.sql 中缺少 Storage Bucket 建立
-- - 20260129061511_allow_admin_upload_product_images.sql 只建立了 policies，沒有建立 bucket
-- - 導致新站點（站點 4）上傳圖片時出現 "Bucket not found" 錯誤
--
-- 解決方案：
-- - 補充建立 products bucket
-- - 已有 bucket 的站點會自動跳過（ON CONFLICT DO NOTHING）
-- ================================================

-- 1. 建立 Supabase Storage Bucket (products)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,                                                  -- 公開存取
  5242880,                                               -- 5MB 檔案大小限制
  ARRAY['image/jpeg', 'image/png', 'image/webp']        -- 允許的檔案類型
)
ON CONFLICT (id) DO NOTHING;

-- 2. 建立公開讀取策略（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow public read access to products'
  ) THEN
    CREATE POLICY "Allow public read access to products"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'products');
  END IF;
END $$;

-- ================================================
-- 驗證指令（執行後可手動檢查）
-- ================================================

-- 檢查 bucket 是否存在
-- SELECT * FROM storage.buckets WHERE id = 'products';

-- 檢查 policies 是否正確
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE '%products%';
