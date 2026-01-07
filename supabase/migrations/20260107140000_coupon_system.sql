-- ============================================================================
-- Migration: M5 - 優惠券系統
-- Feature: 009-coupon-system
-- Date: 2026-01-07
-- Version: 1.0 (整合版)
-- ============================================================================
--
-- 此檔案整合以下 Migration:
-- - 20260119_create_coupons.sql (優惠券基礎資料表)
-- - 20260120_add_coupon_claim_limit.sql (領取張數限制)
-- - 20260121_add_order_coupons_insert_policy.sql (訂單優惠券 RLS)
--
-- 功能模組:
-- - 優惠券主表 (coupons)
-- - 優惠券等級限制 (coupon_tier_restrictions)
-- - 優惠券系列限制 (coupon_series_restrictions)
-- - 客戶優惠券領取記錄 (user_coupons)
-- - 訂單優惠券快照 (order_coupons)
-- - 有效優惠券 View (active_coupons)
--
-- ============================================================================

-- ============================================================================
-- 1. 建立 coupons 表（優惠券主表）
-- ============================================================================

CREATE TABLE IF NOT EXISTS coupons (
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
  claim_limit INTEGER NOT NULL DEFAULT 1 CHECK (claim_limit >= 1),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (valid_until > valid_from),
  CONSTRAINT code_length CHECK (LENGTH(code) BETWEEN 4 AND 20)
);

-- 索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_normalized
  ON coupons(code_normalized) WHERE status != 'deleted';
CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status);
CREATE INDEX IF NOT EXISTS idx_coupons_valid_time ON coupons(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_coupons_discount_type ON coupons(discount_type);

-- Trigger: 自動更新 updated_at
DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 註解
COMMENT ON TABLE coupons IS '優惠券主表 - 儲存優惠券代碼、折扣方式、使用限制、生效時間';
COMMENT ON COLUMN coupons.code IS '優惠券代碼（管理員輸入，4-20 字元，僅允許英數字）';
COMMENT ON COLUMN coupons.code_normalized IS '自動轉大寫的優惠券代碼（用於唯一性檢查與查詢，大小寫不敏感）';
COMMENT ON COLUMN coupons.discount_type IS '折扣方式：fixed (現金折扣) 或 percentage (百分比折扣)';
COMMENT ON COLUMN coupons.discount_value IS '折扣值（現金折扣：固定金額 NT$；百分比折扣：1-100 代表折扣百分比）';
COMMENT ON COLUMN coupons.min_order_amount IS '最低訂單金額限制（選填，NULL 表示無限制）';
COMMENT ON COLUMN coupons.valid_from IS '優惠券生效開始時間';
COMMENT ON COLUMN coupons.valid_until IS '優惠券生效結束時間';
COMMENT ON COLUMN coupons.claim_limit IS '每位客戶可領取張數上限（預設 1 張，支援多張領取）';
COMMENT ON COLUMN coupons.status IS '優惠券狀態：active (啟用), inactive (停用), deleted (已刪除)';
COMMENT ON COLUMN coupons.deleted_at IS '刪除時間（軟刪除）';

-- ============================================================================
-- 2. 建立 coupon_tier_restrictions 表（優惠券等級限制）
-- ============================================================================

CREATE TABLE IF NOT EXISTS coupon_tier_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (coupon_id, tier_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_coupon_tier_restrictions_coupon_id
  ON coupon_tier_restrictions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_tier_restrictions_tier_id
  ON coupon_tier_restrictions(tier_id);

-- 註解
COMMENT ON TABLE coupon_tier_restrictions IS '優惠券等級限制表 - 多對多關聯表，限制優惠券僅特定會員等級可使用';
COMMENT ON COLUMN coupon_tier_restrictions.coupon_id IS '優惠券 ID';
COMMENT ON COLUMN coupon_tier_restrictions.tier_id IS '會員等級 ID';

-- ============================================================================
-- 3. 建立 coupon_series_restrictions 表（優惠券系列限制）
-- ============================================================================

CREATE TABLE IF NOT EXISTS coupon_series_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (coupon_id, series_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_coupon_series_restrictions_coupon_id
  ON coupon_series_restrictions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_series_restrictions_series_id
  ON coupon_series_restrictions(series_id);

-- 註解
COMMENT ON TABLE coupon_series_restrictions IS '優惠券系列限制表 - 多對多關聯表，限制優惠券僅特定商品系列可使用';
COMMENT ON COLUMN coupon_series_restrictions.coupon_id IS '優惠券 ID';
COMMENT ON COLUMN coupon_series_restrictions.series_id IS '商品系列 ID';

-- ============================================================================
-- 4. 建立 user_coupons 表（客戶優惠券領取記錄）
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- 注意：不使用 UNIQUE (user_id, coupon_id) 以支援多張領取
  -- 領取張數限制改由 Server Action (claimCoupon) 檢查
  CHECK (
    (used_at IS NULL AND order_id IS NULL) OR
    (used_at IS NOT NULL AND order_id IS NOT NULL)
  )
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_coupon_id ON user_coupons(coupon_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_used_at ON user_coupons(used_at);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_coupon
  ON user_coupons(user_id, coupon_id);

-- 註解
COMMENT ON TABLE user_coupons IS '客戶優惠券領取記錄表 - 每次領取建立一筆記錄，支援同一優惠券多次領取';
COMMENT ON COLUMN user_coupons.user_id IS '客戶 ID';
COMMENT ON COLUMN user_coupons.coupon_id IS '優惠券 ID';
COMMENT ON COLUMN user_coupons.claimed_at IS '領取時間';
COMMENT ON COLUMN user_coupons.used_at IS '使用時間（NULL 表示未使用）';
COMMENT ON COLUMN user_coupons.order_id IS '使用於哪個訂單（NULL 表示未使用）';

-- ============================================================================
-- 5. 建立 order_coupons 表（訂單優惠券快照）
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  coupon_code VARCHAR(20) NOT NULL,
  discount_type VARCHAR(20) NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (order_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_order_coupons_order_id ON order_coupons(order_id);
CREATE INDEX IF NOT EXISTS idx_order_coupons_coupon_code ON order_coupons(coupon_code);

-- 註解
COMMENT ON TABLE order_coupons IS '訂單優惠券快照表 - 不使用 FK 到 coupons，永久保留優惠券資訊（即使優惠券被刪除）';
COMMENT ON COLUMN order_coupons.order_id IS '訂單 ID';
COMMENT ON COLUMN order_coupons.coupon_code IS '優惠券代碼快照（大寫）';
COMMENT ON COLUMN order_coupons.discount_type IS '折扣方式快照：fixed (現金折扣) 或 percentage (百分比折扣)';
COMMENT ON COLUMN order_coupons.discount_value IS '折扣值快照（現金折扣：固定金額；百分比折扣：1-100）';
COMMENT ON COLUMN order_coupons.discount_amount IS '實際折扣金額（訂單總額 - 折扣後金額，單位：NT$）';

-- ============================================================================
-- 6. 建立 active_coupons View（有效優惠券）
-- ============================================================================

CREATE OR REPLACE VIEW active_coupons AS
SELECT * FROM coupons
WHERE status = 'active'
  AND NOW() BETWEEN valid_from AND valid_until;

COMMENT ON VIEW active_coupons IS '有效優惠券 View - 自動過濾過期與已刪除優惠券，供前台查詢使用';

-- ============================================================================
-- 7. 啟用 RLS（Row Level Security）
-- ============================================================================

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_tier_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_series_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_coupons ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. RLS Policies - coupons
-- ============================================================================

-- 客戶僅能查看有效優惠券
CREATE POLICY "Clients can view active coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (
    status = 'active' AND
    NOW() BETWEEN valid_from AND valid_until
  );

-- 管理員可查看所有優惠券
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

-- 管理員可完整管理優惠券
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

-- ============================================================================
-- 9. RLS Policies - coupon_tier_restrictions
-- ============================================================================

-- 所有已認證使用者可查看等級限制（前台需驗證資格）
CREATE POLICY "Authenticated users can view tier restrictions"
  ON coupon_tier_restrictions FOR SELECT
  TO authenticated
  USING (true);

-- 管理員可完整管理等級限制
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

-- ============================================================================
-- 10. RLS Policies - coupon_series_restrictions
-- ============================================================================

-- 所有已認證使用者可查看系列限制（前台需驗證資格）
CREATE POLICY "Authenticated users can view series restrictions"
  ON coupon_series_restrictions FOR SELECT
  TO authenticated
  USING (true);

-- 管理員可完整管理系列限制
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

-- ============================================================================
-- 11. RLS Policies - user_coupons
-- ============================================================================

-- 客戶僅能查看自己領取的優惠券
CREATE POLICY "Clients can view their own coupons"
  ON user_coupons FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 管理員可查看所有客戶優惠券記錄
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

-- 客戶可領取優惠券（領取張數限制由 Server Action 檢查）
CREATE POLICY "Clients can claim coupons"
  ON user_coupons FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 12. RLS Policies - order_coupons
-- ============================================================================

-- 客戶可查看自己訂單的優惠券快照
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

-- 管理員可查看所有訂單優惠券快照
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

-- 客戶可在建立自己的訂單時插入優惠券快照
CREATE POLICY "Clients can insert order coupons for their own orders"
  ON order_coupons FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_coupons.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 管理員可為任何訂單插入優惠券快照
CREATE POLICY "Admins can insert order coupons"
  ON order_coupons FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- Migration 完成 - M5 優惠券系統
-- ============================================================================
--
-- 資料表數量: 5 個
-- - coupons (優惠券主表)
-- - coupon_tier_restrictions (等級限制)
-- - coupon_series_restrictions (系列限制)
-- - user_coupons (客戶領取記錄)
-- - order_coupons (訂單優惠券快照)
--
-- View 數量: 1 個
-- - active_coupons (有效優惠券)
--
-- RLS Policies 數量: 13 個
--
-- 關鍵特色:
-- - 優惠券代碼大小寫不敏感 (code_normalized)
-- - 支援多張領取 (claim_limit)
-- - 訂單優惠券永久快照 (不使用 FK)
-- - 等級限制與系列限制 (多對多關聯)
--
-- ============================================================================
