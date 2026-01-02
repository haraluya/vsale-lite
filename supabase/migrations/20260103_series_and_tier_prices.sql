-- ================================================
-- Vsale-lite Series and Tier Prices Migration
-- Feature: 003-series-and-pricing
-- Date: 2026-01-02
-- Description: 升級商品管理系統為三層階層架構，實作等級價格機制
-- ================================================

-- ================================================
-- Phase 1: 新增資料表與欄位
-- ================================================

-- 1.1 修改 categories 表：新增分類代碼與狀態欄位
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS code VARCHAR(10) UNIQUE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- 更新現有資料（設定預設代碼）
UPDATE categories SET code = 'DRK' WHERE name = '飲料' AND code IS NULL;
UPDATE categories SET code = 'SNK' WHERE name = '零食' AND code IS NULL;
UPDATE categories SET code = 'DAI' WHERE name = '日用品' AND code IS NULL;

-- 設為必填
ALTER TABLE categories
  ALTER COLUMN code SET NOT NULL;

-- 新增約束與索引（使用 IF NOT EXISTS）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_code_format'
  ) THEN
    ALTER TABLE categories ADD CONSTRAINT check_code_format
      CHECK (code ~ '^[A-Z]{3,10}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_code ON categories(code);
CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);

-- 1.2 建立 series 表（系列）
CREATE TABLE series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_series_category_id ON series(category_id);
CREATE INDEX idx_series_status ON series(status);
CREATE INDEX idx_series_sort_order ON series(sort_order);

-- 觸發器
CREATE TRIGGER update_series_updated_at
  BEFORE UPDATE ON series
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE series IS '商品系列表：組織商品的中間層，如「美粒果系列果汁」';
COMMENT ON COLUMN series.category_id IS '所屬分類 ID，可為 NULL（未分類）';
COMMENT ON COLUMN series.status IS '系列狀態：active 顯示，inactive 隱藏';

-- 1.3 建立 tier_prices 表（等級價格）
CREATE TABLE tier_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tier_id, product_id)
);

-- 索引
CREATE INDEX idx_tier_prices_tier_id ON tier_prices(tier_id);
CREATE INDEX idx_tier_prices_product_id ON tier_prices(product_id);
CREATE INDEX idx_tier_prices_lookup ON tier_prices(tier_id, product_id);

-- 觸發器
CREATE TRIGGER update_tier_prices_updated_at
  BEFORE UPDATE ON tier_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE tier_prices IS '等級價格表：儲存每個商品在每個會員等級的對應價格';
COMMENT ON COLUMN tier_prices.price IS '該等級對應的價格';

-- 1.4 修改 products 表：新增新欄位
ALTER TABLE products
  ADD COLUMN retail_price DECIMAL(10, 2) CHECK (retail_price >= 0),
  ADD COLUMN stock_status TEXT DEFAULT 'sufficient'
    CHECK (stock_status IN ('sufficient', 'low', 'out_of_stock'));

-- 新增 series_id（暫時 NULLABLE，稍後資料遷移後改為 NOT NULL）
ALTER TABLE products
  ADD COLUMN series_id UUID REFERENCES series(id) ON DELETE RESTRICT;

CREATE INDEX idx_products_series_id ON products(series_id);
CREATE INDEX idx_products_stock_status ON products(stock_status);

COMMENT ON COLUMN products.retail_price IS '原價/建議售價，用於顯示折扣力度';
COMMENT ON COLUMN products.stock_status IS '庫存狀態：sufficient 充足、low 緊張、out_of_stock 缺貨（與實際庫存數量分離）';
COMMENT ON COLUMN products.series_id IS '所屬系列 ID（取代原有的 category_id）';

-- ================================================
-- Phase 2: 資料遷移
-- ================================================

-- 2.1 為每個分類建立「未分類系列」
INSERT INTO series (category_id, name, description, status, sort_order)
SELECT
  id,
  name || ' - 未分類',
  '自動遷移的商品暫存系列',
  'active',
  999
FROM categories;

-- 2.2 將現有商品遷移到對應的「未分類系列」
UPDATE products p
SET series_id = s.id
FROM series s
INNER JOIN categories c ON s.category_id = c.id
WHERE p.category_id = c.id
  AND s.name LIKE '%未分類%';

-- 2.3 驗證：檢查是否所有商品都有 series_id
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM products WHERE series_id IS NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION '資料遷移失敗：仍有 % 個商品未設定 series_id', v_count;
  END IF;
  RAISE NOTICE '資料遷移成功：所有商品已遷移到系列';
END $$;

-- 2.4 設定 series_id 為必填
ALTER TABLE products
  ALTER COLUMN series_id SET NOT NULL;

-- 2.5 刪除 category_id 欄位（商品不再直接關聯分類）
ALTER TABLE products
  DROP COLUMN category_id;

-- ================================================
-- Phase 3: 商品編號自動產生邏輯
-- ================================================

-- 3.1 PostgreSQL Function：自動產生商品編號
CREATE OR REPLACE FUNCTION generate_product_code(p_series_id UUID)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
  v_category_code VARCHAR(10);
  v_max_number INTEGER;
  v_new_code VARCHAR(50);
BEGIN
  -- 1. 取得系列所屬分類的代碼
  SELECT c.code INTO v_category_code
  FROM series s
  INNER JOIN categories c ON s.category_id = c.id
  WHERE s.id = p_series_id;

  IF v_category_code IS NULL THEN
    RAISE EXCEPTION '無法找到系列對應的分類代碼';
  END IF;

  -- 2. 查詢該分類下已存在的最大流水號
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(p.code FROM '\d+') AS INTEGER)),
    0
  ) INTO v_max_number
  FROM products p
  INNER JOIN series s ON p.series_id = s.id
  INNER JOIN categories c ON s.category_id = c.id
  WHERE c.code = v_category_code
    AND p.code ~ ('^' || v_category_code || '-\d{4}$');

  -- 3. 產生新編號
  v_new_code := v_category_code || '-' || LPAD((v_max_number + 1)::TEXT, 4, '0');

  RETURN v_new_code;
END;
$$;

COMMENT ON FUNCTION generate_product_code(UUID) IS '自動產生商品編號：分類代碼 + 4 位流水號（如 DRK-0001）';

-- 3.2 Trigger Function：在插入商品前自動產生編號
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

-- 3.3 建立 Trigger
CREATE TRIGGER trigger_auto_generate_product_code
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_product_code();

COMMENT ON TRIGGER trigger_auto_generate_product_code ON products IS '商品建立時自動產生商品編號';

-- ================================================
-- Phase 4: RLS 策略
-- ================================================

-- 4.1 系列表 RLS
ALTER TABLE series ENABLE ROW LEVEL SECURITY;

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

-- 4.2 等級價格表 RLS
ALTER TABLE tier_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read tier_prices"
  ON tier_prices FOR SELECT
  TO authenticated
  USING (true);  -- 所有用戶可讀，Server Action 會過濾

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

-- 4.3 更新 products RLS（改為透過 series 判斷 active）
DROP POLICY IF EXISTS "Allow users to read products" ON products;

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

-- ================================================
-- Phase 5: 驗證與測試
-- ================================================

-- 5.1 驗證資料完整性
DO $$
DECLARE
  v_series_count INTEGER;
  v_products_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_series_count FROM series;
  SELECT COUNT(*) INTO v_products_count FROM products;

  RAISE NOTICE '資料遷移完成統計：';
  RAISE NOTICE '- 系列數量：%', v_series_count;
  RAISE NOTICE '- 商品數量：%', v_products_count;
  RAISE NOTICE '- 所有商品已遷移到系列：✓';
END $$;

-- 5.2 測試自動編號生成（測試用，實際不執行）
-- INSERT INTO products (series_id, name, stock, unit, status)
-- SELECT id, '測試商品', 0, '件', 'active'
-- FROM series LIMIT 1;
--
-- SELECT code FROM products ORDER BY created_at DESC LIMIT 1;
-- 預期結果：DRK-0001（假設飲料分類的系列）

-- ================================================
-- Migration 完成
-- ================================================

-- 記錄 Migration 版本與執行時間
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration 完成: 003-series-and-tier-prices';
  RAISE NOTICE '執行時間: %', NOW();
  RAISE NOTICE '==============================================';
END $$;
