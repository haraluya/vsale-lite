-- ============================================================================
-- Migration: 新增優惠券領取張數限制
-- ============================================================================
--
-- 功能: 每個優惠券可設定客戶領取張數上限（預設為 1 張）
-- 需求: 前台如果可領取 2 張則顯示 2 個獨立 UI card，而非顯示 x2
--
-- Feature: 009-coupon-system
-- Date: 2026-01-06
-- ============================================================================

-- 1. 新增 claim_limit 欄位（預設 1 張）
-- ============================================================================

ALTER TABLE coupons
ADD COLUMN claim_limit INTEGER NOT NULL DEFAULT 1
CHECK (claim_limit >= 1);

COMMENT ON COLUMN coupons.claim_limit IS '每位客戶可領取張數上限（預設 1 張）';

-- 2. 修改 user_coupons 唯一性約束（允許同一客戶多次領取）
-- ============================================================================

-- 刪除舊的唯一性約束
ALTER TABLE user_coupons
DROP CONSTRAINT IF EXISTS user_coupons_user_id_coupon_id_key;

-- 新增複合索引（用於檢查領取張數）
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_coupon
  ON user_coupons(user_id, coupon_id);

-- 3. 建立檢查 Function（檢查是否超過領取張數限制）
-- ============================================================================

CREATE OR REPLACE FUNCTION check_coupon_claim_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_claim_limit INTEGER;
  v_claimed_count INTEGER;
BEGIN
  -- 取得優惠券的領取張數上限
  SELECT claim_limit INTO v_claim_limit
  FROM coupons
  WHERE id = NEW.coupon_id;

  -- 計算該客戶已領取的張數
  SELECT COUNT(*) INTO v_claimed_count
  FROM user_coupons
  WHERE user_id = NEW.user_id
    AND coupon_id = NEW.coupon_id;

  -- 檢查是否超過限制
  IF v_claimed_count >= v_claim_limit THEN
    RAISE EXCEPTION '已達領取張數上限（%/%）', v_claimed_count, v_claim_limit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 建立 Trigger（領取時自動檢查）
-- ============================================================================

CREATE TRIGGER trigger_check_coupon_claim_limit
  BEFORE INSERT ON user_coupons
  FOR EACH ROW
  EXECUTE FUNCTION check_coupon_claim_limit();

-- ============================================================================
-- 驗證 SQL
-- ============================================================================
--
-- 測試步驟:
-- 1. 建立一張可領取 2 張的優惠券:
--    UPDATE coupons SET claim_limit = 2 WHERE code_normalized = 'WELCOME100';
--
-- 2. 客戶第一次領取應該成功
-- 3. 客戶第二次領取應該成功
-- 4. 客戶第三次領取應該失敗（超過限制）
--
-- ============================================================================
