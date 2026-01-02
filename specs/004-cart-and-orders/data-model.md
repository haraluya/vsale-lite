# Data Model: 購物車與訂單管理系統

**Feature**: 購物車與訂單管理系統
**Date**: 2026-01-03
**Status**: Phase 1 Design

## Overview

本文件定義購物車與訂單系統所需的資料庫表結構、關聯規則、索引策略與 RLS 權限設計。所有設計基於 [research.md](research.md) 的技術決策。

---

## Entity Relationship Diagram

```
profiles (existing)
    ↓ (1:N)
orders
    ↓ (1:N)
order_items → products (existing)
    ↓ (1:N)
order_timelines
```

**關聯說明**:
- 一個 `profiles` (用戶) 可以有多個 `orders` (訂單)
- 一個 `orders` (訂單) 包含多個 `order_items` (訂單明細)
- 一個 `orders` (訂單) 有多筆 `order_timelines` (操作歷史)
- `order_items` 關聯 `products`，但保存商品名稱快照 (避免商品刪除影響歷史訂單)

---

## Table Schemas

### 1. orders (訂單主表)

**用途**: 儲存訂單主要資訊（訂單編號、客戶、總金額、狀態、備註）

```sql
CREATE TABLE orders (
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

-- 索引
CREATE UNIQUE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- 複合索引 (常用查詢組合)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- 自動更新 updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 註解
COMMENT ON TABLE orders IS '訂單主表';
COMMENT ON COLUMN orders.order_number IS '訂單編號 (格式: ORD-YYYYMMDD-XXXX)';
COMMENT ON COLUMN orders.total_amount IS '訂單總金額 (新台幣)';
COMMENT ON COLUMN orders.notes IS '客戶備註 (最多 500 字)';
```

**欄位說明**:
- `order_number`: 訂單編號，由 PostgreSQL Function 自動產生，確保唯一性
- `user_id`: 下單客戶，關聯 `auth.users`，使用 `ON DELETE RESTRICT` 避免誤刪
- `total_amount`: 訂單總金額，計算自所有 `order_items.subtotal` 的總和
- `status`: 訂單狀態，限定為五種狀態之一
- `notes`: 客戶備註，選填

---

### 2. order_items (訂單明細)

**用途**: 儲存訂單中的商品項目（商品、購買價格、數量、小計）

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name_snapshot TEXT NOT NULL,  -- 商品名稱快照
  deal_price DECIMAL(10, 2) NOT NULL CHECK (deal_price >= 0),  -- 成交價格
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),  -- 小計 = deal_price * quantity
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- 註解
COMMENT ON TABLE order_items IS '訂單明細表';
COMMENT ON COLUMN order_items.product_name_snapshot IS '商品名稱快照 (避免商品刪除後無法顯示)';
COMMENT ON COLUMN order_items.deal_price IS '成交價格 (下單當時的等級價格)';
COMMENT ON COLUMN order_items.subtotal IS '小計 = deal_price × quantity';
```

**欄位說明**:
- `order_id`: 所屬訂單，使用 `ON DELETE CASCADE` (訂單刪除時一併刪除明細)
- `product_id`: 關聯商品，使用 `ON DELETE RESTRICT` (避免誤刪商品)
- `product_name_snapshot`: **關鍵欄位**，保存商品名稱快照，即使商品後續被刪除也能顯示
- `deal_price`: **關鍵欄位**，保存下單當時的等級價格，後續價格調整不影響此訂單
- `subtotal`: 小計，由 `deal_price × quantity` 計算而得

---

### 3. order_timelines (訂單操作歷史)

**用途**: 記錄訂單的所有狀態變更與操作歷史（稽核追蹤）

```sql
CREATE TABLE order_timelines (
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

-- 索引
CREATE INDEX idx_order_timelines_order_id ON order_timelines(order_id);
CREATE INDEX idx_order_timelines_created_at ON order_timelines(created_at DESC);

-- 註解
COMMENT ON TABLE order_timelines IS '訂單操作歷史表 (稽核追蹤)';
COMMENT ON COLUMN order_timelines.action_type IS '操作類型: created, status_changed, cancelled';
COMMENT ON COLUMN order_timelines.actor_id IS '操作者 (客戶或管理員)';
COMMENT ON COLUMN order_timelines.actor_role IS '操作者角色: client, admin';
```

**欄位說明**:
- `order_id`: 所屬訂單，使用 `ON DELETE CASCADE`
- `action_type`: 操作類型，限定為三種之一
- `actor_id`: 操作者，使用 `ON DELETE SET NULL` (操作者被刪除後保留記錄但標記為 NULL)
- `old_status` / `new_status`: 狀態變更記錄，用於追蹤訂單狀態流轉

---

## PostgreSQL Functions

### 1. generate_order_number()

**用途**: 產生唯一的訂單編號 (格式: ORD-YYYYMMDD-XXXX)

```sql
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
```

**使用範例**:
```sql
SELECT generate_order_number();
-- 回傳: 'ORD-20260103-0001'
```

---

### 2. confirm_order_and_deduct_stock()

**用途**: 訂單確認並扣減庫存 (原子性操作)

```sql
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
```

---

### 3. cancel_order_and_restore_stock()

**用途**: 訂單取消並回補庫存 (原子性操作)

```sql
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
```

---

### 4. update_order_status()

**用途**: 更新訂單狀態 (confirmed → shipping → completed)

```sql
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
```

---

## Row Level Security (RLS) Policies

### orders 表

```sql
-- 啟用 RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

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
```

---

### order_items 表

```sql
-- 啟用 RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

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

-- 注意：訂單明細的 INSERT 由 Server Action 處理，不開放直接權限
```

---

### order_timelines 表

```sql
-- 啟用 RLS
ALTER TABLE order_timelines ENABLE ROW LEVEL SECURITY;

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

-- 注意：訂單歷史的 INSERT 由 PostgreSQL Function 自動建立，不開放直接權限
```

---

## Data Validation Rules

### 訂單建立驗證

1. **購物車項目驗證**:
   - 所有商品必須存在且狀態為 `active`
   - 所有商品必須有設定當前用戶等級的價格 (tier_prices 表)
   - 數量必須為正整數

2. **訂單總金額驗證**:
   - 總金額 = SUM(order_items.subtotal)
   - 總金額必須 >= 0

3. **訂單編號唯一性**:
   - 由 PostgreSQL Function 自動產生
   - 資料庫 UNIQUE 約束確保唯一性

### 訂單狀態轉換規則

```
pending (待確認)
   ↓ 管理員確認
confirmed (已確認)
   ↓ 管理員標記出貨
shipping (出貨中)
   ↓ 管理員標記完成
completed (已完成)

pending/confirmed 可以 → cancelled (已取消)
shipping/completed 不可取消
```

---

## Performance Considerations

### 索引策略

1. **查詢優化**:
   - `idx_orders_user_status`: 常用於客戶查詢自己的訂單並篩選狀態
   - `idx_orders_created_at`: 常用於按時間排序訂單列表
   - `idx_order_items_order_id`: 常用於查詢訂單明細

2. **避免全表掃描**:
   - `order_number` 使用 UNIQUE 索引，查詢特定訂單時效能佳
   - `user_id` 索引，客戶查詢自己的訂單不需掃描全表

### 資料量估算

假設日均訂單量 100 筆：
- 1 年訂單量: 36,500 筆
- 10 年訂單量: 365,000 筆

當前索引策略可支援 100 萬筆訂單，查詢效能仍可維持 < 1s。

---

## Migration File

完整的 Migration 檔案位於：
- `supabase/migrations/20260104_create_orders.sql`

包含：
1. 建立 `orders`, `order_items`, `order_timelines` 表
2. 建立所有索引
3. 建立 PostgreSQL Functions
4. 建立 RLS Policies
5. 建立觸發器 (update_updated_at_column)

---

**Status**: ✅ Completed
**Next**: API Contracts (contracts/*.md)
**Date**: 2026-01-03
