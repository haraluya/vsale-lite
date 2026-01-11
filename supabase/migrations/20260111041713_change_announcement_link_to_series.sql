-- Migration: 將廣告連結 URL 改為系列 ID 關聯
-- Created: 2026-01-11
-- Description: 將 announcements.link_url 欄位改為 series_id，支援系列選擇器

-- Step 1: 新增 series_id 欄位（允許 NULL）
ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES series(id) ON DELETE SET NULL;

-- Step 2: 移除舊的 link_url 欄位
ALTER TABLE announcements
DROP COLUMN IF EXISTS link_url;

-- Step 3: 新增索引以優化查詢效能
CREATE INDEX IF NOT EXISTS idx_announcements_series_id ON announcements(series_id);

-- Step 4: 新增註解
COMMENT ON COLUMN announcements.series_id IS '關聯的系列 ID，點擊廣告時跳轉至該系列的商品頁面';
