-- ============================================================================
-- 測試資料：優惠券系統 (Feature 009)
-- ============================================================================
--
-- 用途: 為優惠券系統建立範例測試資料
-- 執行方式: 使用 Supabase Studio SQL Editor 或 psql
--
-- 前置條件:
-- - 已執行 20260119_create_coupons.sql Migration
-- - 已有測試客戶與等級資料（Feature 001）
-- - 已有測試系列與商品資料（Feature 003）
--
-- 測試資料包含:
-- 1. 4 張不同類型的優惠券
-- 2. 等級限制（VIP50 限批發會員）
-- 3. 系列限制（FRUITS30 限水果系列）
--
-- ============================================================================

-- 0. 清理舊的測試資料（可選）
-- ============================================================================

-- DELETE FROM user_coupons WHERE coupon_id IN (
--   SELECT id FROM coupons WHERE code_normalized IN ('WELCOME100', 'SUMMER20', 'VIP50', 'FRUITS30')
-- );
--
-- DELETE FROM coupons WHERE code_normalized IN ('WELCOME100', 'SUMMER20', 'VIP50', 'FRUITS30');

-- 1. 建立測試優惠券
-- ============================================================================

-- 優惠券 1: WELCOME100（現金折扣 $100，滿 $500 可用）
-- 用途: 測試現金折扣與最低金額限制
INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, valid_from, valid_until, status)
VALUES ('WELCOME100', 'fixed', 100, 500, NOW(), NOW() + INTERVAL '30 days', 'active')
ON CONFLICT DO NOTHING;

-- 優惠券 2: SUMMER20（百分比折扣 20%，滿 $300 可用）
-- 用途: 測試百分比折扣
INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, valid_from, valid_until, status)
VALUES ('SUMMER20', 'percentage', 20, 300, NOW(), NOW() + INTERVAL '60 days', 'active')
ON CONFLICT DO NOTHING;

-- 優惠券 3: VIP50（現金折扣 $50，無最低金額限制，限批發會員）
-- 用途: 測試等級限制
INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, valid_from, valid_until, status)
VALUES ('VIP50', 'fixed', 50, NULL, NOW(), NOW() + INTERVAL '90 days', 'active')
ON CONFLICT DO NOTHING;

-- 優惠券 4: FRUITS30（百分比折扣 30%，滿 $200 可用，限水果系列）
-- 用途: 測試系列限制
INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, valid_from, valid_until, status)
VALUES ('FRUITS30', 'percentage', 30, 200, NOW(), NOW() + INTERVAL '30 days', 'active')
ON CONFLICT DO NOTHING;

-- 優惠券 5: EXPIRED50（已過期優惠券，用於測試過期檢查）
INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, valid_from, valid_until, status)
VALUES ('EXPIRED50', 'fixed', 50, NULL, NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day', 'active')
ON CONFLICT DO NOTHING;

-- 2. 建立等級限制（VIP50 限批發會員）
-- ============================================================================

-- 注意: 此處假設已有 tiers 表且存在「批發」等級
-- 若您的等級名稱不同，請自行調整 WHERE 條件

INSERT INTO coupon_tier_restrictions (coupon_id, tier_id)
SELECT
  c.id,
  t.id
FROM coupons c
CROSS JOIN tiers t
WHERE c.code_normalized = 'VIP50'
  AND t.name = '批發'
ON CONFLICT DO NOTHING;

-- 3. 建立系列限制（FRUITS30 限水果系列）
-- ============================================================================

-- 注意: 此處假設已有 series 表且存在「水果」系列
-- 若您的系列名稱不同，請自行調整 WHERE 條件

INSERT INTO coupon_series_restrictions (coupon_id, series_id)
SELECT
  c.id,
  s.id
FROM coupons c
CROSS JOIN series s
WHERE c.code_normalized = 'FRUITS30'
  AND s.name = '水果'
ON CONFLICT DO NOTHING;

-- 4. 查詢所有測試優惠券（驗證資料正確性）
-- ============================================================================

SELECT
  c.code_normalized AS "優惠券代碼",
  c.discount_type AS "折扣方式",
  c.discount_value AS "折扣值",
  c.min_order_amount AS "最低金額",
  c.valid_until AS "有效期限",
  c.status AS "狀態",
  COUNT(DISTINCT ctr.tier_id) AS "等級限制數",
  COUNT(DISTINCT csr.series_id) AS "系列限制數",
  STRING_AGG(DISTINCT t.name, ', ') AS "限定等級",
  STRING_AGG(DISTINCT s.name, ', ') AS "限定系列"
FROM coupons c
LEFT JOIN coupon_tier_restrictions ctr ON c.id = ctr.coupon_id
LEFT JOIN coupon_series_restrictions csr ON c.id = csr.coupon_id
LEFT JOIN tiers t ON ctr.tier_id = t.id
LEFT JOIN series s ON csr.series_id = s.id
WHERE c.code_normalized IN ('WELCOME100', 'SUMMER20', 'VIP50', 'FRUITS30', 'EXPIRED50')
GROUP BY c.id, c.code_normalized, c.discount_type, c.discount_value, c.min_order_amount, c.valid_until, c.status
ORDER BY c.created_at ASC;

-- 5. 客戶領取測試優惠券（可選）
-- ============================================================================

-- 注意: 此處假設已有測試客戶 (user_id)
-- 若要讓特定客戶領取優惠券，請執行以下範例並替換 {user_id}

-- 範例: 讓客戶領取 WELCOME100 優惠券
-- INSERT INTO user_coupons (user_id, coupon_id)
-- SELECT
--   '{user_id}'::UUID,  -- 替換為實際的客戶 UUID
--   c.id
-- FROM coupons c
-- WHERE c.code_normalized = 'WELCOME100'
-- ON CONFLICT DO NOTHING;

-- ============================================================================
-- 測試資料建立完成！
-- ============================================================================

-- 驗證步驟:
-- 1. 前台客戶登入後應可看到 WELCOME100, SUMMER20, VIP50, FRUITS30 優惠券（EXPIRED50 不顯示）
-- 2. 零售客戶無法領取 VIP50 優惠券（等級限制）
-- 3. 批發客戶可領取所有優惠券
-- 4. FRUITS30 僅適用於水果系列商品（系列限制）
-- 5. 購物車金額不足時，優惠券顯示「不符合條件」提示

-- 注意事項:
-- - 優惠券有效期為 30-90 天，過期後需重新執行此腳本
-- - 若要測試過期優惠券，可調整 EXPIRED50 的 valid_until 時間
-- - 若等級名稱或系列名稱不符，請自行調整 WHERE 條件
