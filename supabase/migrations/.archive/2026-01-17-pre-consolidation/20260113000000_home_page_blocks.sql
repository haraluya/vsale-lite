-- ================================================
-- Vsale-lite Home Page Blocks Schema Migration
-- Feature: 016-home-page-blocks
-- Date: 2026-01-13
-- ================================================

-- 1. 建立首頁廣告區塊表
CREATE TABLE home_page_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('image_carousel', 'product_display', 'text_block')),
  config JSONB NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 建立索引
CREATE INDEX idx_home_blocks_active_sort ON home_page_blocks(is_active, sort_order);
CREATE INDEX idx_home_blocks_type ON home_page_blocks(block_type);

-- 3. 建立觸發器（自動更新 updated_at）
CREATE TRIGGER update_home_page_blocks_updated_at
BEFORE UPDATE ON home_page_blocks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. 新增註解
COMMENT ON TABLE home_page_blocks IS '首頁廣告區塊表（支援圖片輪播、商品展示、文字區塊）';
COMMENT ON COLUMN home_page_blocks.block_type IS '區塊類型：image_carousel（圖片輪播）、product_display（商品展示）、text_block（文字區塊）';
COMMENT ON COLUMN home_page_blocks.config IS '區塊配置（JSONB）：依 block_type 不同結構';
COMMENT ON COLUMN home_page_blocks.sort_order IS '排序順序（數字越小越靠前）';
COMMENT ON COLUMN home_page_blocks.is_active IS '是否啟用（僅啟用的區塊會顯示在前台）';

-- 5. 啟用 RLS
ALTER TABLE home_page_blocks ENABLE ROW LEVEL SECURITY;

-- 6. 建立 RLS 策略
CREATE POLICY "allow_authenticated_users_to_read_active_blocks"
  ON home_page_blocks FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "allow_admin_to_manage_blocks"
  ON home_page_blocks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
