-- ==================================================
-- 新增直向海報區塊類型 (image_carousel_portrait)
-- ==================================================
-- Migration: 20260130073537
-- Purpose: 將 image_carousel_portrait 加入 home_page_blocks.block_type 允許的類型列表
-- Related: Feature 016 - 首頁廣告區塊系統
--
-- IMPORTANT: 生產環境操作，執行前必須備份
-- ==================================================

-- 1. 刪除舊的 CHECK 約束
ALTER TABLE public.home_page_blocks
DROP CONSTRAINT IF EXISTS home_page_blocks_block_type_check;

-- 2. 新增更新後的 CHECK 約束（包含 image_carousel_portrait）
ALTER TABLE public.home_page_blocks
ADD CONSTRAINT home_page_blocks_block_type_check
CHECK (block_type = ANY (ARRAY[
  'image_carousel'::text,
  'image_carousel_portrait'::text,
  'product_display'::text,
  'text_block'::text
]));

-- 3. 更新註解
COMMENT ON COLUMN public.home_page_blocks.block_type IS
  '區塊類型：image_carousel（橫向 16:9 圖片輪播）、image_carousel_portrait（直向 4:5 海報輪播）、product_display（商品展示）、text_block（文字區塊）';

-- ==================================================
-- Migration 完成
-- ==================================================
-- 影響範圍:
-- - home_page_blocks 表的 block_type CHECK 約束已更新
-- - 現在支援 4 種區塊類型（新增 image_carousel_portrait）
--
-- 測試驗證:
-- - 嘗試建立直向 4:5 海報區塊，應該可以成功儲存
-- ==================================================
