-- ============================================================================
-- Migration: 優惠券系統
-- Feature: 009-coupon-system
-- Date: 2026-01-07
-- ============================================================================

-- 1. 建立 coupons 表（優惠券主表）
-- ============================================================================

CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL CHECK (code ~ '^[A-Z0-9]+$'),
  code_normalized VARCHAR(20) GENERATED ALWAYS AS (UPPER(code)) STORED,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value DECIMAL(10, 2) NOT NULL CHECK (
    (discount_type = 'fixed' AND discount_value > 0) OR
    (discount_type = 'percentage' AND discount_value >= 1 AND discount_value <= 100)
  ),
  min_order_amount DECIMAL(10, 2) CHECK (min_order_amount >= 0),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (valid_until > valid_from),
  CONSTRAINT code_length CHECK (LENGTH(code) BETWEEN 4 AND 20)
);

-- 唯一性約束（基於大寫版本）
CREATE UNIQUE INDEX idx_coupons_code_normalized ON coupons(code_normalized) WHERE status != 'deleted';

-- 查詢索引
CREATE INDEX idx_coupons_status ON coupons(status);
CREATE INDEX idx_coupons_valid_time ON coupons(valid_from, valid_until);
CREATE INDEX idx_coupons_discount_type ON coupons(discount_type);

-- 自動更新 updated_at
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 註解
COMMENT ON TABLE coupons IS '優惠券主表';
COMMENT ON COLUMN coupons.code IS '優惠券代碼（管理員輸入，4-20 字元，僅允許英數字）';
COMMENT ON COLUMN coupons.code_normalized IS '自動轉大寫的優惠券代碼（用於唯一性檢查與查詢）';
COMMENT ON COLUMN coupons.discount_type IS '折扣方式：fixed (現金折扣) 或 percentage (百分比折扣)';
COMMENT ON COLUMN coupons.discount_value IS '折扣值（現金折扣：固定金額；百分比折扣：1-100 代表折扣百分比）';
COMMENT ON COLUMN coupons.min_order_amount IS '最低訂單金額限制（選填，NULL 表示無限制）';
COMMENT ON COLUMN coupons.status IS '優惠券狀態：active (啟用), inactive (停用), deleted (已刪除)';

-- 2. 建立 coupon_tier_restrictions 表（優惠券等級限制）
-- ============================================================================

CREATE TABLE coupon_tier_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (coupon_id, tier_id)
);

CREATE INDEX idx_coupon_tier_restrictions_coupon_id ON coupon_tier_restrictions(coupon_id);
CREATE INDEX idx_coupon_tier_restrictions_tier_id ON coupon_tier_restrictions(tier_id);

COMMENT ON TABLE coupon_tier_restrictions IS '優惠券等級限制表（多對多關聯）';
COMMENT ON COLUMN coupon_tier_restrictions.coupon_id IS '優惠券 ID';
COMMENT ON COLUMN coupon_tier_restrictions.tier_id IS '會員等級 ID';

-- 3. 建立 coupon_series_restrictions 表（優惠券系列限制）
-- ============================================================================

CREATE TABLE coupon_series_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (coupon_id, series_id)
);

CREATE INDEX idx_coupon_series_restrictions_coupon_id ON coupon_series_restrictions(coupon_id);
CREATE INDEX idx_coupon_series_restrictions_series_id ON coupon_series_restrictions(series_id);

COMMENT ON TABLE coupon_series_restrictions IS '優惠券系列限制表（多對多關聯）';
COMMENT ON COLUMN coupon_series_restrictions.coupon_id IS '優惠券 ID';
COMMENT ON COLUMN coupon_series_restrictions.series_id IS '商品系列 ID';

-- 4. 建立 user_coupons 表（客戶優惠券領取記錄）
-- ============================================================================

CREATE TABLE user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  UNIQUE (user_id, coupon_id)
);

CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_coupon_id ON user_coupons(coupon_id);
CREATE INDEX idx_user_coupons_used_at ON user_coupons(used_at);

COMMENT ON TABLE user_coupons IS '客戶優惠券領取記錄表';
COMMENT ON COLUMN user_coupons.user_id IS '客戶 ID';
COMMENT ON COLUMN user_coupons.coupon_id IS '優惠券 ID';
COMMENT ON COLUMN user_coupons.claimed_at IS '領取時間';
COMMENT ON COLUMN user_coupons.used_at IS '使用時間（NULL 表示未使用）';
COMMENT ON COLUMN user_coupons.order_id IS '使用於哪個訂單（選填）';

-- 5. 建立 order_coupons 表（訂單優惠券快照）
-- ============================================================================

CREATE TABLE order_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  coupon_code VARCHAR(20) NOT NULL,
  discount_type VARCHAR(20) NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (order_id)
);

CREATE INDEX idx_order_coupons_order_id ON order_coupons(order_id);
CREATE INDEX idx_order_coupons_coupon_code ON order_coupons(coupon_code);

COMMENT ON TABLE order_coupons IS '訂單優惠券快照表（不使用 FK，保留歷史記錄）';
COMMENT ON COLUMN order_coupons.order_id IS '訂單 ID';
COMMENT ON COLUMN order_coupons.coupon_code IS '優惠券代碼快照（大寫）';
COMMENT ON COLUMN order_coupons.discount_type IS '折扣方式快照：fixed 或 percentage';
COMMENT ON COLUMN order_coupons.discount_value IS '折扣值快照';
COMMENT ON COLUMN order_coupons.discount_amount IS '實際折扣金額（訂單總額 - 折扣後金額）';

-- 6. 建立 active_coupons View（有效優惠券）
-- ============================================================================

CREATE VIEW active_coupons AS
SELECT * FROM coupons
WHERE status = 'active'
  AND NOW() BETWEEN valid_from AND valid_until;

COMMENT ON VIEW active_coupons IS '有效優惠券 View（自動過濾過期與已刪除）';

-- 7. 啟用 RLS
-- ============================================================================

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_tier_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_series_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_coupons ENABLE ROW LEVEL SECURITY;

-- 8. 建立 RLS Policies - coupons
-- ============================================================================

CREATE POLICY "Clients can view active coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (
    status = 'active' AND
    NOW() BETWEEN valid_from AND valid_until
  );

CREATE POLICY "Admins can view all coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage coupons"
  ON coupons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 9. 建立 RLS Policies - coupon_tier_restrictions
-- ============================================================================

CREATE POLICY "Authenticated users can view tier restrictions"
  ON coupon_tier_restrictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage tier restrictions"
  ON coupon_tier_restrictions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 10. 建立 RLS Policies - coupon_series_restrictions
-- ============================================================================

CREATE POLICY "Authenticated users can view series restrictions"
  ON coupon_series_restrictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage series restrictions"
  ON coupon_series_restrictions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 11. 建立 RLS Policies - user_coupons
-- ============================================================================

CREATE POLICY "Clients can view their own coupons"
  ON user_coupons FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user coupons"
  ON user_coupons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 12. 建立 RLS Policies - order_coupons
-- ============================================================================

CREATE POLICY "Clients can view their order coupons"
  ON order_coupons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_coupons.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order coupons"
  ON order_coupons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- Migration 完成
-- ============================================================================
