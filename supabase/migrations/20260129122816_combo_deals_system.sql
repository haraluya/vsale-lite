-- =====================================================
-- Migration: 組合優惠系統
-- Feature: 021-combo-deals
-- Created: 2026-01-29
-- Description: 實作組合優惠系統，支援各選和任選兩種模式
-- =====================================================

-- =====================================================
-- 1. combo_deals 主表
-- =====================================================
CREATE TABLE combo_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 100),
  poster_url TEXT NOT NULL,
  combo_mode TEXT NOT NULL CHECK (combo_mode IN ('each', 'mix_match')),
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL CHECK (end_date > start_date),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'ended')),
  display_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

COMMENT ON TABLE combo_deals IS '組合優惠主表';
COMMENT ON COLUMN combo_deals.combo_mode IS '組合模式：each=各選, mix_match=任選';
COMMENT ON COLUMN combo_deals.discount_type IS '折扣方式：fixed=固定折價, percentage=百分比折扣';
COMMENT ON COLUMN combo_deals.status IS '狀態：active=進行中, inactive=已停用, ended=已結束';

-- =====================================================
-- 2. combo_deal_series 系列關聯表
-- =====================================================
CREATE TABLE combo_deal_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_deal_id UUID NOT NULL REFERENCES combo_deals(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE RESTRICT,
  required_quantity INTEGER CHECK (required_quantity > 0 OR required_quantity IS NULL),
  display_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(combo_deal_id, series_id)
);

COMMENT ON TABLE combo_deal_series IS '組合優惠系列關聯表';
COMMENT ON COLUMN combo_deal_series.required_quantity IS '各選模式：需選數量；任選模式：NULL';

-- =====================================================
-- 3. combo_deal_tiers 等級限制表
-- =====================================================
CREATE TABLE combo_deal_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_deal_id UUID NOT NULL REFERENCES combo_deals(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES tiers(id) ON DELETE RESTRICT,
  UNIQUE(combo_deal_id, tier_id)
);

COMMENT ON TABLE combo_deal_tiers IS '組合優惠等級限制表';

-- =====================================================
-- 4. combo_deal_mix_match_config 任選模式配置表
-- =====================================================
CREATE TABLE combo_deal_mix_match_config (
  combo_deal_id UUID PRIMARY KEY REFERENCES combo_deals(id) ON DELETE CASCADE,
  total_quantity INTEGER NOT NULL CHECK (total_quantity > 0)
);

COMMENT ON TABLE combo_deal_mix_match_config IS '任選模式配置表（僅任選模式使用）';

-- =====================================================
-- 5. order_combo_deal_items 訂單組合優惠記錄表
-- =====================================================
CREATE TABLE order_combo_deal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  combo_deal_id UUID REFERENCES combo_deals(id) ON DELETE SET NULL,
  combo_deal_snapshot JSONB NOT NULL,
  product_ids JSONB NOT NULL,
  original_price DECIMAL(10,2) NOT NULL CHECK (original_price >= 0),
  discounted_price DECIMAL(10,2) NOT NULL CHECK (discounted_price >= 0),
  discount_amount DECIMAL(10,2) NOT NULL CHECK (discount_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE order_combo_deal_items IS '訂單組合優惠記錄表（含完整快照）';
COMMENT ON COLUMN order_combo_deal_items.combo_deal_snapshot IS '組合優惠完整快照（JSONB），刪除後仍可顯示';
COMMENT ON COLUMN order_combo_deal_items.product_ids IS '包含的商品 ID 陣列（JSONB）';

-- =====================================================
-- 6. coupon_combo_restrictions 優惠券組合優惠限制表
-- =====================================================
CREATE TABLE coupon_combo_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  combo_deal_id UUID REFERENCES combo_deals(id) ON DELETE CASCADE,
  UNIQUE(coupon_id, combo_deal_id)
);

COMMENT ON TABLE coupon_combo_restrictions IS '優惠券組合優惠限制表';
COMMENT ON COLUMN coupon_combo_restrictions.combo_deal_id IS 'NULL = 適用所有組合優惠';

-- =====================================================
-- 7. 建立索引
-- =====================================================

-- combo_deals 索引
CREATE INDEX idx_combo_deals_status ON combo_deals(status);
CREATE INDEX idx_combo_deals_dates ON combo_deals(start_date, end_date);
CREATE INDEX idx_combo_deals_created_by ON combo_deals(created_by);
CREATE INDEX idx_combo_deals_display_order ON combo_deals(display_order NULLS LAST);

-- combo_deal_series 索引
CREATE INDEX idx_combo_deal_series_combo ON combo_deal_series(combo_deal_id);
CREATE INDEX idx_combo_deal_series_series ON combo_deal_series(series_id);

-- combo_deal_tiers 索引
CREATE INDEX idx_combo_deal_tiers_combo ON combo_deal_tiers(combo_deal_id);
CREATE INDEX idx_combo_deal_tiers_tier ON combo_deal_tiers(tier_id);

-- order_combo_deal_items 索引
CREATE INDEX idx_order_combo_items_order ON order_combo_deal_items(order_id);
CREATE INDEX idx_order_combo_items_combo ON order_combo_deal_items(combo_deal_id);
CREATE INDEX idx_order_combo_items_snapshot ON order_combo_deal_items USING GIN (combo_deal_snapshot);

-- coupon_combo_restrictions 索引
CREATE INDEX idx_coupon_combo_restrictions_coupon ON coupon_combo_restrictions(coupon_id);
CREATE INDEX idx_coupon_combo_restrictions_combo ON coupon_combo_restrictions(combo_deal_id);

-- =====================================================
-- 8. RLS 策略
-- =====================================================

-- combo_deals RLS
ALTER TABLE combo_deals ENABLE ROW LEVEL SECURITY;

-- 客戶：僅可讀取 active 且期間內且符合等級的組合優惠
CREATE POLICY combo_deals_select_customer ON combo_deals
FOR SELECT TO authenticated
USING (
  status = 'active'
  AND start_date <= NOW()
  AND end_date >= NOW()
  AND EXISTS (
    SELECT 1 FROM combo_deal_tiers cdt
    INNER JOIN profiles p ON p.tier_id = cdt.tier_id
    WHERE cdt.combo_deal_id = combo_deals.id
      AND p.id = auth.uid()
  )
);

-- 管理員：可讀取所有
CREATE POLICY combo_deals_select_admin ON combo_deals
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 管理員：可執行所有操作
CREATE POLICY combo_deals_write_admin ON combo_deals
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- combo_deal_series RLS
ALTER TABLE combo_deal_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY combo_deal_series_select_all ON combo_deal_series
FOR SELECT TO authenticated
USING (true);

CREATE POLICY combo_deal_series_write_admin ON combo_deal_series
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- combo_deal_tiers RLS
ALTER TABLE combo_deal_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY combo_deal_tiers_select_all ON combo_deal_tiers
FOR SELECT TO authenticated
USING (true);

CREATE POLICY combo_deal_tiers_write_admin ON combo_deal_tiers
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- combo_deal_mix_match_config RLS
ALTER TABLE combo_deal_mix_match_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY combo_deal_mix_match_config_select_all ON combo_deal_mix_match_config
FOR SELECT TO authenticated
USING (true);

CREATE POLICY combo_deal_mix_match_config_write_admin ON combo_deal_mix_match_config
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- order_combo_deal_items RLS
ALTER TABLE order_combo_deal_items ENABLE ROW LEVEL SECURITY;

-- 客戶：僅可讀取自己的訂單
CREATE POLICY order_combo_items_select_customer ON order_combo_deal_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE id = order_combo_deal_items.order_id
      AND user_id = auth.uid()
  )
);

-- 管理員：可讀取所有
CREATE POLICY order_combo_items_select_admin ON order_combo_deal_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Server Action：可建立訂單組合優惠記錄
CREATE POLICY order_combo_items_insert_server ON order_combo_deal_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE id = order_combo_deal_items.order_id
      AND user_id = auth.uid()
  )
);

-- coupon_combo_restrictions RLS
ALTER TABLE coupon_combo_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY coupon_combo_restrictions_select_all ON coupon_combo_restrictions
FOR SELECT TO authenticated
USING (true);

CREATE POLICY coupon_combo_restrictions_write_admin ON coupon_combo_restrictions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =====================================================
-- 9. Trigger - 自動更新 updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_combo_deals
BEFORE UPDATE ON combo_deals
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- =====================================================
-- 10. 範例資料（開發測試用）
-- =====================================================

-- 注意：生產環境執行時請移除此區段
-- INSERT INTO combo_deals (name, poster_url, combo_mode, discount_type, discount_value, start_date, end_date, created_by)
-- SELECT '測試組合優惠', 'https://example.com/poster.jpg', 'each', 'fixed', 200, NOW(), NOW() + INTERVAL '30 days', id
-- FROM profiles LIMIT 1;
