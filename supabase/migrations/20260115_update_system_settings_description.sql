-- Migration: 更新系統設定描述與刪除不需要的欄位
-- Created: 2026-01-04
-- Description: 1. 將廣告輪播開關改為顯示/隱藏切換
--              2. 刪除建議圖片尺寸與客服電話欄位

-- =============================================
-- 1. 更新廣告輪播開關描述
-- =============================================

UPDATE system_settings
SET description = '廣告輪播顯示開關（開啟=顯示，關閉=隱藏）'
WHERE key = 'carousel_auto_play';

-- =============================================
-- 2. 刪除不需要的設定欄位
-- =============================================

-- 刪除建議圖片尺寸
DELETE FROM system_settings WHERE key = 'carousel_recommended_size';

-- 刪除客服電話
DELETE FROM system_settings WHERE key = 'customer_service_phone';

-- 註解：這兩個欄位不再需要，已從系統設定中移除
