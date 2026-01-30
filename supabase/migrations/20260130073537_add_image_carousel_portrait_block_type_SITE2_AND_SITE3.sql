-- ==================================================
-- 站點 2 和站點 3 同步 SQL (手動執行)
-- ==================================================
-- Migration: 20260130073537
-- Purpose: 將 image_carousel_portrait 加入 home_page_blocks.block_type 允許的類型列表
--
-- 執行方式：
-- 站點 2: https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs/sql/new
-- 站點 3: https://supabase.com/dashboard/project/dewhcpfzrzewgknaqzwy/sql/new
--
-- 複製下方完整 SQL 並執行
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
-- 執行完成後，請在站點 2 和站點 3 分別確認：
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'home_page_blocks_block_type_check';
-- ==================================================
