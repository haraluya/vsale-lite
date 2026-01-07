-- ================================================================
-- Migration: 004-cart-and-orders - 購物車與訂單管理系統
-- Date: 2026-01-04
-- Description: 建立訂單相關表、PostgreSQL Functions 與 RLS 規則
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
    'status_changed',   -- 狀態變更
    'cancelled'         -- 訂單取消
  )),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- 操作者
  actor_role TEXT CHECK (actor_role IN ('client', 'admin')),
  old_status TEXT,  -- 舊狀態 (僅 status_changed 需要)
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

-- 確認 update_updated_at_column Function 存在 (應該已在前面的 migration 建立)
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
-- Part 4: 建立表註解
-- ================================================================

COMMENT ON TABLE orders IS '訂單主表';
COMMENT ON COLUMN orders.order_number IS '訂單編號 (格式: ORD-YYYYMMDD-XXXX)';
COMMENT ON COLUMN orders.total_amount IS '訂單總金額 (新台幣)';
COMMENT ON COLUMN orders.notes IS '客戶備註 (最多 500 字)';

COMMENT ON TABLE order_items IS '訂單明細表';
COMMENT ON COLUMN order_items.product_name_snapshot IS '商品名稱快照 (避免商品刪除後無法顯示)';
COMMENT ON COLUMN order_items.deal_price IS '成交價格 (下單當時的等級價格)';
COMMENT ON COLUMN order_items.subtotal IS '小計 = deal_price × quantity';

COMMENT ON TABLE order_timelines IS '訂單操作歷史表 (稽核追蹤)';
COMMENT ON COLUMN order_timelines.action_type IS '操作類型: created, status_changed, cancelled';
COMMENT ON COLUMN order_timelines.actor_id IS '操作者 (客戶或管理員)';
COMMENT ON COLUMN order_timelines.actor_role IS '操作者角色: client, admin';

-- ================================================================
-- Part 5: 建立 PostgreSQL Functions
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

  -- 4. 記錄操作歷史
  INSERT INTO order_timelines (
    order_id, action_type, actor_id, actor_role, old_status, new_status
  ) VALUES (
    p_order_id, 'status_changed', p_actor_id, 'admin', 'pending', 'confirmed'
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

  -- 2. 若訂單已確認，回補庫存
  IF v_order.status = 'confirmed' THEN
    FOR v_item IN
      SELECT * FROM order_items WHERE order_id = p_order_id
    LOOP
      UPDATE products
      SET stock = stock + v_item.quantity
      WHERE id = v_item.product_id;
    END LOOP;
  END IF;

  -- 3. 更新訂單狀態
  UPDATE orders
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_order_id;

  -- 4. 記錄操作歷史
  INSERT INTO order_timelines (
    order_id, action_type, actor_id, actor_role, old_status, new_status
  ) VALUES (
    p_order_id, 'cancelled', p_actor_id, 'admin', v_order.status, 'cancelled'
  );

  RETURN json_build_object('success', true, 'order_id', p_order_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cancel_order_and_restore_stock(UUID, UUID) IS '訂單取消並回補庫存 (原子性操作)';

-- Function 4: 更新訂單狀態 (confirmed → shipping → completed)
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

  -- 2. 驗證狀態轉換合法性
  IF v_order.status = 'cancelled' OR v_order.status = 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot update cancelled or completed order');
  END IF;

  IF p_new_status NOT IN ('confirmed', 'shipping', 'completed') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid status');
  END IF;

  -- 3. 更新訂單狀態
  UPDATE orders
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_order_id;

  -- 4. 記錄操作歷史
  INSERT INTO order_timelines (
    order_id, action_type, actor_id, actor_role, old_status, new_status
  ) VALUES (
    p_order_id, 'status_changed', p_actor_id, 'admin', v_order.status, p_new_status
  );

  RETURN json_build_object('success', true, 'order_id', p_order_id, 'new_status', p_new_status);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_order_status(UUID, TEXT, UUID) IS '更新訂單狀態 (confirmed → shipping → completed)';

-- ================================================================
-- Part 6: 建立 RLS Policies
-- ================================================================

-- 啟用 RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_timelines ENABLE ROW LEVEL SECURITY;

-- ========== orders 表 RLS ==========

-- 客戶查看自己的訂單
CREATE POLICY "Clients can view their own orders"
  ON orders FOR SELECT
  USING (user_id = auth.uid());

-- 客戶建立訂單
CREATE POLICY "Clients can create their own orders"
  ON orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 管理員查看所有訂單
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
CREATE POLICY "Clients can view their order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 管理員查看所有訂單明細
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
CREATE POLICY "Clients can view their order timelines"
  ON order_timelines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_timelines.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 管理員查看所有訂單歷史
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
-- Migration 完成
-- ================================================================

-- 執行驗證查詢
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20260104_create_orders.sql 執行完成';
  RAISE NOTICE '   - 已建立 3 個資料表: orders, order_items, order_timelines';
  RAISE NOTICE '   - 已建立 4 個 PostgreSQL Functions';
  RAISE NOTICE '   - 已建立 8 個 RLS Policies';
  RAISE NOTICE '   - 已建立 9 個索引';
END $$;
