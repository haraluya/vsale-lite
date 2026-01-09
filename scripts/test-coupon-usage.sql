-- ================================================================
-- 測試腳本：驗證優惠券扣減與退還功能
-- Date: 2026-01-09
-- ================================================================

-- 情境 1: 建立測試用優惠券與客戶
-- ================================================================

-- 1.1 查詢測試客戶 (假設存在一個測試客戶)
SELECT
  id AS user_id,
  phone,
  display_name,
  tier_id
FROM profiles
WHERE role = 'client'
LIMIT 1;

-- 1.2 建立測試優惠券 (如果不存在)
INSERT INTO coupons (code, discount_type, discount_value, valid_from, valid_until, claim_limit)
VALUES ('TEST100', 'fixed', 100, NOW(), NOW() + INTERVAL '30 days', 3)
ON CONFLICT (code_normalized) DO NOTHING
RETURNING id, code, discount_type, discount_value;

-- 1.3 取得優惠券 ID
SELECT id, code, discount_type, discount_value, status, claim_limit
FROM coupons
WHERE code = 'TEST100';

-- ================================================================
-- 情境 2: 客戶領取優惠券
-- ================================================================

-- 2.1 客戶領取優惠券 (替換 <user_id> 和 <coupon_id>)
-- INSERT INTO user_coupons (user_id, coupon_id)
-- VALUES ('<user_id>', '<coupon_id>');

-- 2.2 檢查客戶已領取的優惠券
-- SELECT
--   id,
--   user_id,
--   coupon_id,
--   claimed_at,
--   used_at,
--   order_id
-- FROM user_coupons
-- WHERE user_id = '<user_id>' AND coupon_id = '<coupon_id>';

-- ================================================================
-- 情境 3: 模擬訂單建立（優惠券標記為已使用）
-- ================================================================

-- 3.1 建立測試訂單 (替換 <user_id>)
-- INSERT INTO orders (order_number, user_id, total_amount, status)
-- VALUES ('TEST-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'), '<user_id>', 500, 'pending')
-- RETURNING id, order_number;

-- 3.2 模擬訂單建立時標記優惠券為已使用 (替換 <user_coupon_id> 和 <order_id>)
-- UPDATE user_coupons
-- SET used_at = NOW(), order_id = '<order_id>'
-- WHERE id = '<user_coupon_id>';

-- 3.3 檢查優惠券狀態（應顯示 used_at 與 order_id）
-- SELECT
--   id,
--   user_id,
--   coupon_id,
--   claimed_at,
--   used_at,
--   order_id,
--   CASE
--     WHEN used_at IS NULL THEN '未使用'
--     ELSE '已使用'
--   END AS status
-- FROM user_coupons
-- WHERE id = '<user_coupon_id>';

-- ================================================================
-- 情境 4: 測試訂單取消（優惠券退還）
-- ================================================================

-- 4.1 呼叫訂單取消函數（會自動退還優惠券）
-- 替換 <order_id> 和 <actor_id>
-- SELECT cancel_order_and_restore_stock('<order_id>', '<actor_id>');

-- 4.2 檢查優惠券是否退還（used_at 與 order_id 應為 NULL）
-- SELECT
--   id,
--   user_id,
--   coupon_id,
--   claimed_at,
--   used_at,
--   order_id,
--   CASE
--     WHEN used_at IS NULL THEN '未使用 ✅ 已退還'
--     ELSE '已使用'
--   END AS status
-- FROM user_coupons
-- WHERE id = '<user_coupon_id>';

-- 4.3 檢查訂單狀態（應為 cancelled）
-- SELECT
--   id,
--   order_number,
--   status,
--   total_amount
-- FROM orders
-- WHERE id = '<order_id>';

-- ================================================================
-- 完整測試流程（包含實際資料）
-- ================================================================

-- 步驟 1: 選擇測試客戶與優惠券
DO $$
DECLARE
  v_user_id UUID;
  v_coupon_id UUID;
  v_user_coupon_id UUID;
  v_order_id UUID;
  v_order_number TEXT;
  v_actor_id UUID;
BEGIN
  -- 取得測試客戶
  SELECT id INTO v_user_id
  FROM profiles
  WHERE role = 'client'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '找不到測試客戶，請先建立客戶帳號';
  END IF;

  -- 取得測試優惠券
  SELECT id INTO v_coupon_id
  FROM coupons
  WHERE code = 'TEST100' AND status = 'active';

  IF v_coupon_id IS NULL THEN
    RAISE EXCEPTION '找不到測試優惠券，請先執行上方建立優惠券的 SQL';
  END IF;

  -- 取得管理員 ID (用於取消訂單)
  SELECT id INTO v_actor_id
  FROM profiles
  WHERE role = 'admin'
  LIMIT 1;

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION '找不到管理員帳號';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE '測試資料準備完成';
  RAISE NOTICE '客戶 ID: %', v_user_id;
  RAISE NOTICE '優惠券 ID: %', v_coupon_id;
  RAISE NOTICE '管理員 ID: %', v_actor_id;
  RAISE NOTICE '========================================';

  -- 步驟 2: 客戶領取優惠券
  INSERT INTO user_coupons (user_id, coupon_id)
  VALUES (v_user_id, v_coupon_id)
  RETURNING id INTO v_user_coupon_id;

  RAISE NOTICE '✅ 客戶已領取優惠券，user_coupon_id: %', v_user_coupon_id;

  -- 步驟 3: 建立測試訂單
  INSERT INTO orders (order_number, user_id, total_amount, status)
  VALUES ('TEST-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'), v_user_id, 500, 'pending')
  RETURNING id, order_number INTO v_order_id, v_order_number;

  RAISE NOTICE '✅ 訂單已建立，order_id: %, order_number: %', v_order_id, v_order_number;

  -- 步驟 4: 標記優惠券為已使用
  UPDATE user_coupons
  SET used_at = NOW(), order_id = v_order_id
  WHERE id = v_user_coupon_id;

  RAISE NOTICE '✅ 優惠券已標記為已使用';

  -- 檢查優惠券狀態
  DECLARE
    v_used_at TIMESTAMP;
    v_linked_order_id UUID;
  BEGIN
    SELECT used_at, order_id INTO v_used_at, v_linked_order_id
    FROM user_coupons
    WHERE id = v_user_coupon_id;

    IF v_used_at IS NOT NULL AND v_linked_order_id = v_order_id THEN
      RAISE NOTICE '✅ 驗證成功：優惠券已正確標記為已使用';
    ELSE
      RAISE EXCEPTION '❌ 驗證失敗：優惠券未正確標記';
    END IF;
  END;

  -- 步驟 5: 取消訂單（測試優惠券退還）
  RAISE NOTICE '========================================';
  RAISE NOTICE '測試訂單取消與優惠券退還';
  RAISE NOTICE '========================================';

  PERFORM cancel_order_and_restore_stock(v_order_id, v_actor_id);

  RAISE NOTICE '✅ 訂單已取消';

  -- 檢查優惠券是否退還
  DECLARE
    v_used_at_after TIMESTAMP;
    v_order_id_after UUID;
  BEGIN
    SELECT used_at, order_id INTO v_used_at_after, v_order_id_after
    FROM user_coupons
    WHERE id = v_user_coupon_id;

    IF v_used_at_after IS NULL AND v_order_id_after IS NULL THEN
      RAISE NOTICE '✅ 驗證成功：優惠券已正確退還（used_at 與 order_id 已重置）';
    ELSE
      RAISE EXCEPTION '❌ 驗證失敗：優惠券未正確退還';
    END IF;
  END;

  -- 清理測試資料
  DELETE FROM user_coupons WHERE id = v_user_coupon_id;
  DELETE FROM orders WHERE id = v_order_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 所有測試通過！優惠券扣減與退還功能正常';
  RAISE NOTICE '========================================';

END $$;
