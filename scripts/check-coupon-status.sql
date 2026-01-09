-- ================================================================
-- 檢查優惠券實際狀態與函數版本
-- ================================================================

-- 1. 檢查 cancel_order_and_restore_stock 函數的實際程式碼
SELECT
  proname AS function_name,
  pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'cancel_order_and_restore_stock';

-- 2. 檢查最近的 user_coupons 記錄
SELECT
  uc.id,
  uc.user_id,
  uc.coupon_id,
  c.code AS coupon_code,
  uc.claimed_at,
  uc.used_at,
  uc.order_id,
  CASE
    WHEN uc.used_at IS NULL THEN '未使用 ✅'
    ELSE '已使用 ❌'
  END AS status,
  o.order_number,
  o.status AS order_status
FROM user_coupons uc
LEFT JOIN coupons c ON c.id = uc.coupon_id
LEFT JOIN orders o ON o.id = uc.order_id
ORDER BY uc.claimed_at DESC
LIMIT 10;

-- 3. 檢查最近的訂單
SELECT
  o.id,
  o.order_number,
  o.status,
  o.total_amount,
  o.created_at,
  uc.id AS user_coupon_id,
  uc.used_at AS coupon_used_at,
  c.code AS coupon_code
FROM orders o
LEFT JOIN user_coupons uc ON uc.order_id = o.id
LEFT JOIN coupons c ON c.id = uc.coupon_id
ORDER BY o.created_at DESC
LIMIT 10;

-- 4. 檢查 Migration 歷史
SELECT version, name, executed_at
FROM supabase_migrations.schema_migrations
ORDER BY executed_at DESC
LIMIT 10;
