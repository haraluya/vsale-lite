/**
 * Migration: 允許管理員直接上傳商品圖片至 Supabase Storage
 *
 * Feature: 圖片上傳超時問題改善
 * Purpose: 允許前端直接上傳圖片至 Storage，繞過 Vercel Serverless 30 秒超時限制
 *
 * Security:
 * - 僅允許已認證的管理員（profiles.role = 'admin'）上傳/刪除
 * - 僅能操作 'products' bucket
 * - 所有使用者可讀取（公開圖片）
 *
 * Created: 2026-01-29
 */

-- ============================================
-- Storage Policies for Products Bucket
-- ============================================

-- 1️⃣ 允許管理員上傳商品圖片
CREATE POLICY "管理員可上傳商品圖片"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'products' AND
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- 2️⃣ 允許管理員刪除商品圖片
CREATE POLICY "管理員可刪除商品圖片"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'products' AND
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- 3️⃣ 允許管理員更新商品圖片（覆寫）
CREATE POLICY "管理員可更新商品圖片"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'products' AND
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'products' AND
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- ============================================
-- 驗證政策是否正確套用
-- ============================================

-- 檢查現有的 Storage 政策
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
