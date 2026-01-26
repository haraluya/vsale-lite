-- Migration: 修復 system_settings 的 RLS 政策，允許匿名使用者查詢公開設定
-- Issue: getPublicSettings() 在首頁載入時失敗，因為匿名使用者無法查詢
-- Solution: 修改 "Public can view public settings" 政策，明確允許 anon 角色

-- 刪除舊的公開查詢政策
DROP POLICY IF EXISTS "Public can view public settings" ON "public"."system_settings";

-- 建立新的公開查詢政策（允許匿名 + 已認證使用者）
CREATE POLICY "Public can view public settings"
ON "public"."system_settings"
FOR SELECT
TO anon, authenticated
USING ("is_public" = true);

-- 註解說明
COMMENT ON POLICY "Public can view public settings" ON "public"."system_settings"
IS '允許匿名和已認證使用者查詢 is_public = true 的系統設定（用於首頁、登入頁等公開頁面）';
