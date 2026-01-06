# Feature 011: 資料模型設計 - 運費與訂單修改

**專案**: Vsale-lite
**功能**: 運費設定與訂單修改系統
**建立日期**: 2026-01-06

---

## 一、資料表架構概覽

### 1.1 新增資料表

| 資料表名稱 | 用途 | 關聯 |
|-----------|------|------|
| `order_custom_fees` | 訂單自訂費用項目（手續費、包裝費等） | `orders.id` (CASCADE) |

### 1.2 修改現有資料表

| 資料表名稱 | 修改內容 |
|-----------|---------|
| `tiers` | 新增 `shipping_fee`, `free_shipping_threshold` |
| `orders` | 新增 `shipping_fee` 欄位 |
| `order_items` | 支援單價修改（無需新增欄位，透過修改歷程記錄） |
| `order_timelines` | 新增 `modifications` JSONB 欄位，擴展 `action_type` |

---

## 二、詳細資料表設計

### 2.1 會員等級表 (tiers) - 擴展

#### 現有欄位
```sql
CREATE TABLE tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  rank INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 新增欄位
```sql
ALTER TABLE tiers ADD COLUMN (
  shipping_fee DECIMAL(10,2) DEFAULT 0,            -- 基本運費（0 = 免運）
  free_shipping_threshold DECIMAL(10,2),           -- 滿額免運門檻（NULL = 不提供免運）

  CONSTRAINT check_shipping_fee_non_negative CHECK (shipping_fee >= 0),
  CONSTRAINT check_free_shipping_threshold_positive CHECK (
    free_shipping_threshold IS NULL OR free_shipping_threshold > 0
  )
);
```

#### 欄位說明

| 欄位 | 型別 | 說明 | 範例 |
|------|------|------|------|
| `shipping_fee` | DECIMAL(10,2) | 基本運費金額（預設 0 = 免運） | 100.00 |
| `free_shipping_threshold` | DECIMAL(10,2) | 滿額免運門檻（NULL = 不提供免運） | 1000.00 |

#### 業務邏輯範例

**零售客戶**
```sql
shipping_fee = 100.00
free_shipping_threshold = 1000.00
→ 收運費 100 元，滿 1000 免運
```

**批發客戶**
```sql
shipping_fee = 0.00
free_shipping_threshold = NULL
→ 完全免運
```

**經銷商**
```sql
shipping_fee = 0.00
free_shipping_threshold = NULL
→ 完全免運
```

---

### 2.2 訂單表 (orders) - 擴展

#### 現有欄位
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'shipping', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 新增欄位
```sql
ALTER TABLE orders ADD COLUMN (
  shipping_fee DECIMAL(10,2) DEFAULT 0,  -- 運費金額（快照）

  CONSTRAINT check_shipping_fee_non_negative CHECK (shipping_fee >= 0)
);
```

#### 修改欄位（移除 confirmed 狀態）
```sql
-- 將在 Phase 2 Migration 執行
ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'shipping', 'completed', 'cancelled'));
```

#### 總金額計算公式

```
total_amount = Σ(order_items.subtotal) - coupon_discount + shipping_fee + Σ(order_custom_fees.amount)
```

**分解**:
1. 商品合計: `Σ(order_items.subtotal)`
2. 優惠券折扣: `order_coupons.discount_amount`（已儲存於表中）
3. 運費: `orders.shipping_fee`
4. 自訂費用: `Σ(order_custom_fees.amount)`（可為正或負）

---

### 2.3 訂單自訂費用表 (order_custom_fees) - 新增

#### 用途
儲存訂單的自訂費用項目（手續費、包裝費、額外運費、直接減免等）

#### 資料表結構
```sql
CREATE TABLE order_custom_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  fee_name VARCHAR(100) NOT NULL,              -- 費用名稱（例：手續費、包裝費、總額調整）
  amount DECIMAL(10,2) NOT NULL,                -- 費用金額（可為負數表示減免）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- 建立者（管理員）

  CONSTRAINT check_fee_name_not_empty CHECK (TRIM(fee_name) <> '')
);

-- 索引
CREATE INDEX idx_order_custom_fees_order_id ON order_custom_fees(order_id);
```

#### 欄位說明

| 欄位 | 型別 | 必填 | 說明 | 範例 |
|------|------|------|------|------|
| `id` | UUID | ✅ | 主鍵 | - |
| `order_id` | UUID | ✅ | 訂單 ID（FK） | - |
| `fee_name` | VARCHAR(100) | ✅ | 費用名稱 | "手續費", "包裝費", "總額調整" |
| `amount` | DECIMAL(10,2) | ✅ | 費用金額（可為負） | 50.00, -20.00 |
| `created_at` | TIMESTAMPTZ | ✅ | 建立時間 | 2026-01-06 14:30:00 |
| `created_by` | UUID | ❌ | 建立者（管理員 ID） | - |

#### 範例資料

```sql
-- 手續費
INSERT INTO order_custom_fees (order_id, fee_name, amount, created_by)
VALUES ('order-uuid', '手續費', 60.00, 'admin-uuid');

-- 包裝費
INSERT INTO order_custom_fees (order_id, fee_name, amount, created_by)
VALUES ('order-uuid', '包裝費', 20.00, 'admin-uuid');

-- 總額調整（減免）
INSERT INTO order_custom_fees (order_id, fee_name, amount, created_by)
VALUES ('order-uuid', '總額調整', -100.00, 'admin-uuid');
```

#### RLS Policy

```sql
-- 所有已登入用戶可查看自己的訂單費用
CREATE POLICY "Users can view their order custom fees"
  ON order_custom_fees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_custom_fees.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- 僅管理員可新增/修改/刪除
CREATE POLICY "Admins can manage order custom fees"
  ON order_custom_fees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
```

---

### 2.4 訂單明細表 (order_items) - 無需修改

#### 現有結構
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name_snapshot TEXT NOT NULL,
  deal_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 修改邏輯說明

**單價修改**：
- **不修改** `deal_price` 欄位（保留原始成交價）
- 修改歷程記錄於 `order_timelines.modifications` JSONB 欄位
- 顯示時從 `modifications` 讀取覆蓋值

**數量修改**：
- **直接修改** `quantity` 欄位
- 重新計算 `subtotal = deal_price × quantity`
- 修改歷程記錄於 `order_timelines.modifications`

**商品移除**：
- **軟刪除**：不實際刪除記錄，而是在 `order_timelines.modifications` 標記為已移除
- **硬刪除**（可選）：若需要完全移除，使用 `DELETE` 並記錄於修改歷程

**商品新增**：
- 新增記錄至 `order_items` 表
- 記錄於 `order_timelines.modifications`

---

### 2.5 訂單操作歷史表 (order_timelines) - 擴展

#### 現有欄位
```sql
CREATE TABLE order_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'status_changed', 'cancelled', 'comment')),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT CHECK (actor_role IN ('client', 'admin')),
  old_status TEXT,
  new_status TEXT,
  content TEXT,  -- Feature 007: 留言內容（當 action_type='comment'）
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 新增欄位
```sql
ALTER TABLE order_timelines ADD COLUMN (
  modifications JSONB  -- 訂單修改內容（當 action_type='order_modified'）
);
```

#### 修改 CHECK 約束
```sql
ALTER TABLE order_timelines DROP CONSTRAINT order_timelines_action_type_check;
ALTER TABLE order_timelines ADD CONSTRAINT order_timelines_action_type_check
  CHECK (action_type IN ('created', 'status_changed', 'cancelled', 'comment', 'order_modified'));
```

#### modifications JSONB 結構設計

```typescript
interface OrderModifications {
  summary: {
    old_total: number;       // 修改前總金額
    new_total: number;       // 修改後總金額
    items_changed: number;   // 修改的商品數量
    fees_added: number;      // 新增的費用項目數量
  };

  items: Array<{
    type: 'price_changed' | 'quantity_changed' | 'removed' | 'added';
    item_id?: string;                 // order_items.id (若為新增則無)
    product_name: string;
    old_price?: number;
    new_price?: number;
    old_quantity?: number;
    new_quantity?: number;
  }>;

  fees: Array<{
    type: 'added' | 'removed';
    fee_name: string;
    amount: number;
  }>;

  shipping: {
    old_fee?: number;
    new_fee?: number;
  } | null;

  coupon: {
    action: 'removed' | 'kept';
    reason?: string;  // 例：「訂單修改後不符合優惠券條件」
  } | null;
}
```

#### 範例 JSONB 資料

```json
{
  "summary": {
    "old_total": 1200.00,
    "new_total": 950.00,
    "items_changed": 2,
    "fees_added": 1
  },
  "items": [
    {
      "type": "price_changed",
      "item_id": "item-uuid-1",
      "product_name": "商品 A",
      "old_price": 50.00,
      "new_price": 40.00
    },
    {
      "type": "quantity_changed",
      "item_id": "item-uuid-1",
      "product_name": "商品 A",
      "old_quantity": 5,
      "new_quantity": 3
    },
    {
      "type": "added",
      "product_name": "商品 B",
      "new_price": 30.00,
      "new_quantity": 2
    }
  ],
  "fees": [
    {
      "type": "added",
      "fee_name": "手續費",
      "amount": 50.00
    }
  ],
  "shipping": {
    "old_fee": 100.00,
    "new_fee": 0.00
  },
  "coupon": null
}
```

---

## 三、PostgreSQL Functions

### 3.1 運費計算函數

```sql
CREATE OR REPLACE FUNCTION calculate_shipping_fee(
  p_user_id UUID,
  p_subtotal DECIMAL
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_tier_id UUID;
  v_shipping_fee DECIMAL(10,2);
  v_free_threshold DECIMAL(10,2);
BEGIN
  -- 取得用戶等級與運費設定
  SELECT t.id, t.shipping_fee, t.free_shipping_threshold
  INTO v_tier_id, v_shipping_fee, v_free_threshold
  FROM profiles p
  JOIN tiers t ON t.id = p.tier_id
  WHERE p.id = p_user_id;

  -- 若找不到用戶或等級，預設免運
  IF v_tier_id IS NULL THEN
    RETURN 0;
  END IF;

  -- 若設定免運，直接返回 0
  IF v_shipping_fee = 0 THEN
    RETURN 0;
  END IF;

  -- 若有滿額免運門檻且商品金額達標，返回 0
  IF v_free_threshold IS NOT NULL AND p_subtotal >= v_free_threshold THEN
    RETURN 0;
  END IF;

  -- 否則返回基本運費
  RETURN v_shipping_fee;
END;
$$;
```

#### 使用範例

```sql
-- 計算用戶 'user-123' 的訂單運費（商品金額 800 元）
SELECT calculate_shipping_fee('user-123', 800.00);
-- 結果: 100.00 (未滿 1000 免運門檻)

-- 計算用戶 'user-123' 的訂單運費（商品金額 1200 元）
SELECT calculate_shipping_fee('user-123', 1200.00);
-- 結果: 0.00 (滿足免運門檻)
```

---

### 3.2 標記出貨並扣減庫存（取代 confirm_order_and_deduct_stock）

```sql
CREATE OR REPLACE FUNCTION mark_order_as_shipping(p_order_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_status TEXT;
  v_item RECORD;
  v_current_stock INTEGER;
BEGIN
  -- 檢查訂單狀態
  SELECT status INTO v_current_status FROM orders WHERE id = p_order_id;

  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT FALSE, '訂單不存在';
    RETURN;
  END IF;

  IF v_current_status <> 'pending' THEN
    RETURN QUERY SELECT FALSE, '僅待確認訂單可標記出貨';
    RETURN;
  END IF;

  -- 扣減庫存（原子性操作）
  FOR v_item IN
    SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
  LOOP
    -- 取得當前庫存
    SELECT stock INTO v_current_stock FROM products WHERE id = v_item.product_id FOR UPDATE;

    -- 扣減庫存（支援負庫存）
    UPDATE products SET stock = stock - v_item.quantity WHERE id = v_item.product_id;
  END LOOP;

  -- 更新訂單狀態
  UPDATE orders SET status = 'shipping', updated_at = NOW() WHERE id = p_order_id;

  -- 記錄操作歷史
  INSERT INTO order_timelines (order_id, action_type, old_status, new_status)
  VALUES (p_order_id, 'status_changed', 'pending', 'shipping');

  RETURN QUERY SELECT TRUE, '訂單已標記為出貨中，庫存已扣減';
END;
$$;
```

---

### 3.3 批次修改訂單

```sql
CREATE OR REPLACE FUNCTION update_order_with_modifications(
  p_order_id UUID,
  p_modifications JSONB,
  p_actor_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT, new_total DECIMAL)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_status TEXT;
  v_new_total DECIMAL(10,2);
  v_item JSONB;
  v_fee JSONB;
BEGIN
  -- 檢查訂單狀態
  SELECT status INTO v_current_status FROM orders WHERE id = p_order_id;

  IF v_current_status NOT IN ('pending') THEN
    RETURN QUERY SELECT FALSE, '僅待確認訂單可修改', NULL::DECIMAL;
    RETURN;
  END IF;

  -- 處理商品修改
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_modifications->'items')
  LOOP
    CASE v_item->>'type'
      WHEN 'price_changed' THEN
        UPDATE order_items
        SET deal_price = (v_item->>'new_price')::DECIMAL,
            subtotal = (v_item->>'new_price')::DECIMAL * quantity
        WHERE id = (v_item->>'item_id')::UUID;

      WHEN 'quantity_changed' THEN
        UPDATE order_items
        SET quantity = (v_item->>'new_quantity')::INTEGER,
            subtotal = deal_price * (v_item->>'new_quantity')::INTEGER
        WHERE id = (v_item->>'item_id')::UUID;

      WHEN 'removed' THEN
        DELETE FROM order_items WHERE id = (v_item->>'item_id')::UUID;

      WHEN 'added' THEN
        INSERT INTO order_items (order_id, product_id, product_name_snapshot, deal_price, quantity, subtotal)
        VALUES (
          p_order_id,
          (v_item->>'product_id')::UUID,
          v_item->>'product_name',
          (v_item->>'new_price')::DECIMAL,
          (v_item->>'new_quantity')::INTEGER,
          (v_item->>'new_price')::DECIMAL * (v_item->>'new_quantity')::INTEGER
        );
    END CASE;
  END LOOP;

  -- 處理費用修改
  FOR v_fee IN SELECT * FROM jsonb_array_elements(p_modifications->'fees')
  LOOP
    CASE v_fee->>'type'
      WHEN 'added' THEN
        INSERT INTO order_custom_fees (order_id, fee_name, amount, created_by)
        VALUES (
          p_order_id,
          v_fee->>'fee_name',
          (v_fee->>'amount')::DECIMAL,
          p_actor_id
        );

      WHEN 'removed' THEN
        DELETE FROM order_custom_fees
        WHERE order_id = p_order_id AND fee_name = v_fee->>'fee_name';
    END CASE;
  END LOOP;

  -- 處理運費修改
  IF p_modifications->'shipping' IS NOT NULL THEN
    UPDATE orders
    SET shipping_fee = (p_modifications->'shipping'->>'new_fee')::DECIMAL
    WHERE id = p_order_id;
  END IF;

  -- 重新計算總金額
  SELECT
    COALESCE(SUM(oi.subtotal), 0) - COALESCE(oc.discount_amount, 0) + o.shipping_fee + COALESCE(SUM(ocf.amount), 0)
  INTO v_new_total
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  LEFT JOIN order_coupons oc ON oc.order_id = o.id
  LEFT JOIN order_custom_fees ocf ON ocf.order_id = o.id
  WHERE o.id = p_order_id
  GROUP BY o.id, o.shipping_fee, oc.discount_amount;

  -- 更新訂單總金額
  UPDATE orders SET total_amount = v_new_total, updated_at = NOW() WHERE id = p_order_id;

  -- 記錄修改歷程
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, modifications)
  VALUES (p_order_id, 'order_modified', p_actor_id, 'admin', p_modifications);

  RETURN QUERY SELECT TRUE, '訂單修改成功', v_new_total;
END;
$$;
```

---

## 四、索引設計

### 4.1 新增索引

```sql
-- order_custom_fees 表
CREATE INDEX idx_order_custom_fees_order_id ON order_custom_fees(order_id);
CREATE INDEX idx_order_custom_fees_created_by ON order_custom_fees(created_by);

-- order_timelines 表（既有，確認是否需要額外索引）
CREATE INDEX idx_order_timelines_action_type ON order_timelines(action_type);
CREATE INDEX idx_order_timelines_modifications ON order_timelines USING GIN(modifications);  -- JSONB 搜尋
```

---

## 五、RLS (Row Level Security) 策略

### 5.1 order_custom_fees 表

```sql
-- 啟用 RLS
ALTER TABLE order_custom_fees ENABLE ROW LEVEL SECURITY;

-- 客戶可查看自己訂單的費用
CREATE POLICY "Users can view their order custom fees"
  ON order_custom_fees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_custom_fees.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- 管理員可管理所有費用
CREATE POLICY "Admins can manage all order custom fees"
  ON order_custom_fees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
```

---

## 六、資料遷移策略

### 6.1 Phase 1: 新增運費功能

```sql
-- Migration: 20260106_add_shipping_features.sql

-- 1. 擴展 tiers 表
ALTER TABLE tiers ADD COLUMN (
  shipping_fee DECIMAL(10,2) DEFAULT 0,
  free_shipping_threshold DECIMAL(10,2),

  CONSTRAINT check_shipping_fee_non_negative CHECK (shipping_fee >= 0),
  CONSTRAINT check_free_shipping_threshold_positive CHECK (
    free_shipping_threshold IS NULL OR free_shipping_threshold > 0
  )
);

-- 2. 擴展 orders 表
ALTER TABLE orders ADD COLUMN (
  shipping_fee DECIMAL(10,2) DEFAULT 0,

  CONSTRAINT check_shipping_fee_non_negative CHECK (shipping_fee >= 0)
);

-- 3. 新增 order_custom_fees 表
CREATE TABLE order_custom_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  fee_name VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT check_fee_name_not_empty CHECK (TRIM(fee_name) <> '')
);

CREATE INDEX idx_order_custom_fees_order_id ON order_custom_fees(order_id);

-- 4. 啟用 RLS
ALTER TABLE order_custom_fees ENABLE ROW LEVEL SECURITY;

-- 5. 新增 RLS Policy（見上方）
```

### 6.2 Phase 2: 移除 confirmed 狀態

```sql
-- Migration: 20260107_remove_confirmed_status.sql

-- 1. 更新現有訂單狀態（confirmed → shipping）
UPDATE orders SET status = 'shipping' WHERE status = 'confirmed';

-- 2. 修改 CHECK 約束
ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'shipping', 'completed', 'cancelled'));

-- 3. 刪除舊的 confirm_order_and_deduct_stock 函數
DROP FUNCTION IF EXISTS confirm_order_and_deduct_stock(UUID);

-- 4. 新增 mark_order_as_shipping 函數（見上方）
```

### 6.3 Phase 3: 擴展修改歷程

```sql
-- Migration: 20260108_extend_order_timelines.sql

-- 1. 新增 modifications 欄位
ALTER TABLE order_timelines ADD COLUMN modifications JSONB;

-- 2. 擴展 action_type
ALTER TABLE order_timelines DROP CONSTRAINT order_timelines_action_type_check;
ALTER TABLE order_timelines ADD CONSTRAINT order_timelines_action_type_check
  CHECK (action_type IN ('created', 'status_changed', 'cancelled', 'comment', 'order_modified'));

-- 3. 新增 JSONB 索引
CREATE INDEX idx_order_timelines_modifications ON order_timelines USING GIN(modifications);
```

---

## 七、向下相容性

### 7.1 現有訂單處理

**運費欄位預設值**：
- 所有現有訂單 `shipping_fee` 預設為 0（免運）
- 不影響現有訂單的 `total_amount`（已包含優惠券折扣）

**confirmed 狀態轉換**：
- Migration 自動將 `confirmed` 狀態轉為 `shipping`
- 不影響業務邏輯（已確認的訂單視為已出貨）

### 7.2 API 向下相容

**Server Actions**：
- `confirmOrder()` 重新命名為 `markAsShipping()`（保留舊函數作為 alias）
- `calculateShippingFee()` 為新增函數，不影響現有 API

---

## 八、效能考量

### 8.1 查詢優化

**訂單總額計算**：
- 使用索引加速 JOIN 查詢（`order_items`, `order_custom_fees`）
- 考慮新增 Computed Column 或 Materialized View（若效能不佳）

### 8.2 JSONB 查詢

**修改歷程查詢**：
- 使用 GIN 索引加速 JSONB 欄位查詢
- 避免全表掃描（透過 `order_id` 過濾）

---

## 九、測試資料

### 9.1 會員等級運費設定

```sql
-- 零售客戶：收運費 100 元，滿 1000 免運
UPDATE tiers SET shipping_fee = 100.00, free_shipping_threshold = 1000.00
WHERE name = '零售';

-- 批發客戶：完全免運
UPDATE tiers SET shipping_fee = 0.00, free_shipping_threshold = NULL
WHERE name = '批發';

-- 經銷商：完全免運
UPDATE tiers SET shipping_fee = 0.00, free_shipping_threshold = NULL
WHERE name = '經銷商';
```

### 9.2 訂單自訂費用範例

```sql
-- 手續費
INSERT INTO order_custom_fees (order_id, fee_name, amount, created_by)
SELECT
  o.id,
  '手續費',
  60.00,
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
FROM orders o
WHERE o.order_number = 'ORD-20260106-0001';

-- 總額調整（減免 100 元）
INSERT INTO order_custom_fees (order_id, fee_name, amount, created_by)
SELECT
  o.id,
  '總額調整',
  -100.00,
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
FROM orders o
WHERE o.order_number = 'ORD-20260106-0001';
```

---

**最後更新**: 2026-01-06
**版本**: v1.0.0
