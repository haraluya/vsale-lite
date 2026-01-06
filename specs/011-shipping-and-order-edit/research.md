# Feature 011: Phase 0 技術研究報告

**專案**: Vsale-lite
**功能**: 運費設定與訂單修改系統
**研究日期**: 2026-01-06
**研究者**: Claude Sonnet 4.5

---

## 研究目標

本研究旨在為 Feature 011 的實作提供技術決策支援，確保訂單修改功能的原子性、安全性與可維護性。研究範圍包含：

1. PostgreSQL Transaction 最佳實踐
2. 訂單狀態遷移策略
3. JSONB 欄位最佳實踐
4. 運費計算邏輯
5. UI 狀態管理

---

## 研究主題 1: PostgreSQL Transaction 最佳實踐

### 背景

訂單批次修改涉及多個資料表的更新（orders, order_items, order_custom_fees, order_timelines），必須確保**原子性**（全部成功或全部失敗），避免部分修改導致資料不一致。

### 技術選項

#### 選項 A: Supabase Client Transaction API
```typescript
// 使用 Supabase Client 的 Transaction API
const { data, error } = await supabase.rpc('pg_transaction', {
  queries: [
    'UPDATE orders SET total_amount = 1000 WHERE id = ...',
    'UPDATE order_items SET quantity = 2 WHERE id = ...',
    'INSERT INTO order_timelines ...',
  ]
});
```

**優點**:
- 前端可直接控制 Transaction 邏輯
- 適合簡單的批次操作

**缺點**:
- Supabase Client 並未原生支援完整的 Transaction API
- 需要自行處理 ROLLBACK 邏輯
- 網路延遲可能導致 Transaction 超時

#### 選項 B: PostgreSQL Function (推薦)
```sql
CREATE OR REPLACE FUNCTION update_order_with_modifications(
  p_order_id UUID,
  p_modifications JSONB,
  p_actor_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT, new_total DECIMAL)
LANGUAGE plpgsql
AS $$
BEGIN
  -- 所有操作在單一 Transaction 中執行
  UPDATE orders SET ... WHERE id = p_order_id;
  UPDATE order_items SET ... WHERE id = ...;
  INSERT INTO order_custom_fees ...;
  INSERT INTO order_timelines ...;

  RETURN QUERY SELECT TRUE, '修改成功', v_new_total;
EXCEPTION
  WHEN OTHERS THEN
    -- 自動 ROLLBACK
    RETURN QUERY SELECT FALSE, SQLERRM, NULL::DECIMAL;
END;
$$;
```

**優點**:
- 原生支援 Transaction，自動 ROLLBACK
- 減少網路往返（單次 RPC 呼叫）
- 業務邏輯封裝於資料庫層，易於測試
- 支援複雜的條件判斷與錯誤處理

**缺點**:
- 需要撰寫 PL/pgSQL 程式碼
- 偵錯相對複雜（需使用 Supabase Studio 或 psql）

### 決策

**採用選項 B (PostgreSQL Function)**

**理由**:
1. **原子性保證**：PostgreSQL Function 原生支援 Transaction，任何步驟失敗自動 ROLLBACK
2. **效能優勢**：單次 RPC 呼叫，減少網路延遲
3. **業務邏輯集中**：複雜的修改邏輯（商品價格計算、總額更新、歷程記錄）集中於資料庫層
4. **現有架構一致性**：專案已使用多個 PostgreSQL Functions（如 `generate_order_number()`, `confirm_order_and_deduct_stock()`）

**實作策略**:
- 建立單一 Function `update_order_with_modifications(order_id, modifications_json, actor_id)`
- 使用 JSONB 參數傳遞所有修改資料（商品變更、費用新增、運費調整）
- 函數內部使用 `FOR ... LOOP` 遍歷 JSONB 陣列，逐項處理修改
- 使用 `EXCEPTION` 區塊捕捉錯誤並回傳錯誤訊息

**失敗處理**:
- 前端：顯示錯誤訊息，保留編輯狀態（不清空表單）
- 後端：記錄錯誤日誌（`audit_logs` 表）
- 資料庫：自動 ROLLBACK，不留下部分修改

---

## 研究主題 2: 訂單狀態遷移策略

### 背景

現有訂單狀態流程：`pending` → `confirmed` → `shipping` → `completed`

新流程（移除 `confirmed`）：`pending` → `shipping` → `completed`

需要安全地遷移現有資料，並更新所有相關程式碼。

### 技術選項

#### 選項 A: 軟刪除（保留 confirmed 狀態但不使用）
```sql
-- 保留 confirmed 在 CHECK 約束中
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'shipping', 'completed', 'cancelled'));

-- 新訂單僅使用 pending, shipping, completed
-- 舊訂單保持 confirmed 狀態不變
```

**優點**:
- 向下相容性最佳（舊資料不需修改）
- 回滾容易（僅需恢復程式碼）

**缺點**:
- 技術債務累積（confirmed 狀態長期存在但不使用）
- 邏輯混亂（新舊流程並存）
- 管理員可能誤操作舊訂單

#### 選項 B: 完整遷移（推薦）
```sql
-- 1. 更新現有訂單狀態
UPDATE orders SET status = 'shipping' WHERE status = 'confirmed';

-- 2. 修改 CHECK 約束
ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'shipping', 'completed', 'cancelled'));

-- 3. 刪除舊函數
DROP FUNCTION IF EXISTS confirm_order_and_deduct_stock(UUID);

-- 4. 建立新函數
CREATE FUNCTION mark_order_as_shipping(...) ...
```

**優點**:
- 邏輯清晰（僅一種狀態流程）
- 避免技術債務
- 易於維護與測試

**缺點**:
- 需要完整回歸測試
- Migration 必須謹慎處理（先在本地環境測試）

### 決策

**採用選項 B (完整遷移)**

**理由**:
1. **長期維護性**：避免新舊流程並存導致的混亂
2. **業務需求明確**：`confirmed` 狀態的存在是為了在確認訂單時扣減庫存，但現在改為出貨時扣減，因此不再需要
3. **現有資料量可控**：專案尚在初期，現有訂單數量少，遷移風險低

**Migration 策略**:

**Phase 1: 資料轉換**
```sql
-- 將所有 confirmed 訂單改為 shipping
UPDATE orders SET status = 'shipping', updated_at = NOW() WHERE status = 'confirmed';

-- 記錄操作歷史（可選）
INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, old_status, new_status, content)
SELECT
  id,
  'status_changed',
  NULL,
  'system',
  'confirmed',
  'shipping',
  'Migration: 自動轉換狀態（移除 confirmed）'
FROM orders WHERE status = 'confirmed';
```

**Phase 2: Schema 變更**
```sql
-- 修改 CHECK 約束（移除 confirmed）
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'shipping', 'completed', 'cancelled'));
```

**Phase 3: 函數重構**
```sql
-- 刪除舊函數
DROP FUNCTION IF EXISTS confirm_order_and_deduct_stock(UUID);
DROP FUNCTION IF EXISTS update_order_status(UUID, TEXT, UUID);

-- 建立新函數
CREATE FUNCTION mark_order_as_shipping(...) ...
CREATE FUNCTION update_order_status(...) ...  -- 簡化版，移除 confirmed 邏輯
```

**向下相容性保證**:
- 所有 TypeScript 型別定義移除 `'confirmed'`（`OrderStatus` 型別）
- 所有 Server Actions 移除 `confirmOrder()`，新增 `markAsShipping()`
- 所有 UI 元件移除「確認訂單」按鈕，改為「標記出貨」
- Zod Schema 更新狀態驗證規則

**Rollback 計畫**:
```sql
-- 若部署後發現問題，可回滾 CHECK 約束
ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'shipping', 'completed', 'cancelled'));

-- 恢復舊函數（從備份還原）
-- 恢復前端程式碼（git revert）
```

---

## 研究主題 3: JSONB 欄位最佳實踐

### 背景

`order_timelines.modifications` 欄位需儲存訂單修改的詳細資訊（商品價格變更、數量調整、費用新增等），JSONB 提供靈活的 Schema-less 儲存。

### Schema 設計

#### 修改歷程 JSONB 結構
```jsonb
{
  "summary": {
    "old_total": 1000,
    "new_total": 850,
    "items_changed": 2,
    "fees_added": 1
  },
  "items": [
    {
      "type": "price_changed",
      "item_id": "uuid",
      "product_name": "商品 A",
      "old_price": 50,
      "new_price": 40
    },
    {
      "type": "quantity_changed",
      "item_id": "uuid",
      "product_name": "商品 A",
      "old_quantity": 5,
      "new_quantity": 3
    },
    {
      "type": "removed",
      "item_id": "uuid",
      "product_name": "商品 B"
    },
    {
      "type": "added",
      "product_id": "uuid",
      "product_name": "商品 C",
      "new_price": 30,
      "new_quantity": 2
    }
  ],
  "fees": [
    {
      "type": "added",
      "fee_name": "手續費",
      "amount": 50
    }
  ],
  "shipping": {
    "old_fee": 100,
    "new_fee": 0
  }
}
```

### 查詢與索引

#### GIN 索引（推薦用於 JSONB 欄位）
```sql
-- 建立 GIN 索引以加速 JSONB 查詢
CREATE INDEX idx_order_timelines_modifications
  ON order_timelines USING GIN(modifications);
```

**適用情境**:
- 查詢特定類型的修改：`WHERE modifications @> '{"items": [{"type": "price_changed"}]}'`
- 查詢包含特定商品的修改：`WHERE modifications->'items' @> '[{"product_name": "商品 A"}]'`

#### 查詢範例
```sql
-- 查詢所有價格變更的修改記錄
SELECT * FROM order_timelines
WHERE modifications @> '{"items": [{"type": "price_changed"}]}';

-- 查詢特定訂單的修改歷程
SELECT
  created_at,
  modifications->'summary'->>'old_total' AS old_total,
  modifications->'summary'->>'new_total' AS new_total
FROM order_timelines
WHERE order_id = 'uuid' AND action_type = 'order_modified'
ORDER BY created_at DESC;
```

### 前端格式化顯示

#### TypeScript 型別定義
```typescript
export type OrderModifications = {
  summary: {
    old_total: number;
    new_total: number;
    items_changed: number;
    fees_added: number;
  };
  items: Array<{
    type: 'price_changed' | 'quantity_changed' | 'removed' | 'added';
    item_id?: string;
    product_id?: string;
    product_name: string;
    old_price?: number;
    new_price?: number;
    old_quantity?: number;
    new_quantity?: number;
  }>;
  fees?: Array<{
    type: 'added' | 'removed';
    fee_name: string;
    amount: number;
  }>;
  shipping?: {
    old_fee: number;
    new_fee: number;
  } | null;
};
```

#### UI 顯示邏輯
```tsx
// 格式化修改項目顯示
function formatModificationItem(item: ModificationItem) {
  switch (item.type) {
    case 'price_changed':
      return `${item.product_name}: 單價 NT$${item.old_price} → NT$${item.new_price}`;
    case 'quantity_changed':
      return `${item.product_name}: 數量 ${item.old_quantity} → ${item.new_quantity}`;
    case 'removed':
      return `移除商品: ${item.product_name}`;
    case 'added':
      return `新增商品: ${item.product_name} × ${item.new_quantity} (NT$${item.new_price})`;
  }
}
```

### 決策

**JSONB 結構設計原則**:
1. **明確的型別標記**：每個修改項目必須有 `type` 欄位（如 `price_changed`, `quantity_changed`）
2. **保留舊值**：記錄 `old_price`, `old_quantity`，方便對比顯示
3. **摘要資訊**：`summary` 欄位提供快速概覽（總額變化、修改項目數量）
4. **可擴展性**：若未來需新增修改類型（如備註修改），僅需新增 `type` 不影響現有資料

**索引策略**:
- 使用 GIN 索引加速 JSONB 查詢
- 避免過度索引（僅在需要查詢的欄位建立索引）

**前端顯示策略**:
- 使用 TypeScript 型別確保 JSONB 資料結構一致性
- 建立專用的格式化函式（`formatModificationItem()`）處理各種修改類型
- 使用色彩與圖示區分修改類型（新增=綠色、移除=紅色、修改=黃色）

---

## 研究主題 4: 運費計算邏輯

### 背景

運費計算需考慮：
1. 會員等級的運費設定（基本運費、滿額免運門檻）
2. 優惠券折扣與運費的互動關係
3. 免運門檻判定邏輯

### 技術選項

#### 選項 A: Server Action 計算
```typescript
// lib/actions/orders.ts
export async function calculateShippingFee(userId: string, subtotal: number) {
  const supabase = await createClient();

  // 查詢客戶等級
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier_id')
    .eq('id', userId)
    .single();

  // 查詢等級運費設定
  const { data: tier } = await supabase
    .from('tiers')
    .select('shipping_fee, free_shipping_threshold')
    .eq('id', profile.tier_id)
    .single();

  // 計算運費
  if (tier.shipping_fee === 0) return 0;
  if (tier.free_shipping_threshold && subtotal >= tier.free_shipping_threshold) return 0;
  return tier.shipping_fee;
}
```

**優點**:
- 邏輯在 TypeScript 中撰寫，易於偵錯
- 可直接使用 Zod 驗證

**缺點**:
- 需要多次查詢資料庫（profiles + tiers）
- 網路延遲較高

#### 選項 B: PostgreSQL Function (推薦)
```sql
CREATE OR REPLACE FUNCTION calculate_shipping_fee(
  p_user_id UUID,
  p_subtotal DECIMAL
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_shipping_fee DECIMAL(10,2);
  v_free_threshold DECIMAL(10,2);
BEGIN
  -- 單次查詢取得等級運費設定
  SELECT t.shipping_fee, t.free_shipping_threshold
  INTO v_shipping_fee, v_free_threshold
  FROM profiles p
  JOIN tiers t ON t.id = p.tier_id
  WHERE p.id = p_user_id;

  -- 計算運費
  IF v_shipping_fee = 0 THEN
    RETURN 0;
  END IF;

  IF v_free_threshold IS NOT NULL AND p_subtotal >= v_free_threshold THEN
    RETURN 0;
  END IF;

  RETURN v_shipping_fee;
END;
$$;
```

**優點**:
- 單次查詢（JOIN profiles + tiers）
- 效能最佳（減少網路往返）
- 邏輯集中於資料庫層

**缺點**:
- PL/pgSQL 偵錯較複雜

### 優惠券與運費互動規則

**規則定義**:
1. **優惠券最低金額驗證**：不包含運費（僅計算商品總額）
2. **免運門檻判定**：依原始商品金額（不扣除優惠券折扣）

**範例情境**:
```
商品總額: NT$1200
優惠券折扣: -NT$500 (SALE500)
折扣後金額: NT$700
免運門檻: NT$1000

免運判定: 1200 >= 1000 → 符合免運 ✅
（依原始商品金額，不看折扣後金額）

優惠券驗證: 700 >= 500（假設優惠券最低金額為 500） → 通過 ✅
（驗證時使用折扣後金額）
```

**實作邏輯**:
```typescript
// lib/actions/orders.ts - createOrder()
export async function createOrder(items: CartItem[], userCouponId?: string, notes?: string) {
  // 1. 計算商品總額（原始金額）
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // 2. 計算優惠券折扣
  let couponDiscount = 0;
  if (userCouponId) {
    const result = await validateCoupon(userCouponId, subtotal);  // 驗證時使用原始金額
    if (result.valid) {
      couponDiscount = result.discountAmount;
    }
  }

  // 3. 計算運費（使用原始商品金額，不扣除優惠券）
  const { data: shippingFee } = await supabase.rpc('calculate_shipping_fee', {
    p_user_id: userId,
    p_subtotal: subtotal,  // 傳遞原始金額
  });

  // 4. 計算最終總額
  const finalTotal = subtotal - couponDiscount + shippingFee;
}
```

### 決策

**採用選項 B (PostgreSQL Function)**

**理由**:
1. **效能優勢**：單次查詢，減少網路延遲
2. **邏輯集中**：運費計算邏輯封裝於資料庫層，與訂單建立邏輯分離
3. **可重用性**：前端購物車預覽、訂單建立、訂單修改都可呼叫同一函數

**優惠券互動策略**:
- **免運門檻**：使用原始商品金額（`subtotal`），不扣除優惠券折扣
- **優惠券驗證**：使用折扣後金額驗證最低金額條件
- **理由**：避免客戶使用大額優惠券後規避運費（例：商品 1200 元使用 500 元優惠券，折扣後 700 元低於免運門檻，但原始金額已達標應免運）

---

## 研究主題 5: UI 狀態管理

### 背景

訂單編輯器需要管理複雜的暫存狀態（商品修改、費用新增、運費調整），使用者可能在編輯過程中取消或重新整理頁面。

### 技術選項

#### 選項 A: Zustand 全域狀態管理
```typescript
// stores/order-editor.ts
interface OrderEditorState {
  editedItems: OrderItem[];
  editedFees: OrderCustomFee[];
  editedShippingFee: number;
  setEditedItems: (items: OrderItem[]) => void;
  setEditedFees: (fees: OrderCustomFee[]) => void;
  reset: () => void;
}

export const useOrderEditorStore = create<OrderEditorState>()(
  persist(
    (set) => ({
      editedItems: [],
      editedFees: [],
      editedShippingFee: 0,
      // ...
    }),
    { name: 'order-editor' }
  )
);
```

**優點**:
- 狀態持久化（persist），重新整理頁面不遺失
- 跨元件共享狀態

**缺點**:
- 增加複雜度（需清理舊資料）
- 多個訂單編輯時可能衝突（需額外處理）

#### 選項 B: React State（推薦）
```tsx
// components/admin/orders/order-editor.tsx
export function OrderEditor({ order, items, customFees, onSave, onCancel }) {
  const [editedItems, setEditedItems] = useState(items);
  const [editedFees, setEditedFees] = useState(customFees);
  const [editedShippingFee, setEditedShippingFee] = useState(order.shipping_fee);

  // 所有修改暫存於 React State
  // 按「儲存變更」後一次性提交
}
```

**優點**:
- 簡單直接，不需額外的狀態管理庫
- 取消編輯時自動清空（unmount 時狀態消失）
- 不會與其他訂單編輯衝突

**缺點**:
- 重新整理頁面會遺失編輯內容（但可透過提示避免）

### 暫存機制選擇

#### 前端暫存（推薦）
```tsx
const handleSave = async () => {
  // 1. 前端建構 modifications JSON
  const modifications = {
    items: [...],
    fees: [...],
    shipping: { ... },
  };

  // 2. 一次性提交至後端
  const result = await updateOrderDetails(orderId, modifications);

  if (result.success) {
    onSave();  // 重新載入訂單資料
  }
};
```

**優點**:
- 使用者可預覽所有修改後再提交
- 減少後端請求次數（一次性提交）
- 提交前可進行前端驗證（如數量不可為 0）

**缺點**:
- 需處理頁面離開時的確認提示（`beforeunload`）

#### 後端暫存
```typescript
// 每次修改立即儲存至後端暫存表
await supabase.from('order_draft_modifications').insert({
  order_id: orderId,
  modifications: { ... },
});

// 按「儲存變更」時套用暫存
await supabase.rpc('apply_draft_modifications', { order_id: orderId });
```

**優點**:
- 不怕頁面重新整理
- 支援多人協作（顯示其他管理員的草稿）

**缺點**:
- 增加複雜度（需管理草稿表）
- 需處理草稿清理邏輯

### 樂觀更新 vs 悲觀更新

#### 樂觀更新（Optimistic Update）
```tsx
const handleSave = async () => {
  // 1. 先更新 UI（假設成功）
  setOrder({ ...order, total_amount: newTotal });

  // 2. 再發送請求
  const result = await updateOrderDetails(orderId, modifications);

  if (!result.success) {
    // 3. 失敗則回滾 UI
    setOrder(originalOrder);
    alert(result.message);
  }
};
```

**適用情境**:
- 網路延遲高時提升使用者體驗
- 成功率高的操作

**不適用情境**:
- 訂單修改（失敗率可能較高，如優惠券驗證失敗）

#### 悲觀更新（Pessimistic Update - 推薦）
```tsx
const handleSave = async () => {
  setLoading(true);

  // 1. 發送請求
  const result = await updateOrderDetails(orderId, modifications);

  setLoading(false);

  if (result.success) {
    // 2. 成功後重新載入訂單資料
    onSave();
  } else {
    // 3. 失敗則保留編輯狀態，顯示錯誤
    alert(result.message);
  }
};
```

**適用情境**:
- 訂單修改（可能失敗，如優惠券驗證、庫存檢查）

### 決策

**採用選項 B (React State) + 前端暫存 + 悲觀更新**

**理由**:
1. **簡單性**：React State 足以滿足需求，不需引入額外的狀態管理庫
2. **一次性提交**：前端暫存所有修改，按「儲存變更」後一次性提交，減少後端請求
3. **悲觀更新**：訂單修改可能失敗（優惠券驗證、Transaction 錯誤），悲觀更新確保 UI 與資料庫一致
4. **離開確認**：使用 `beforeunload` 事件提示使用者未儲存的修改

**實作細節**:
```tsx
// 離開頁面確認
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '您有未儲存的修改，確定要離開嗎？';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);
```

**不採用 Zustand 的原因**:
- 訂單編輯為單一頁面操作，不需跨元件共享狀態
- 避免多個訂單編輯時的狀態衝突
- 簡化架構（購物車已使用 Zustand，訂單編輯無需重複）

---

## 研究結論與建議

### 關鍵技術決策總結

| 研究主題 | 選擇方案 | 核心理由 |
|---------|---------|---------|
| Transaction 處理 | PostgreSQL Function | 原子性保證、效能優勢、邏輯集中 |
| 狀態遷移策略 | 完整遷移（移除 confirmed） | 長期維護性、避免技術債務 |
| JSONB 結構設計 | 明確型別標記 + GIN 索引 | 靈活性與查詢效能平衡 |
| 運費計算邏輯 | PostgreSQL Function | 效能優勢、可重用性 |
| UI 狀態管理 | React State + 前端暫存 | 簡單性、一次性提交 |

### 風險評估

| 風險項目 | 嚴重性 | 緩解措施 |
|---------|-------|---------|
| 狀態遷移失敗 | 高 | 完整備份 + 本地測試 + Rollback 計畫 |
| Transaction 超時 | 中 | 設定合理的超時時間（10s），前端顯示載入狀態 |
| JSONB 結構變更 | 低 | 使用 TypeScript 型別檢查，避免結構不一致 |
| 優惠券驗證錯誤 | 中 | 提示管理員移除優惠券並重新提交 |

### 下一步行動

1. **Phase 1**：建立 Migration 檔案（運費功能）
2. **Phase 2**：實作 PostgreSQL Functions（運費計算、訂單修改）
3. **Phase 3**：實作 Server Actions（訂單修改、運費設定）
4. **Phase 4**：實作 UI 元件（訂單編輯器、修改歷程顯示）
5. **Phase 5**：完整測試（單元測試、整合測試、E2E 測試）

### 參考資料

- [PostgreSQL Transaction Documentation](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [Supabase RPC Functions](https://supabase.com/docs/guides/database/functions)
- [JSONB Indexing Best Practices](https://www.postgresql.org/docs/current/datatype-json.html)
- [React State Management Patterns](https://react.dev/learn/managing-state)

---

**研究完成日期**: 2026-01-06
**下次審查日期**: 實作完成後
**狀態**: ✅ 完成
