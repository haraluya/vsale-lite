# Research & Technical Decisions: 購物車與訂單管理系統

**Feature**: 購物車與訂單管理系統
**Date**: 2026-01-03
**Status**: Completed

## Overview

本文件記錄 004-cart-and-orders 功能的技術研究與決策過程，解答 `plan.md` 中提出的 5 個關鍵技術問題。所有決策基於專案憲章原則、技術可行性與業務需求。

---

## Research Question 1: 訂單編號產生機制

### 問題描述

- 如何確保 `ORD-YYYYMMDD-XXXX` 格式的唯一性？
- 當日流水號如何避免並發衝突？
- 當日訂單超過 9999 筆如何處理？

### 研究過程

評估了以下三種方案：

1. **Database Sequence (PostgreSQL)**
   - 優點：原子性保證、效能佳、簡單可靠
   - 缺點：需要自訂 Sequence 邏輯（日期重置）

2. **UUID v7 (Timestamp-ordered)**
   - 優點：全域唯一、不需並發控制
   - 缺點：不符合業務需求的編號格式 (ORD-YYYYMMDD-XXXX)

3. **Application-level Counter (Server Action)**
   - 優點：完全控制格式
   - 缺點：並發衝突風險高、需要複雜的鎖機制

### 決策

**選擇方案 1**：使用 PostgreSQL Function 配合 Unique Constraint

**實作策略**：

```sql
-- 建立訂單編號產生 Function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  today TEXT;
  seq_num INTEGER;
  order_num TEXT;
BEGIN
  today := TO_CHAR(NOW(), 'YYYYMMDD');

  -- 查詢當日最大流水號
  SELECT COALESCE(MAX(SUBSTRING(order_number FROM 13)::INTEGER), 0) + 1
  INTO seq_num
  FROM orders
  WHERE order_number LIKE 'ORD-' || today || '-%';

  -- 產生訂單編號
  order_num := 'ORD-' || today || '-' || LPAD(seq_num::TEXT, 4, '0');

  RETURN order_num;
END;
$$ LANGUAGE plpgsql;
```

**並發安全策略**：

1. 在 `orders` 表的 `order_number` 欄位加上 `UNIQUE` 約束
2. Server Action 中使用 `INSERT ... ON CONFLICT` 處理衝突
3. 若發生衝突（極端情況），重試最多 3 次

**處理超過 9999 筆**：

- 當日訂單超過 9999 筆時，將流水號擴展為 5 位數（0001 → 00001）
- 修改 `LPAD` 函式邏輯：`LPAD(seq_num::TEXT, GREATEST(4, LENGTH(seq_num::TEXT)), '0')`
- 這樣可支援當日無限筆訂單

**理由**：
- 符合業務需求的編號格式
- PostgreSQL Function 確保原子性
- Unique Constraint 提供最後防線
- 簡單可靠，維護成本低

**替代方案被拒絕**：
- UUID：不符合業務需求（無法直觀識別訂單日期）
- Application-level Counter：並發風險高，需要複雜的分散式鎖

---

## Research Question 2: 庫存扣減與訂單狀態的原子性

### 問題描述

- 如何確保訂單狀態更新與庫存扣減在同一交易中完成？
- Supabase 是否支援交易 (Transaction)？
- 若交易失敗如何回滾？

### 研究過程

Supabase 基於 PostgreSQL，完全支援 ACID 交易。主要有兩種實作方式：

1. **PostgreSQL Function (推薦)**
   - 在資料庫層級實作交易邏輯
   - 優點：原子性保證、效能佳、邏輯集中
   - 缺點：業務邏輯與資料庫耦合

2. **Supabase RPC + Multiple Queries**
   - 在 Server Action 中使用 Supabase RPC 呼叫多個 Query
   - 優點：業務邏輯在應用層
   - 缺點：需要確保 RPC 內部實作交易

### 決策

**選擇方案 1**：使用 PostgreSQL Function 實作原子性操作

**實作策略**：

```sql
-- 訂單確認並扣減庫存
CREATE OR REPLACE FUNCTION confirm_order_and_deduct_stock(p_order_id UUID)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  -- 開始交易 (PostgreSQL Function 自動包裝在交易中)

  -- 1. 驗證訂單狀態
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF v_order.status != 'pending' THEN
    RAISE EXCEPTION 'Order status must be pending';
  END IF;

  -- 2. 更新訂單狀態
  UPDATE orders SET status = 'confirmed', updated_at = NOW()
  WHERE id = p_order_id;

  -- 3. 扣減庫存（支援負庫存）
  FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id LOOP
    UPDATE products
    SET stock = stock - v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  -- 4. 記錄操作歷史
  INSERT INTO order_timelines (order_id, action_type, old_status, new_status)
  VALUES (p_order_id, 'status_change', 'pending', 'confirmed');

  RETURN json_build_object('success', true, 'order_id', p_order_id);
EXCEPTION
  WHEN OTHERS THEN
    -- 自動回滾
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;
```

**訂單取消與庫存回補**：

```sql
-- 訂單取消並回補庫存
CREATE OR REPLACE FUNCTION cancel_order_and_restore_stock(p_order_id UUID)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  -- 1. 驗證訂單狀態（僅限 pending 或 confirmed）
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF v_order.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Cannot cancel order with status %', v_order.status;
  END IF;

  -- 2. 若訂單已確認，回補庫存
  IF v_order.status = 'confirmed' THEN
    FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id LOOP
      UPDATE products
      SET stock = stock + v_item.quantity
      WHERE id = v_item.product_id;
    END LOOP;
  END IF;

  -- 3. 更新訂單狀態
  UPDATE orders SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_order_id;

  -- 4. 記錄操作歷史
  INSERT INTO order_timelines (order_id, action_type, old_status, new_status)
  VALUES (p_order_id, 'cancelled', v_order.status, 'cancelled');

  RETURN json_build_object('success', true, 'order_id', p_order_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;
```

**Server Action 呼叫方式**：

```typescript
// lib/actions/orders.ts
export async function confirmOrder(orderId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('confirm_order_and_deduct_stock', {
    p_order_id: orderId
  })

  if (error || !data.success) {
    return { success: false, message: data?.error || error.message }
  }

  revalidatePath('/admin/orders')
  return { success: true, data }
}
```

**理由**：
- PostgreSQL Function 保證 ACID 特性
- 邏輯集中在資料庫層，避免應用層並發問題
- 自動回滾機制，失敗時不會造成資料不一致
- 符合憲章 VI（支援負庫存）

**替代方案被拒絕**：
- 應用層交易管理：複雜度高、並發控制困難
- 分步驟執行（先更新狀態再扣庫存）：原子性無法保證

---

## Research Question 3: 購物車持久化策略

### 問題描述

- Zustand persist 的 storage key 命名規則？
- 購物車資料結構設計（僅儲存 product_id + quantity vs. 包含價格快照）？
- 購物車商品價格如何處理（每次讀取時重新查詢 tier_price vs. 快照）？

### 研究過程

評估了兩種資料結構設計：

1. **最小化儲存（僅 ID + 數量）**
   - 優點：資料量小、價格總是最新
   - 缺點：每次讀取需查詢資料庫、離線不可用

2. **完整快照（包含商品資訊與價格）**
   - 優點：讀取快速、離線可用
   - 缺點：資料可能過期、佔用較多空間

### 決策

**選擇方案 1**：最小化儲存，僅保存 `product_id` 與 `quantity`

**資料結構設計**：

```typescript
// stores/cart.ts
interface CartItem {
  productId: string
  quantity: number
}

interface CartState {
  items: CartItem[]
  addItem: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
}
```

**Storage Key 命名規則**：

```typescript
const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      // ... actions
    }),
    {
      name: 'vsale-cart-storage', // 專案前綴 + 功能
      version: 1, // 版本控制，未來資料結構變更時可遷移
    }
  )
)
```

**價格處理策略**：

- 購物車頁面顯示時，透過 Server Action 批次查詢商品資訊與當前用戶的等級價格
- 下單時重新驗證商品狀態與價格，確保資料正確性
- 若商品已刪除或價格未設定，顯示錯誤並要求客戶移除

**Server Action 範例**：

```typescript
// lib/actions/cart.ts
export async function getCartItems(cartItems: CartItem[]) {
  const supabase = await createClient()
  const { user, tier_id } = await checkAuth() // 客戶權限

  // 批次查詢商品與價格
  const { data: items } = await supabase
    .from('products')
    .select(`
      id,
      name,
      image_url,
      tier_prices!inner(price)
    `)
    .in('id', cartItems.map(i => i.productId))
    .eq('tier_prices.tier_id', tier_id)
    .eq('status', 'active')

  // 合併數量資訊
  return items.map(item => ({
    ...item,
    quantity: cartItems.find(c => c.productId === item.id)?.quantity || 1,
    price: item.tier_prices[0]?.price || null,
    subtotal: (item.tier_prices[0]?.price || 0) * (cartItems.find(c => c.productId === item.id)?.quantity || 1)
  }))
}
```

**理由**：
- 符合憲章 II（等級綁定價格）：價格總是即時查詢
- 資料量小，localStorage 不會超限
- 下單時重新驗證，確保價格與庫存正確性
- 簡化狀態管理，避免價格同步問題

**替代方案被拒絕**：
- 完整快照：價格過期風險、佔用空間大、同步複雜

---

## Research Question 4: 訂單時間軸 (order_timelines) 表結構

### 問題描述

- 是否複用現有的 timelines 表？
- 需要記錄哪些欄位？
- 如何與訂單關聯？

### 研究過程

檢查專案現有資料表結構：

```bash
# 查詢現有 migrations
ls supabase/migrations/
```

**發現**：無現有的 `timelines` 表，需建立新表 `order_timelines`。

### 決策

**建立獨立的 `order_timelines` 表**

**表結構設計**：

```sql
CREATE TABLE order_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'created',           -- 訂單建立
    'status_changed',    -- 狀態變更
    'cancelled'          -- 訂單取消
  )),
  actor_id UUID REFERENCES auth.users(id),  -- 操作者（客戶或管理員）
  actor_role TEXT CHECK (actor_role IN ('client', 'admin')),
  old_status TEXT,     -- 舊狀態（僅 status_changed 需要）
  new_status TEXT,     -- 新狀態
  notes TEXT,          -- 備註
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_order_timelines_order_id ON order_timelines(order_id);
CREATE INDEX idx_order_timelines_created_at ON order_timelines(created_at DESC);
```

**RLS 規則**：

```sql
-- 客戶只能查看自己訂單的歷史
CREATE POLICY "Clients can view their order timelines"
  ON order_timelines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_timelines.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 管理員可查看所有訂單歷史
CREATE POLICY "Admins can view all order timelines"
  ON order_timelines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 系統內部建立記錄（透過 PostgreSQL Function）
-- 不開放直接 INSERT 權限
```

**自動記錄機制**：

在訂單相關的 PostgreSQL Function 中自動建立記錄：

```sql
-- 範例：訂單建立時
INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, new_status)
VALUES (v_order_id, 'created', auth.uid(), 'client', 'pending');

-- 範例：訂單狀態變更時
INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, old_status, new_status)
VALUES (v_order_id, 'status_changed', auth.uid(), 'admin', 'pending', 'confirmed');
```

**理由**：
- 獨立表設計，專注於訂單操作歷史
- 支援多種操作類型（建立、狀態變更、取消）
- RLS 規則確保權限控制
- 自動記錄，避免遺漏

**替代方案被拒絕**：
- 複用其他表：無現有 timelines 表可複用
- JSON 欄位儲存歷史：查詢與索引效能差

---

## Research Question 5: RLS 規則設計

### 問題描述

- 客戶查詢訂單的 RLS 規則設計
- 管理員查詢訂單的 RLS 規則設計
- 訂單明細 (order_items) 是否需要獨立的 RLS 規則？

### 研究過程

參考專案現有 RLS 規則設計（如 `products`, `tier_prices`），確認設計模式。

### 決策

**RLS 規則設計**

#### 1. `orders` 表

```sql
-- 啟用 RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 客戶查詢自己的訂單
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

-- 管理員更新訂單狀態
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

#### 2. `order_items` 表

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

-- 訂單明細的 INSERT 由 PostgreSQL Function 處理，不開放直接權限
```

#### 3. `order_timelines` 表

（見 Research Question 4）

**設計模式總結**：

1. **分離讀取與寫入權限**：
   - 客戶可讀自己的訂單（SELECT）
   - 客戶可建立訂單（INSERT），但不能修改或刪除
   - 管理員可讀寫所有訂單

2. **繼承式權限**：
   - `order_items` 與 `order_timelines` 的權限繼承自 `orders`
   - 透過 `EXISTS` 子查詢確認 `order_id` 對應的訂單權限

3. **最小權限原則**：
   - 訂單明細與歷史記錄不開放直接 INSERT 權限
   - 由 PostgreSQL Function 或 Server Action 統一處理

**理由**：
- 符合憲章 I（使用者角色優先）：嚴格權限分離
- RLS 提供資料庫層級的安全保障
- 繼承式設計簡化權限管理
- 符合最小權限原則

**替代方案被拒絕**：
- 應用層權限檢查：容易遺漏、安全性較低
- 不啟用 RLS：安全風險高

---

## Summary of Decisions

| 問題 | 決策 | 關鍵原因 |
|------|------|----------|
| 訂單編號產生 | PostgreSQL Function + Unique Constraint | 原子性保證、格式靈活、並發安全 |
| 庫存扣減原子性 | PostgreSQL Function (交易) | ACID 特性、邏輯集中、自動回滾 |
| 購物車持久化 | 最小化儲存（ID + 數量） | 價格總是最新、資料量小、簡化同步 |
| 訂單時間軸 | 獨立 `order_timelines` 表 | 專注於訂單歷史、RLS 權限控制 |
| RLS 規則 | 分離讀寫權限 + 繼承式設計 | 安全性高、符合最小權限原則 |

**所有決策符合專案憲章原則**，可進入 Phase 1 設計階段。

---

**Status**: ✅ Completed
**Next Phase**: Phase 1 (Data Model & API Contracts)
**Date**: 2026-01-03
