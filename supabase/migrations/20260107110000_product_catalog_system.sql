-- ================================================================
-- M2: 商品目錄系統
-- Migration Consolidation: 012-migration-consolidation
-- Created: 2026-01-07
-- ================================================================
-- 整合來源:
--   1. 20260102_products_and_categories.sql (categories, products 表)
--   2. 20260103_series_and_tier_prices.sql (系列與等級價格機制)
--   3. 20260105_retail_price_protection.sql (零售價格保護)
--   4. 20260106_add_series_code.sql (系列代碼)
--   5. 20260110_add_product_tags.sql (商品標籤)
--   6. 20260112_add_product_search_indexes.sql (搜尋索引)
--   7. 20260116_add_unique_name_constraints.sql (唯一性約束)
-- ================================================================

-- ================================================================
-- 1. CREATE TABLES
-- ================================================================

-- 商品分類表
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE categories IS '商品分類表：定義商品的頂層分類（如飲料、零食、日用品）';
COMMENT ON COLUMN categories.id IS '分類 ID（UUID）';
COMMENT ON COLUMN categories.code IS '分類代碼（3-10 個大寫字母，如 DRK, SNK, DAI）';
COMMENT ON COLUMN categories.name IS '分類名稱（如「飲料」、「零食」）';
COMMENT ON COLUMN categories.description IS '分類描述';
COMMENT ON COLUMN categories.status IS '狀態：active 顯示，inactive 隱藏';
COMMENT ON COLUMN categories.sort_order IS '排序順序（數字越小越前面）';
COMMENT ON COLUMN categories.created_at IS '建立時間';
COMMENT ON COLUMN categories.updated_at IS '最後更新時間';

-- 商品系列表
CREATE TABLE IF NOT EXISTS series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
  code VARCHAR(10) NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN series.id IS '系列 ID（UUID）';
COMMENT ON COLUMN series.category_id IS '所屬分類 ID，可為 NULL（未分類）';
COMMENT ON COLUMN series.code IS '系列代碼（3-10 個大寫字母，如 TEA, JUC）';
COMMENT ON COLUMN series.name IS '系列名稱（如「美粒果系列」）';
COMMENT ON COLUMN series.description IS '系列描述';
COMMENT ON COLUMN series.image_url IS '系列圖片 URL';
COMMENT ON COLUMN series.status IS '系列狀態：active 顯示，inactive 隱藏';
COMMENT ON COLUMN series.sort_order IS '排序順序（數字越小越前面）';
COMMENT ON COLUMN series.created_at IS '建立時間';
COMMENT ON COLUMN series.updated_at IS '最後更新時間';

-- 商品表
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE RESTRICT,
  description TEXT,
  retail_price DECIMAL(10, 2) NOT NULL CHECK (retail_price >= 0),
  stock INTEGER NOT NULL DEFAULT 0,
  stock_status TEXT DEFAULT 'sufficient' CHECK (stock_status IN ('sufficient', 'low', 'out_of_stock')),
  unit TEXT NOT NULL DEFAULT '件',
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE products IS '商品表：儲存所有商品資訊（商品編號、名稱、庫存、價格等）';
COMMENT ON COLUMN products.id IS '商品 ID（UUID）';
COMMENT ON COLUMN products.code IS '商品編號（自動生成，格式：[分類代碼]-[系列代碼]-[01]，如 DRK-TEA-01）';
COMMENT ON COLUMN products.name IS '商品名稱（必須唯一）';
COMMENT ON COLUMN products.series_id IS '所屬系列 ID（必填）';
COMMENT ON COLUMN products.description IS '商品描述';
COMMENT ON COLUMN products.retail_price IS '零售價格（必填）- 產品的基準價格，所有等級價格以此為參考';
COMMENT ON COLUMN products.stock IS '庫存數量（支援負庫存）';
COMMENT ON COLUMN products.stock_status IS '庫存狀態：sufficient 充足、low 緊張、out_of_stock 缺貨（與實際庫存數量分離）';
COMMENT ON COLUMN products.unit IS '單位（如「件」、「箱」、「瓶」）';
COMMENT ON COLUMN products.image_url IS '商品圖片 URL';
COMMENT ON COLUMN products.tags IS '商品標籤陣列，如 {"熱銷", "新品", "限量"}，最多 5 個';
COMMENT ON COLUMN products.status IS '狀態：active 顯示，inactive 隱藏';
COMMENT ON COLUMN products.created_at IS '建立時間';
COMMENT ON COLUMN products.updated_at IS '最後更新時間';

-- 等級價格表
CREATE TABLE IF NOT EXISTS tier_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tier_id, product_id)
);

COMMENT ON TABLE tier_prices IS '等級價格表：儲存每個商品在每個會員等級的對應價格';
COMMENT ON COLUMN tier_prices.id IS '價格記錄 ID（UUID）';
COMMENT ON COLUMN tier_prices.tier_id IS '會員等級 ID';
COMMENT ON COLUMN tier_prices.product_id IS '商品 ID';
COMMENT ON COLUMN tier_prices.price IS '該等級對應的價格';
COMMENT ON COLUMN tier_prices.created_at IS '建立時間';
COMMENT ON COLUMN tier_prices.updated_at IS '最後更新時間';

-- ================================================================
-- 2. ADD CONSTRAINTS
-- ================================================================

-- 分類代碼格式檢查
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_categories_code_format'
  ) THEN
    ALTER TABLE categories ADD CONSTRAINT check_categories_code_format
      CHECK (code ~ '^[A-Z]{3,10}$');
  END IF;
END $$;

-- 系列代碼格式檢查
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_series_code_format'
  ) THEN
    ALTER TABLE series ADD CONSTRAINT check_series_code_format
      CHECK (code ~ '^[A-Z]{3,10}$');
  END IF;
END $$;

-- 商品標籤數量限制
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_products_tags_length'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT check_products_tags_length
      CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 5);
  END IF;
END $$;

-- ================================================================
-- 3. CREATE INDEXES
-- ================================================================

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_code ON categories(code);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);

-- Series indexes
CREATE INDEX IF NOT EXISTS idx_series_category_id ON series(category_id);
CREATE INDEX IF NOT EXISTS idx_series_code ON series(code);
CREATE INDEX IF NOT EXISTS idx_series_name ON series(name);
CREATE INDEX IF NOT EXISTS idx_series_status ON series(status);
CREATE INDEX IF NOT EXISTS idx_series_sort_order ON series(sort_order);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_series_id ON products(series_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_stock_status ON products(stock_status);
CREATE INDEX IF NOT EXISTS idx_products_status_updated_at ON products(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);

-- Tier Prices indexes
CREATE INDEX IF NOT EXISTS idx_tier_prices_tier_id ON tier_prices(tier_id);
CREATE INDEX IF NOT EXISTS idx_tier_prices_product_id ON tier_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_tier_prices_lookup ON tier_prices(tier_id, product_id);

-- Index comments
COMMENT ON INDEX idx_products_name IS '商品名稱索引 - 用於全域搜尋';
COMMENT ON INDEX idx_products_code IS '商品編號索引 - 用於全域搜尋';
COMMENT ON INDEX idx_products_status IS '商品狀態索引 - 用於篩選 active 商品';
COMMENT ON INDEX idx_products_status_updated_at IS '商品狀態與更新時間組合索引 - 用於前台商品列表排序';
COMMENT ON INDEX idx_products_tags IS '商品標籤 GIN 索引 - 支援陣列查詢';

-- ================================================================
-- 4. CREATE TRIGGERS
-- ================================================================

-- Categories trigger
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Series trigger
DROP TRIGGER IF EXISTS update_series_updated_at ON series;
CREATE TRIGGER update_series_updated_at
BEFORE UPDATE ON series
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Products trigger
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Tier Prices trigger
DROP TRIGGER IF EXISTS update_tier_prices_updated_at ON tier_prices;
CREATE TRIGGER update_tier_prices_updated_at
BEFORE UPDATE ON tier_prices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 5. CREATE FUNCTIONS
-- ================================================================

-- 自動產生商品編號函數
CREATE OR REPLACE FUNCTION generate_product_code(p_series_id UUID)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
  v_category_code VARCHAR(10);
  v_series_code VARCHAR(10);
  v_max_number INTEGER;
  v_new_code VARCHAR(50);
BEGIN
  -- 1. 取得系列代碼與分類代碼
  SELECT c.code, s.code INTO v_category_code, v_series_code
  FROM series s
  INNER JOIN categories c ON s.category_id = c.id
  WHERE s.id = p_series_id;

  IF v_category_code IS NULL OR v_series_code IS NULL THEN
    RAISE EXCEPTION '無法找到系列對應的分類代碼或系列代碼';
  END IF;

  -- 2. 查詢該系列下已存在的最大流水號
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(p.code FROM '(\d+)$') AS INTEGER)),
    0
  ) INTO v_max_number
  FROM products p
  WHERE p.series_id = p_series_id
    AND p.code ~ ('^' || v_category_code || '-' || v_series_code || '-\d{2}$');

  -- 3. 產生新編號（兩位數流水號）
  v_new_code := v_category_code || '-' || v_series_code || '-' || LPAD((v_max_number + 1)::TEXT, 2, '0');

  RETURN v_new_code;
END;
$$;

COMMENT ON FUNCTION generate_product_code(UUID) IS '自動產生商品編號：[分類代碼]-[系列代碼]-[兩位流水號]（如 DRK-TEA-01）';

-- Trigger Function：在插入商品前自動產生編號
CREATE OR REPLACE FUNCTION auto_generate_product_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := generate_product_code(NEW.series_id);
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_generate_product_code() IS '觸發器函數：商品建立時自動產生商品編號';

-- 建立 Trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_product_code ON products;
CREATE TRIGGER trigger_auto_generate_product_code
BEFORE INSERT ON products
FOR EACH ROW
EXECUTE FUNCTION auto_generate_product_code();

COMMENT ON TRIGGER trigger_auto_generate_product_code ON products IS '商品建立時自動產生商品編號';

-- ================================================================
-- 6. INSERT DEFAULT DATA
-- ================================================================

-- 插入預設分類
INSERT INTO categories (code, name, description, sort_order) VALUES
  ('DRK', '飲料', '各式飲料商品', 1),
  ('SNK', '零食', '零食與點心', 2),
  ('DAI', '日用品', '日常用品', 3)
ON CONFLICT (code) DO NOTHING;

-- ================================================================
-- 7. CREATE STORAGE BUCKET
-- ================================================================

-- 建立 Supabase Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('products', 'products', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_prices ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 9. CREATE RLS POLICIES
-- ================================================================

-- Categories Policies
-- 允許所有已認證使用者讀取分類
DROP POLICY IF EXISTS "Allow authenticated users to read categories" ON categories;
CREATE POLICY "Allow authenticated users to read categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON POLICY "Allow authenticated users to read categories" ON categories IS '允許所有已認證使用者讀取分類';

-- 允許管理員管理分類
DROP POLICY IF EXISTS "Allow admin to manage categories" ON categories;
CREATE POLICY "Allow admin to manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMENT ON POLICY "Allow admin to manage categories" ON categories IS '僅允許管理員新增、修改、刪除分類';

-- Series Policies
-- 允許已認證使用者讀取活躍系列
DROP POLICY IF EXISTS "Allow authenticated users to read active series" ON series;
CREATE POLICY "Allow authenticated users to read active series"
  ON series FOR SELECT
  TO authenticated
  USING (
    status = 'active' OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMENT ON POLICY "Allow authenticated users to read active series" ON series IS '允許客戶讀取活躍系列，管理員可讀取所有系列';

-- 允許管理員管理系列
DROP POLICY IF EXISTS "Allow admin to manage series" ON series;
CREATE POLICY "Allow admin to manage series"
  ON series FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMENT ON POLICY "Allow admin to manage series" ON series IS '僅允許管理員新增、修改、刪除系列';

-- Products Policies
-- 允許使用者讀取活躍商品
DROP POLICY IF EXISTS "Allow users to read active products in active series" ON products;
CREATE POLICY "Allow users to read active products in active series"
  ON products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM series s
      WHERE s.id = products.series_id
      AND (
        (products.status = 'active' AND s.status = 'active') OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
    )
  );

COMMENT ON POLICY "Allow users to read active products in active series" ON products IS '允許客戶讀取活躍系列中的活躍商品，管理員可讀取所有商品';

-- 允許管理員管理商品
DROP POLICY IF EXISTS "Allow admin to manage products" ON products;
CREATE POLICY "Allow admin to manage products"
  ON products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMENT ON POLICY "Allow admin to manage products" ON products IS '僅允許管理員新增、修改、刪除商品';

-- Tier Prices Policies
-- 允許已認證使用者讀取等級價格
DROP POLICY IF EXISTS "Allow authenticated users to read tier_prices" ON tier_prices;
CREATE POLICY "Allow authenticated users to read tier_prices"
  ON tier_prices FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON POLICY "Allow authenticated users to read tier_prices" ON tier_prices IS '允許所有已認證使用者讀取等級價格（Server Action 會過濾）';

-- 允許管理員管理等級價格
DROP POLICY IF EXISTS "Allow admin to manage tier_prices" ON tier_prices;
CREATE POLICY "Allow admin to manage tier_prices"
  ON tier_prices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMENT ON POLICY "Allow admin to manage tier_prices" ON tier_prices IS '僅允許管理員新增、修改、刪除等級價格';

-- Storage Policies
-- 允許公開讀取商品圖片
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'products');

-- 允許管理員上傳商品圖片
DROP POLICY IF EXISTS "Allow admin to upload" ON storage.objects;
CREATE POLICY "Allow admin to upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'products' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 允許管理員更新商品圖片
DROP POLICY IF EXISTS "Allow admin to update" ON storage.objects;
CREATE POLICY "Allow admin to update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'products' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 允許管理員刪除商品圖片
DROP POLICY IF EXISTS "Allow admin to delete" ON storage.objects;
CREATE POLICY "Allow admin to delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'products' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '[M2] 商品目錄系統 - Migration 完成';
    RAISE NOTICE '  - 資料表: categories, series, products, tier_prices';
    RAISE NOTICE '  - 預設資料: 3 個分類（飲料、零食、日用品）';
    RAISE NOTICE '  - RLS Policies: 13 個（含 Storage）';
    RAISE NOTICE '  - Functions: 2 個（商品編號自動生成）';
    RAISE NOTICE '  - Storage Bucket: products (5MB limit)';
END $$;
