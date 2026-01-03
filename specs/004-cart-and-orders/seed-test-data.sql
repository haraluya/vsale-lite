-- ================================================================
-- 測試資料腳本：購物車與訂單管理系統
-- Feature: 004-cart-and-orders
-- Date: 2026-01-03
-- ================================================================
--
-- 用途：
-- 1. 建立完整的測試訂單資料（涵蓋所有訂單狀態）
-- 2. 測試負庫存支援
-- 3. 驗證訂單操作歷史記錄
-- 4. 測試 RLS 權限控制
--
-- 使用方式：
-- 方法 1: Supabase Studio SQL Editor
--   1. 開啟 http://127.0.0.1:54323
--   2. 左側 → SQL Editor → New Query
--   3. 複製本檔案內容
--   4. 執行
--
-- 方法 2: psql 直接執行
--   psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f specs/004-cart-and-orders/seed-test-data.sql
--   密碼: postgres
--
-- 注意：
-- - 本腳本假設已執行 001, 002, 003 功能的測試資料腳本
-- - 需要存在至少 2 個客戶帳號與 5 個商品
-- ================================================================

BEGIN;

-- ================================================================
-- Part 1: 清理舊資料（僅測試用，生產環境請勿執行）
-- ================================================================

-- 清理訂單相關資料（依照外鍵順序反向刪除）
DELETE FROM order_timelines;
DELETE FROM order_items;
DELETE FROM orders;

RAISE NOTICE '✅ 已清理舊訂單資料';

-- ================================================================
-- Part 2: 準備測試用的客戶與商品
-- ================================================================

-- 取得測試用客戶 ID（假設已存在）
DO $$
DECLARE
  v_client1_id UUID;
  v_client2_id UUID;
  v_admin_id UUID;
  v_product1_id UUID;
  v_product2_id UUID;
  v_product3_id UUID;
  v_product4_id UUID;
  v_product5_id UUID;
  v_tier_wholesale_id UUID;
  v_tier_vip_id UUID;
BEGIN
  -- 查詢客戶 ID（role = 'client'）
  SELECT id INTO v_client1_id
  FROM profiles
  WHERE role = 'client'
  ORDER BY created_at
  LIMIT 1;

  SELECT id INTO v_client2_id
  FROM profiles
  WHERE role = 'client'
  ORDER BY created_at
  LIMIT 1 OFFSET 1;

  -- 查詢管理員 ID
  SELECT id INTO v_admin_id
  FROM profiles
  WHERE role = 'admin'
  LIMIT 1;

  -- 查詢商品 ID（status = 'active'）
  SELECT id INTO v_product1_id
  FROM products
  WHERE status = 'active'
  ORDER BY created_at
  LIMIT 1;

  SELECT id INTO v_product2_id
  FROM products
  WHERE status = 'active'
  ORDER BY created_at
  LIMIT 1 OFFSET 1;

  SELECT id INTO v_product3_id
  FROM products
  WHERE status = 'active'
  ORDER BY created_at
  LIMIT 1 OFFSET 2;

  SELECT id INTO v_product4_id
  FROM products
  WHERE status = 'active'
  ORDER BY created_at
  LIMIT 1 OFFSET 3;

  SELECT id INTO v_product5_id
  FROM products
  WHERE status = 'active'
  ORDER BY created_at
  LIMIT 1 OFFSET 4;

  -- 查詢等級 ID
  SELECT id INTO v_tier_wholesale_id
  FROM tiers
  WHERE name = '批發'
  LIMIT 1;

  SELECT id INTO v_tier_vip_id
  FROM tiers
  WHERE name = 'VIP'
  LIMIT 1;

  -- 驗證資料存在
  IF v_client1_id IS NULL THEN
    RAISE EXCEPTION '❌ 錯誤：找不到測試客戶帳號 (至少需要 2 個)';
  END IF;

  IF v_product1_id IS NULL THEN
    RAISE EXCEPTION '❌ 錯誤：找不到測試商品 (至少需要 5 個)';
  END IF;

  RAISE NOTICE '✅ 測試資料準備完成';
  RAISE NOTICE '  - 客戶 1 ID: %', v_client1_id;
  RAISE NOTICE '  - 客戶 2 ID: %', v_client2_id;
  RAISE NOTICE '  - 管理員 ID: %', v_admin_id;
  RAISE NOTICE '  - 商品數量: 5 個';

  -- 將變數儲存到 temporary table 供後續使用
  CREATE TEMP TABLE test_data_ids (
    client1_id UUID,
    client2_id UUID,
    admin_id UUID,
    product1_id UUID,
    product2_id UUID,
    product3_id UUID,
    product4_id UUID,
    product5_id UUID,
    tier_wholesale_id UUID,
    tier_vip_id UUID
  );

  INSERT INTO test_data_ids VALUES (
    v_client1_id,
    v_client2_id,
    v_admin_id,
    v_product1_id,
    v_product2_id,
    v_product3_id,
    v_product4_id,
    v_product5_id,
    v_tier_wholesale_id,
    v_tier_vip_id
  );
END $$;

-- ================================================================
-- Part 3: 建立測試訂單（涵蓋所有狀態）
-- ================================================================

-- 訂單 1: pending（待確認） - 客戶 1
DO $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  ids RECORD;
BEGIN
  SELECT * INTO ids FROM test_data_ids LIMIT 1;

  -- 產生訂單編號
  v_order_number := generate_order_number();

  -- 建立訂單
  INSERT INTO orders (id, order_number, user_id, total_amount, status, notes)
  VALUES (
    gen_random_uuid(),
    v_order_number,
    ids.client1_id,
    450.00,
    'pending',
    '測試訂單 - 待確認狀態'
  )
  RETURNING id INTO v_order_id;

  -- 建立訂單明細
  INSERT INTO order_items (order_id, product_id, product_name_snapshot, deal_price, quantity, subtotal)
  VALUES
    (v_order_id, ids.product1_id, '測試商品 A', 100.00, 3, 300.00),
    (v_order_id, ids.product2_id, '測試商品 B', 150.00, 1, 150.00);

  -- 建立訂單歷史
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, new_status)
  VALUES (v_order_id, 'created', ids.client1_id, 'client', 'pending');

  RAISE NOTICE '✅ 訂單 1 建立成功 (pending): %', v_order_number;
END $$;

-- 訂單 2: confirmed（已確認） - 客戶 1
DO $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  ids RECORD;
BEGIN
  SELECT * INTO ids FROM test_data_ids LIMIT 1;

  v_order_number := generate_order_number();

  INSERT INTO orders (id, order_number, user_id, total_amount, status, notes)
  VALUES (
    gen_random_uuid(),
    v_order_number,
    ids.client1_id,
    600.00,
    'confirmed',
    '測試訂單 - 已確認狀態'
  )
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_id, product_name_snapshot, deal_price, quantity, subtotal)
  VALUES
    (v_order_id, ids.product3_id, '測試商品 C', 200.00, 2, 400.00),
    (v_order_id, ids.product4_id, '測試商品 D', 200.00, 1, 200.00);

  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, new_status)
  VALUES
    (v_order_id, 'created', ids.client1_id, 'client', 'pending'),
    (v_order_id, 'status_changed', ids.admin_id, 'admin', 'confirmed');

  RAISE NOTICE '✅ 訂單 2 建立成功 (confirmed): %', v_order_number;
END $$;

-- 訂單 3: shipping（出貨中） - 客戶 2
DO $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  ids RECORD;
BEGIN
  SELECT * INTO ids FROM test_data_ids LIMIT 1;

  v_order_number := generate_order_number();

  INSERT INTO orders (id, order_number, user_id, total_amount, status, notes)
  VALUES (
    gen_random_uuid(),
    v_order_number,
    ids.client2_id,
    800.00,
    'shipping',
    '測試訂單 - 出貨中狀態'
  )
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_id, product_name_snapshot, deal_price, quantity, subtotal)
  VALUES
    (v_order_id, ids.product1_id, '測試商品 A', 100.00, 5, 500.00),
    (v_order_id, ids.product5_id, '測試商品 E', 300.00, 1, 300.00);

  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, new_status)
  VALUES
    (v_order_id, 'created', ids.client2_id, 'client', 'pending'),
    (v_order_id, 'status_changed', ids.admin_id, 'admin', 'confirmed'),
    (v_order_id, 'status_changed', ids.admin_id, 'admin', 'shipping');

  RAISE NOTICE '✅ 訂單 3 建立成功 (shipping): %', v_order_number;
END $$;

-- 訂單 4: completed（已完成） - 客戶 2
DO $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  ids RECORD;
BEGIN
  SELECT * INTO ids FROM test_data_ids LIMIT 1;

  v_order_number := generate_order_number();

  INSERT INTO orders (id, order_number, user_id, total_amount, status, notes)
  VALUES (
    gen_random_uuid(),
    v_order_number,
    ids.client2_id,
    1200.00,
    'completed',
    '測試訂單 - 已完成狀態'
  )
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_id, product_name_snapshot, deal_price, quantity, subtotal)
  VALUES
    (v_order_id, ids.product2_id, '測試商品 B', 150.00, 4, 600.00),
    (v_order_id, ids.product3_id, '測試商品 C', 200.00, 3, 600.00);

  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, new_status)
  VALUES
    (v_order_id, 'created', ids.client2_id, 'client', 'pending'),
    (v_order_id, 'status_changed', ids.admin_id, 'admin', 'confirmed'),
    (v_order_id, 'status_changed', ids.admin_id, 'admin', 'shipping'),
    (v_order_id, 'status_changed', ids.admin_id, 'admin', 'completed');

  RAISE NOTICE '✅ 訂單 4 建立成功 (completed): %', v_order_number;
END $$;

-- 訂單 5: cancelled（已取消） - 客戶 1
DO $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  ids RECORD;
BEGIN
  SELECT * INTO ids FROM test_data_ids LIMIT 1;

  v_order_number := generate_order_number();

  INSERT INTO orders (id, order_number, user_id, total_amount, status, notes)
  VALUES (
    gen_random_uuid(),
    v_order_number,
    ids.client1_id,
    300.00,
    'cancelled',
    '測試訂單 - 已取消狀態'
  )
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_id, product_name_snapshot, deal_price, quantity, subtotal)
  VALUES
    (v_order_id, ids.product4_id, '測試商品 D', 200.00, 1, 200.00),
    (v_order_id, ids.product5_id, '測試商品 E', 100.00, 1, 100.00);

  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, new_status)
  VALUES
    (v_order_id, 'created', ids.client1_id, 'client', 'pending'),
    (v_order_id, 'cancelled', ids.admin_id, 'admin', 'cancelled');

  RAISE NOTICE '✅ 訂單 5 建立成功 (cancelled): %', v_order_number;
END $$;

-- ================================================================
-- Part 4: 驗證測試資料
-- ================================================================

DO $$
DECLARE
  v_order_count INTEGER;
  v_item_count INTEGER;
  v_timeline_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_order_count FROM orders;
  SELECT COUNT(*) INTO v_item_count FROM order_items;
  SELECT COUNT(*) INTO v_timeline_count FROM order_timelines;

  RAISE NOTICE '================================================';
  RAISE NOTICE '📊 測試資料統計';
  RAISE NOTICE '================================================';
  RAISE NOTICE '  訂單數量: %', v_order_count;
  RAISE NOTICE '  訂單明細數量: %', v_item_count;
  RAISE NOTICE '  操作歷史數量: %', v_timeline_count;
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ 測試資料建立完成！';
  RAISE NOTICE '';
  RAISE NOTICE '📋 訂單狀態分布：';
  RAISE NOTICE '  - pending (待確認): 1 筆';
  RAISE NOTICE '  - confirmed (已確認): 1 筆';
  RAISE NOTICE '  - shipping (出貨中): 1 筆';
  RAISE NOTICE '  - completed (已完成): 1 筆';
  RAISE NOTICE '  - cancelled (已取消): 1 筆';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 測試情境：';
  RAISE NOTICE '  1. RLS 權限測試：客戶 1 有 3 筆訂單，客戶 2 有 2 筆訂單';
  RAISE NOTICE '  2. 訂單狀態流轉：涵蓋所有狀態轉換';
  RAISE NOTICE '  3. 操作歷史記錄：每個訂單都有完整的歷史軌跡';
  RAISE NOTICE '  4. 訂單明細價格快照：商品名稱與價格已保存';
  RAISE NOTICE '================================================';
END $$;

COMMIT;

-- ================================================================
-- 測試資料腳本執行完成
-- ================================================================
