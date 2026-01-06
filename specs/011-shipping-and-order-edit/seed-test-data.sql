-- ========================================
-- Feature 011: 種子資料 - 運費設定與訂單修改
-- ========================================
--
-- 專案: Vsale-lite
-- 功能: 運費設定與訂單修改系統
-- 建立日期: 2026-01-06
--
-- 使用方式:
-- 1. 確保已執行所有 Migration (supabase db reset)
-- 2. 執行本檔案: psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f specs/011-shipping-and-order-edit/seed-test-data.sql
-- 3. 或使用 Supabase Studio SQL Editor 執行
--
-- ========================================

-- 1. 設定會員等級運費
-- ========================================

-- 零售客戶：收運費 100 元，滿 1000 免運
UPDATE tiers SET
  shipping_fee = 100.00,
  free_shipping_threshold = 1000.00,
  updated_at = NOW()
WHERE name = '零售';

-- 批發客戶：完全免運
UPDATE tiers SET
  shipping_fee = 0.00,
  free_shipping_threshold = NULL,
  updated_at = NOW()
WHERE name = '批發';

-- 經銷商：完全免運
UPDATE tiers SET
  shipping_fee = 0.00,
  free_shipping_threshold = NULL,
  updated_at = NOW()
WHERE name = '經銷商';

-- 2. 建立測試訂單（pending 狀態，可修改）
-- ========================================

-- 取得第一個客戶 ID
DO $$
DECLARE
  v_client_id UUID;
  v_admin_id UUID;
  v_test_order_id UUID;
  v_product_id UUID;
BEGIN
  -- 取得客戶 ID
  SELECT id INTO v_client_id FROM profiles WHERE role = 'client' LIMIT 1;

  IF v_client_id IS NULL THEN
    RAISE NOTICE '找不到客戶，跳過測試訂單建立';
    RETURN;
  END IF;

  -- 取得管理員 ID
  SELECT id INTO v_admin_id FROM profiles WHERE role = 'admin' LIMIT 1;

  -- 取得商品 ID
  SELECT id INTO v_product_id FROM products WHERE status = 'active' LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE NOTICE '找不到商品，跳過測試訂單建立';
    RETURN;
  END IF;

  -- 建立測試訂單
  INSERT INTO orders (order_number, user_id, total_amount, shipping_fee, status, notes)
  VALUES (
    'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-TEST1',
    v_client_id,
    1200.00,
    100.00,
    'pending',
    '測試訂單（待確認）- Feature 011'
  )
  RETURNING id INTO v_test_order_id;

  RAISE NOTICE '建立測試訂單: ORD-%s-TEST1', TO_CHAR(NOW(), 'YYYYMMDD');

  -- 新增訂單明細
  INSERT INTO order_items (order_id, product_id, product_name_snapshot, deal_price, quantity, subtotal)
  VALUES (
    v_test_order_id,
    v_product_id,
    (SELECT name FROM products WHERE id = v_product_id),
    50.00,
    10,
    500.00
  );

  RAISE NOTICE '新增訂單明細: 商品 × 10 (NT$500)';

  -- 新增自訂費用（測試用）
  IF v_admin_id IS NOT NULL THEN
    INSERT INTO order_custom_fees (order_id, fee_name, amount, created_by)
    VALUES (
      v_test_order_id,
      '手續費',
      60.00,
      v_admin_id
    );

    RAISE NOTICE '新增自訂費用: 手續費 NT$60';
  END IF;

  -- 新增訂單歷史記錄
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, content)
  VALUES (
    v_test_order_id,
    'created',
    v_client_id,
    'client',
    '訂單建立（測試資料）'
  );

  RAISE NOTICE '測試訂單建立完成';
END;
$$;

-- 3. 建立多筆測試訂單（不同狀態）
-- ========================================

DO $$
DECLARE
  v_client_id UUID;
  v_product_id UUID;
  v_order_id UUID;
BEGIN
  -- 取得客戶與商品
  SELECT id INTO v_client_id FROM profiles WHERE role = 'client' LIMIT 1;
  SELECT id INTO v_product_id FROM products WHERE status = 'active' LIMIT 1;

  IF v_client_id IS NULL OR v_product_id IS NULL THEN
    RAISE NOTICE '找不到客戶或商品，跳過多筆測試訂單建立';
    RETURN;
  END IF;

  -- 測試訂單 2: shipping 狀態（已出貨）
  INSERT INTO orders (order_number, user_id, total_amount, shipping_fee, status, notes)
  VALUES (
    'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-TEST2',
    v_client_id,
    900.00,
    0.00,
    'shipping',
    '測試訂單（出貨中）- Feature 011'
  )
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_id, product_name_snapshot, deal_price, quantity, subtotal)
  VALUES (
    v_order_id,
    v_product_id,
    (SELECT name FROM products WHERE id = v_product_id),
    30.00,
    30,
    900.00
  );

  RAISE NOTICE '建立測試訂單 2: ORD-%s-TEST2 (shipping)', TO_CHAR(NOW(), 'YYYYMMDD');

  -- 測試訂單 3: completed 狀態（已完成）
  INSERT INTO orders (order_number, user_id, total_amount, shipping_fee, status, notes)
  VALUES (
    'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-TEST3',
    v_client_id,
    1500.00,
    0.00,
    'completed',
    '測試訂單（已完成）- Feature 011'
  )
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_id, product_name_snapshot, deal_price, quantity, subtotal)
  VALUES (
    v_order_id,
    v_product_id,
    (SELECT name FROM products WHERE id = v_product_id),
    50.00,
    30,
    1500.00
  );

  RAISE NOTICE '建立測試訂單 3: ORD-%s-TEST3 (completed)', TO_CHAR(NOW(), 'YYYYMMDD');
END;
$$;

-- 4. 顯示種子資料摘要
-- ========================================

SELECT '=== 會員等級運費設定 ===' AS info;

SELECT
  name AS 等級名稱,
  CASE
    WHEN shipping_fee = 0 THEN '免運'
    WHEN free_shipping_threshold IS NULL THEN '固定運費 NT$' || shipping_fee
    ELSE '運費 NT$' || shipping_fee || '，滿 NT$' || free_shipping_threshold || ' 免運'
  END AS 運費設定
FROM tiers
ORDER BY rank;

SELECT '=== 測試訂單列表 ===' AS info;

SELECT
  order_number AS 訂單編號,
  status AS 狀態,
  total_amount AS 總金額,
  shipping_fee AS 運費,
  notes AS 備註
FROM orders
WHERE order_number LIKE '%TEST%'
ORDER BY created_at DESC;

SELECT '=== 測試完成 ===' AS info;

RAISE NOTICE '種子資料建立完成！';
