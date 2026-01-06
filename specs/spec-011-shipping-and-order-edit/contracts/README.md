# Feature 011: API 合約文件

**專案**: Vsale-lite
**功能**: 運費設定與訂單修改系統
**最後更新**: 2026-01-06

---

## 目錄

本目錄包含 Feature 011 的所有 Server Actions API 合約定義。

| 檔案 | 說明 | 主要函式 |
|------|------|---------|
| [`shipping.ts`](./shipping.ts) | 運費計算與設定 | `calculateShippingFee`, `updateShippingFee` |
| [`order-modifications.ts`](./order-modifications.ts) | 訂單修改功能 | `updateOrderDetails`, `addOrderItem`, `removeOrderItem`, `addCustomFee`, `adjustTotalAmount` |
| [`order-status.ts`](./order-status.ts) | 訂單狀態流程 | `markAsShipping`, `updateOrderStatus`, `cancelOrder` |
| [`tier-shipping.ts`](./tier-shipping.ts) | 會員等級運費設定 | `updateTierShipping`, `getTierShipping`, `batchUpdateTierShipping` |

---

## 使用說明

### 1. API 合約的用途

這些 TypeScript 型別定義檔案提供：
- ✅ **Server Actions 函式簽名**：參數型別、回傳值型別
- ✅ **資料結構定義**：請求與回應的完整型別
- ✅ **JSDoc 文件**：函式用途、範例、注意事項
- ✅ **使用範例**：實際呼叫方式與預期結果

### 2. 如何使用

**在實作 Server Actions 時**:
```typescript
// lib/actions/orders.ts
import type { OrderModifications } from '@/specs/011-shipping-and-order-edit/contracts/order-modifications';

export async function updateOrderDetails(
  orderId: string,
  modifications: OrderModifications
): Promise<ActionResult<Order>> {
  // 實作邏輯...
}
```

**在 UI 元件中使用**:
```typescript
// components/admin/orders/order-editor.tsx
import { updateOrderDetails } from '@/lib/actions/orders';
import type { OrderModifications } from '@/specs/011-shipping-and-order-edit/contracts/order-modifications';

const modifications: OrderModifications = {
  summary: { old_total: 1000, new_total: 900, items_changed: 1, fees_added: 0 },
  items: [
    { type: 'price_changed', item_id: 'item-123', product_name: '商品 A', old_price: 50, new_price: 40 }
  ],
};

const result = await updateOrderDetails('order-id', modifications);
```

### 3. 型別檢查

使用 TypeScript 編譯器檢查 API 合約的一致性：

```bash
# 檢查所有 Server Actions 是否符合合約
pnpm type-check

# 檢查特定檔案
npx tsc --noEmit lib/actions/orders.ts
```

---

## API 合約詳細說明

### A. 運費相關 API (`shipping.ts`)

#### `calculateShippingFee(userId, subtotal)`
- **用途**: 計算訂單運費
- **邏輯**: 依用戶等級設定計算運費（支援滿額免運）
- **優惠券互動**: 免運門檻使用**原始商品金額**（不扣除優惠券）
- **回傳**: `{ shippingFee: number, isFreeShipping: boolean }`

**範例**:
```typescript
// 零售客戶（運費 100 元，滿 1000 免運）
const result1 = await calculateShippingFee('user-123', 800);
// result1.data.shippingFee = 100, isFreeShipping = false

const result2 = await calculateShippingFee('user-123', 1200);
// result2.data.shippingFee = 0, isFreeShipping = true
```

#### `updateShippingFee(orderId, newFee)`
- **用途**: 手動調整訂單運費
- **權限**: 僅管理員
- **狀態限制**: 僅 `pending` 狀態可修改
- **歷程記錄**: 記錄於 `order_timelines`

---

### B. 訂單修改 API (`order-modifications.ts`)

#### `updateOrderDetails(orderId, modifications)`
- **用途**: 批次修改訂單（商品、價格、數量、運費、費用）
- **原子性**: 所有操作在單一 Transaction 中執行
- **優惠券驗證**: 修改後檢查優惠券條件，不符合則提示移除
- **歷程記錄**: 完整記錄所有變更（JSONB 格式）

**Modifications 結構**:
```typescript
{
  summary: { old_total, new_total, items_changed, fees_added },
  items: [{ type, item_id, product_name, old_price, new_price, ... }],
  fees: [{ type, fee_name, amount }],
  shipping: { old_fee, new_fee },
  coupon: { action, reason }
}
```

#### `addOrderItem(orderId, productId, quantity, price)`
- **用途**: 新增商品至訂單
- **驗證**: 商品存在性、數量 > 0、單價 > 0
- **總額更新**: 自動重新計算

#### `removeOrderItem(orderItemId)`
- **用途**: 移除訂單商品
- **限制**: 訂單至少需保留一個商品

#### `addCustomFee(orderId, name, amount)`
- **用途**: 新增自訂費用（手續費、包裝費、減免等）
- **金額**: 可為負數表示減免
- **範例**: `addCustomFee('order-123', '總額調整', -100)`

#### `adjustTotalAmount(orderId, finalAmount)`
- **用途**: 直接設定訂單總金額
- **邏輯**: 自動計算差額並新增「總額調整」費用項目
- **範例**: 原總額 1000 → 調整為 800 → 新增「總額調整: -200」

---

### C. 訂單狀態 API (`order-status.ts`)

#### `markAsShipping(orderId)`
- **用途**: 標記訂單為出貨中（取代舊的 `confirmOrder`）
- **庫存處理**: 扣減所有商品庫存（原子性操作）
- **狀態轉換**: `pending` → `shipping`
- **歷程記錄**: 記錄狀態變更

#### `updateOrderStatus(orderId, newStatus)`
- **用途**: 更新訂單狀態（簡化版）
- **允許轉換**:
  - `shipping` → `completed`
  - `pending` → `cancelled`
  - `shipping` → `cancelled`（回補庫存）
- **禁止轉換**: `pending` → `shipping`（必須使用 `markAsShipping`）

#### `cancelOrder(orderId, reason)`
- **用途**: 取消訂單
- **庫存處理**:
  - `pending` 取消：不涉及庫存
  - `shipping` 取消：回補庫存
- **原因記錄**: 記錄於 `order_timelines.content`

---

### D. 會員等級運費設定 API (`tier-shipping.ts`)

#### `updateTierShipping(tierId, shippingFee, freeShippingThreshold)`
- **用途**: 設定會員等級運費規則
- **邏輯**:
  - `shippingFee = 0`: 完全免運
  - `shippingFee > 0, threshold = NULL`: 固定運費（不提供滿額免運）
  - `shippingFee > 0, threshold > 0`: 滿額免運
- **驗證**: `shippingFee >= 0`, `threshold > 0 或 NULL`

**範例**:
```typescript
// 零售：運費 100 元，滿 1000 免運
updateTierShipping('tier-retail', 100, 1000);

// 批發：完全免運
updateTierShipping('tier-wholesale', 0, null);

// 經銷商：固定運費 200 元
updateTierShipping('tier-distributor', 200, null);
```

#### `getTierShipping(tierId)`
- **用途**: 查詢等級運費設定
- **權限**: 所有已登入用戶

#### `batchUpdateTierShipping(settings)`
- **用途**: 批次更新多個等級
- **原子性**: 所有更新在單一 Transaction 中執行

---

## 實作檢查清單

在實作 Server Actions 時，請確認以下項目：

### ✅ 型別安全
- [ ] 函式簽名與合約一致
- [ ] 參數型別正確
- [ ] 回傳值型別正確（`ActionResult<T>`）

### ✅ 權限檢查
- [ ] 呼叫 `checkAuth()` 驗證登入狀態
- [ ] 管理員專用函式檢查 `role = 'admin'`
- [ ] 客戶專用函式檢查擁有權（如 `user_id = auth.uid()`）

### ✅ 輸入驗證
- [ ] 使用 Zod Schema 驗證輸入
- [ ] 檢查必填欄位
- [ ] 驗證資料格式（如 UUID、正數、非空字串）

### ✅ 錯誤處理
- [ ] 使用 try-catch 捕捉錯誤
- [ ] 回傳清晰的錯誤訊息（繁體中文）
- [ ] 記錄錯誤日誌（`console.error`）

### ✅ 快取更新
- [ ] 成功後呼叫 `revalidatePath()`
- [ ] 更新相關頁面快取（如訂單列表、訂單詳情）

### ✅ 歷程記錄
- [ ] 記錄操作於 `order_timelines` 或 `audit_logs`
- [ ] 包含操作者資訊（`actor_id`, `actor_role`）
- [ ] 記錄變更內容（JSONB）

---

## 測試建議

### 單元測試
```typescript
// __tests__/lib/actions/orders.test.ts
import { describe, it, expect } from 'vitest';
import { updateOrderDetails } from '@/lib/actions/orders';

describe('updateOrderDetails', () => {
  it('應該正確修改商品單價', async () => {
    const modifications = {
      summary: { old_total: 500, new_total: 400, items_changed: 1, fees_added: 0 },
      items: [
        { type: 'price_changed', item_id: 'item-123', product_name: '商品 A', old_price: 50, new_price: 40 }
      ],
    };

    const result = await updateOrderDetails('order-123', modifications);

    expect(result.success).toBe(true);
    expect(result.data.total_amount).toBe(400);
  });
});
```

### 整合測試
- 測試完整流程（建立訂單 → 修改 → 出貨 → 完成）
- 測試錯誤情境（權限不足、狀態錯誤、驗證失敗）
- 測試邊界值（最小金額、最大數量、空字串）

---

## 相關文件

- [Feature 011 規格](../spec.md)
- [資料模型](../data-model.md)
- [快速上手指南](../quickstart.md)
- [實作計畫](../plan.md)

---

**最後更新**: 2026-01-06
**維護者**: Claude Sonnet 4.5
