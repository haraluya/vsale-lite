-- ================================================================
-- Migration: M3 - 訂單與工作流程系統
-- Timestamp: 20260107120000
-- Description: 訂單建立、狀態管理、操作歷史追蹤、PostgreSQL Functions
-- ================================================================
-- 整合來源:
--   1. 20260107_create_orders.sql - 訂單基礎資料表
--   2. 20260108_fix_orders_rls_insert.sql - RLS INSERT 修復
--   3. 20260106_add_delete_order_function.sql - 刪除訂單函數
--   4. 20260111_add_order_delete_action.sql - 支援 'deleted' action_type
--   5. 20260117_grant_order_functions.sql - 函數權限授予
--   6. 20260118_fix_order_functions_action_type.sql - action_type 修復
-- ================================================================
-- Dependencies:
--   - M1 (tiers, profiles) - 必須先執行
--   - M2 (products) - 必須先執行
-- ================================================================

-- ================================================================
-- Part 1: 建立資料表
-- ================================================================

-- 1. orders 表 (訂單主表)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,  -- 格式: ORD-YYYYMMDD-XXXX
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- 待確認
    'confirmed',    -- 已確認
    'shipping',     -- 出貨中
    'completed',    -- 已完成
    'cancelled'     -- 已取消
  )),
  notes TEXT,  -- 客戶備註 (最多 500 字)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. order_items 表 (訂單明細)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name_snapshot TEXT NOT NULL,  -- 商品名稱快照
  deal_price DECIMAL(10, 2) NOT NULL CHECK (deal_price >= 0),  -- 成交價格
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),  -- 小計 = deal_price * quantity
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. order_timelines 表 (訂單操作歷史)
CREATE TABLE IF NOT EXISTS order_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'created',          -- 訂單建立
    'confirmed',        -- 訂單確認
    'status_updated',   -- 狀態變更
    'cancelled',        -- 訂單取消
    'comment',          -- 留言
    'deleted'           -- 訂單刪除
  )),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- 操作者
  actor_role TEXT CHECK (actor_role IN ('client', 'admin')),
  old_status TEXT,  -- 舊狀態 (僅 status_updated 需要)
  new_status TEXT,  -- 新狀態
  notes TEXT,       -- 操作備註
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- Part 2: 建立索引
-- ================================================================

-- orders 表索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);

-- order_items 表索引
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- order_timelines 表索引
CREATE INDEX IF NOT EXISTS idx_order_timelines_order_id ON order_timelines(order_id);
CREATE INDEX IF NOT EXISTS idx_order_timelines_created_at ON order_timelines(created_at DESC);

-- ================================================================
-- Part 3: 建立觸發器 (自動更新 updated_at)
-- ================================================================

-- 確認 update_updated_at_column Function 存在 (應該已在 M1 建立)
-- 若不存在則建立
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 套用到 orders 表
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- Part 4: 建立 PostgreSQL Functions
-- ================================================================

-- Function 1: 產生訂單編號 (ORD-YYYYMMDD-XXXX)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  today TEXT;
  seq_num INTEGER;
  order_num TEXT;
  max_digits INTEGER;
BEGIN
  today := TO_CHAR(NOW(), 'YYYYMMDD');

  -- 查詢當日最大流水號
  SELECT COALESCE(
    MAX(
      SUBSTRING(order_number FROM LENGTH('ORD-' || today || '-') + 1)::INTEGER
    ), 0
  ) + 1
  INTO seq_num
  FROM orders
  WHERE order_number LIKE 'ORD-' || today || '-%';

  -- 決定流水號位數 (最少 4 位，超過 9999 自動擴展)
  max_digits := GREATEST(4, LENGTH(seq_num::TEXT));

  -- 產生訂單編號
  order_num := 'ORD-' || today || '-' || LPAD(seq_num::TEXT, max_digits, '0');

  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_order_number() IS '產生唯一訂單編號 (ORD-YYYYMMDD-XXXX)';

-- Function 2: 訂單確認並扣減庫存 (原子性操作)
-- 修正版：使用 'confirmed' action_type
CREATE OR REPLACE FUNCTION confirm_order_and_deduct_stock(p_order_id UUID, p_actor_id UUID)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  -- 1. 驗證訂單存在與狀態
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Order status must be pending');
  END IF;

  -- 2. 更新訂單狀態
  UPDATE orders
  SET status = 'confirmed', updated_at = NOW()
  WHERE id = p_order_id;

  -- 3. 扣減庫存 (支援負庫存)
  FOR v_item IN
    SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    UPDATE products
    SET stock = stock - v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  -- 4. 記錄操作歷史 (使用 'confirmed' action_type)
  INSERT INTO order_timelines (
    order_id, action_type, actor_id, actor_role, old_status, new_status
  ) VALUES (
    p_order_id, 'confirmed', p_actor_id, 'admin', 'pending', 'confirmed'
  );

  RETURN json_build_object('success', true, 'order_id', p_order_id);

EXCEPTION
  WHEN OTHERS THEN
    -- 自動回滾
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION confirm_order_and_deduct_stock(UUID, UUID) IS '訂單確認並扣減庫存 (原子性操作)';

-- Function 3: 訂單取消並回補庫存 (原子性操作)
-- 修正版：使用 'cancelled' action_type
CREATE OR REPLACE FUNCTION cancel_order_and_restore_stock(p_order_id UUID, p_actor_id UUID)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  -- 1. 驗證訂單存在與狀態
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status NOT IN ('pending', 'confirmed') THEN
    RETURN json_build_object('success', false, 'error', 'Cannot cancel order with status ' || v_order.status);
  END IF;

  -- 2. 更新訂單狀態
  UPDATE orders
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_order_id;

  -- 3. 回補庫存 (僅當訂單已確認時)
  IF v_order.status = 'confirmed' THEN
    FOR v_item IN
      SELECT * FROM order_items WHERE order_id = p_order_id
    LOOP
      UPDATE products
      SET stock = stock + v_item.quantity
      WHERE id = v_item.product_id;
    END LOOP;
  END IF;

  -- 4. 記錄操作歷史 (使用 'cancelled' action_type)
  INSERT INTO order_timelines (
    order_id, action_type, actor_id, actor_role, old_status, new_status
  ) VALUES (
    p_order_id, 'cancelled', p_actor_id, 'admin', v_order.status, 'cancelled'
  );

  RETURN json_build_object('success', true, 'order_id', p_order_id);

EXCEPTION
  WHEN OTHERS THEN
    -- 自動回滾
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cancel_order_and_restore_stock(UUID, UUID) IS '訂單取消並回補庫存 (原子性操作)';

-- Function 4: 更新訂單狀態 (confirmed → shipping → completed)
-- 修正版：使用 'status_updated' action_type
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_actor_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- 1. 驗證訂單存在
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- 2. 驗證狀態轉換規則
  IF v_order.status = 'pending' AND p_new_status NOT IN ('confirmed', 'cancelled') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid status transition from pending');
  END IF;

  IF v_order.status = 'confirmed' AND p_new_status NOT IN ('shipping', 'cancelled') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid status transition from confirmed');
  END IF;

  IF v_order.status = 'shipping' AND p_new_status != 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'Invalid status transition from shipping');
  END IF;

  -- 3. 更新訂單狀態
  UPDATE orders
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_order_id;

  -- 4. 記錄操作歷史 (使用 'status_updated' action_type)
  INSERT INTO order_timelines (
    order_id, action_type, actor_id, actor_role, old_status, new_status
  ) VALUES (
    p_order_id, 'status_updated', p_actor_id, 'admin', v_order.status, p_new_status
  );

  RETURN json_build_object('success', true, 'order_id', p_order_id, 'new_status', p_new_status);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_order_status(UUID, TEXT, UUID) IS '更新訂單狀態並記錄歷史 (原子性操作)';

-- Function 5: 刪除訂單 (僅 pending 狀態)
-- 使用 SECURITY DEFINER 繞過 RLS Policy
CREATE OR REPLACE FUNCTION delete_order_pending(p_order_id UUID, p_actor_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- 1. 驗證訂單存在與狀態
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- 2. 僅允許刪除 pending 狀態的訂單
  IF v_order.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Can only delete pending orders');
  END IF;

  -- 3. 記錄刪除操作於 order_timelines (CASCADE 會刪除，但仍記錄一次)
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, notes)
  VALUES (
    p_order_id,
    'deleted',
    p_actor_id,
    'admin',
    COALESCE(p_reason, '管理員刪除訂單')
  );

  -- 4. 刪除訂單 (CASCADE 會自動刪除 order_items 與 order_timelines)
  DELETE FROM orders WHERE id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'order_id', p_order_id,
    'order_number', v_order.order_number,
    'message', '訂單 ' || v_order.order_number || ' 已刪除'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_order_pending(UUID, UUID, TEXT) IS '刪除 pending 狀態訂單 (原子性操作，繞過 RLS)';

-- ================================================================
-- Part 5: 授予函數執行權限
-- ================================================================

GRANT EXECUTE ON FUNCTION generate_order_number() TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_order_and_deduct_stock(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_order_and_restore_stock(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_order_status(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_order_pending(UUID, UUID, TEXT) TO authenticated;

-- ================================================================
-- Part 6: 建立表與欄位註解
-- ================================================================

-- orders 表註解
COMMENT ON TABLE orders IS '訂單主表 - 記錄所有訂單的基本資訊與狀態';
COMMENT ON COLUMN orders.id IS '訂單唯一識別碼 (UUID)';
COMMENT ON COLUMN orders.order_number IS '訂單編號 (格式: ORD-YYYYMMDD-XXXX，由 generate_order_number() 產生)';
COMMENT ON COLUMN orders.user_id IS '下單客戶 (FK: auth.users.id)';
COMMENT ON COLUMN orders.total_amount IS '訂單總金額 (新台幣，含運費與優惠券折扣)';
COMMENT ON COLUMN orders.status IS '訂單狀態: pending (待確認), confirmed (已確認), shipping (出貨中), completed (已完成), cancelled (已取消)';
COMMENT ON COLUMN orders.notes IS '客戶備註 (最多 500 字，例如: 指定配送時間、特殊需求)';
COMMENT ON COLUMN orders.created_at IS '訂單建立時間';
COMMENT ON COLUMN orders.updated_at IS '最後更新時間 (由 Trigger 自動更新)';

-- order_items 表註解
COMMENT ON TABLE order_items IS '訂單明細表 - 記錄每筆訂單包含的商品與成交價格';
COMMENT ON COLUMN order_items.id IS '訂單明細唯一識別碼 (UUID)';
COMMENT ON COLUMN order_items.order_id IS '所屬訂單 (FK: orders.id，CASCADE 刪除)';
COMMENT ON COLUMN order_items.product_id IS '商品 (FK: products.id，RESTRICT 防止誤刪)';
COMMENT ON COLUMN order_items.product_name_snapshot IS '商品名稱快照 (避免商品刪除後無法顯示歷史訂單)';
COMMENT ON COLUMN order_items.deal_price IS '成交價格 (下單當時的等級價格，用於記錄歷史)';
COMMENT ON COLUMN order_items.quantity IS '訂購數量';
COMMENT ON COLUMN order_items.subtotal IS '小計 = deal_price × quantity (冗餘欄位，提升查詢效能)';
COMMENT ON COLUMN order_items.created_at IS '明細建立時間';

-- order_timelines 表註解
COMMENT ON TABLE order_timelines IS '訂單操作歷史表 - 稽核追蹤所有訂單相關操作';
COMMENT ON COLUMN order_timelines.id IS '歷史記錄唯一識別碼 (UUID)';
COMMENT ON COLUMN order_timelines.order_id IS '所屬訂單 (FK: orders.id，CASCADE 刪除)';
COMMENT ON COLUMN order_timelines.action_type IS '操作類型: created (訂單建立), confirmed (訂單確認), status_updated (狀態變更), cancelled (訂單取消), comment (留言), deleted (訂單刪除)';
COMMENT ON COLUMN order_timelines.actor_id IS '操作者 (FK: auth.users.id，可為客戶或管理員)';
COMMENT ON COLUMN order_timelines.actor_role IS '操作者角色: client (客戶), admin (管理員)';
COMMENT ON COLUMN order_timelines.old_status IS '舊狀態 (僅 status_updated 需要，記錄狀態變更前的狀態)';
COMMENT ON COLUMN order_timelines.new_status IS '新狀態 (記錄狀態變更後的狀態)';
COMMENT ON COLUMN order_timelines.notes IS '操作備註 (例如: 取消原因、留言內容)';
COMMENT ON COLUMN order_timelines.created_at IS '操作時間';

-- ================================================================
-- Part 7: 建立 RLS Policies
-- ================================================================

-- 啟用 RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_timelines ENABLE ROW LEVEL SECURITY;

-- ========== orders 表 RLS ==========

-- 客戶查看自己的訂單
DROP POLICY IF EXISTS "Clients can view their own orders" ON orders;
CREATE POLICY "Clients can view their own orders"
  ON orders FOR SELECT
  USING (user_id = auth.uid());

-- 客戶建立訂單
DROP POLICY IF EXISTS "Clients can create their own orders" ON orders;
CREATE POLICY "Clients can create their own orders"
  ON orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 管理員查看所有訂單
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 管理員更新訂單
DROP POLICY IF EXISTS "Admins can update orders" ON orders;
CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ========== order_items 表 RLS ==========

-- 客戶查看自己訂單的明細
DROP POLICY IF EXISTS "Clients can view their order items" ON order_items;
CREATE POLICY "Clients can view their order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 客戶建立自己訂單的明細 (修復 INSERT Policy)
DROP POLICY IF EXISTS "Clients can insert items for their own orders" ON order_items;
CREATE POLICY "Clients can insert items for their own orders"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 管理員查看所有訂單明細
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;
CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ========== order_timelines 表 RLS ==========

-- 客戶查看自己訂單的歷史
DROP POLICY IF EXISTS "Clients can view their order timelines" ON order_timelines;
CREATE POLICY "Clients can view their order timelines"
  ON order_timelines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_timelines.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 已認證使用者可建立歷史記錄 (修復 INSERT Policy)
DROP POLICY IF EXISTS "Authenticated users can insert timeline records" ON order_timelines;
CREATE POLICY "Authenticated users can insert timeline records"
  ON order_timelines FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 管理員查看所有訂單歷史
DROP POLICY IF EXISTS "Admins can view all order timelines" ON order_timelines;
CREATE POLICY "Admins can view all order timelines"
  ON order_timelines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ================================================================
-- Part 8: Policy 註解
-- ================================================================

COMMENT ON POLICY "Clients can view their own orders" ON orders IS '客戶僅能查看自己的訂單';
COMMENT ON POLICY "Clients can create their own orders" ON orders IS '客戶僅能建立自己的訂單';
COMMENT ON POLICY "Admins can view all orders" ON orders IS '管理員可查看所有訂單';
COMMENT ON POLICY "Admins can update orders" ON orders IS '管理員可更新所有訂單';

COMMENT ON POLICY "Clients can view their order items" ON order_items IS '客戶僅能查看自己訂單的明細';
COMMENT ON POLICY "Clients can insert items for their own orders" ON order_items IS '客戶建立訂單時可新增明細 (修復 RLS INSERT 阻擋問題)';
COMMENT ON POLICY "Admins can view all order items" ON order_items IS '管理員可查看所有訂單明細';

COMMENT ON POLICY "Clients can view their order timelines" ON order_timelines IS '客戶僅能查看自己訂單的操作歷史';
COMMENT ON POLICY "Authenticated users can insert timeline records" ON order_timelines IS '已認證使用者可建立歷史記錄 (修復 RLS INSERT 阻擋問題)';
COMMENT ON POLICY "Admins can view all order timelines" ON order_timelines IS '管理員可查看所有訂單操作歷史';

-- ================================================================
-- Migration 完成
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration M3 (訂單與工作流程系統) 執行完成';
  RAISE NOTICE '   - 已建立 3 個資料表: orders, order_items, order_timelines';
  RAISE NOTICE '   - 已建立 5 個 PostgreSQL Functions';
  RAISE NOTICE '   - 已建立 9 個索引';
  RAISE NOTICE '   - 已建立 10 個 RLS Policies';
  RAISE NOTICE '   - 已授予 5 個函數執行權限給 authenticated 角色';
  RAISE NOTICE '   ';
  RAISE NOTICE '整合檔案:';
  RAISE NOTICE '   1. 20260107_create_orders.sql - 訂單基礎資料表';
  RAISE NOTICE '   2. 20260108_fix_orders_rls_insert.sql - RLS INSERT 修復';
  RAISE NOTICE '   3. 20260106_add_delete_order_function.sql - 刪除訂單函數';
  RAISE NOTICE '   4. 20260111_add_order_delete_action.sql - deleted action_type';
  RAISE NOTICE '   5. 20260117_grant_order_functions.sql - 函數權限授予';
  RAISE NOTICE '   6. 20260118_fix_order_functions_action_type.sql - action_type 修復';
END $$;
