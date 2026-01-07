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

-- 3. 領取張數限制檢查改為在 Server Action 中執行
-- ============================================================================
--
-- 注意：原本使用 Trigger 檢查領取張數上限，但會導致批次 INSERT 失敗：
-- - 批次插入 2 筆記錄時，第 2 筆會被 Trigger 阻擋（因為第 1 筆已存在）
--
-- 解決方案：將檢查邏輯移到 Server Action (claimCoupon) 中執行
-- - Server Action 先查詢已領取張數
-- - 計算剩餘可領取張數
-- - 批次插入所有剩餘張數
--
-- 這樣可以確保一次領取多張優惠券時不會被 Trigger 阻擋。

-- 刪除舊的 Trigger 和 Function（如果存在）
DROP TRIGGER IF EXISTS trigger_check_coupon_claim_limit ON user_coupons;
DROP FUNCTION IF EXISTS check_coupon_claim_limit();

-- 5. 重建 active_coupons view（包含新增的 claim_limit 欄位）
-- ============================================================================
--
-- 重要：由於 PostgreSQL view 會「快照」建立時的欄位列表，
-- 當我們新增 claim_limit 欄位後，必須重建 view 才能包含新欄位。

DROP VIEW IF EXISTS active_coupons;

CREATE VIEW active_coupons AS
SELECT * FROM coupons
WHERE status = 'active'
  AND NOW() BETWEEN valid_from AND valid_until;

COMMENT ON VIEW active_coupons IS '有效優惠券 View（自動過濾過期與已刪除）';

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
