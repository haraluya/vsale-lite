# API Contract: Tier Prices Management (等級價格管理)

**Module**: `lib/actions/tier-prices.ts`
**Feature**: 003-series-and-pricing
**Date**: 2026-01-02

## Overview

等級價格管理 Server Actions，提供批量設定商品在各會員等級的價格，以及單一商品價格的 CRUD 功能。

---

## getTierPrice

**用途**: 查詢單一商品在特定等級的價格

### Signature

```typescript
export async function getTierPrice(
  product_id: string,
  tier_id: string
): Promise<ActionResult<TierPrice | null>>
```

### Input

```typescript
{
  product_id: string,  // 商品 ID
  tier_id: string      // 會員等級 ID
}
```

### Output (Success - 價格存在)

```typescript
{
  success: true,
  data: {
    id: "uuid-1",
    tier_id: "uuid-tier-1",
    product_id: "uuid-product-1",
    price: 50.00,
    created_at: "2026-01-02T10:00:00Z",
    updated_at: "2026-01-02T10:00:00Z"
  }
}
```

### Output (Success - 價格不存在)

```typescript
{
  success: true,
  data: null
}
```

### Output (Error)

```typescript
{
  success: false,
  message: "商品不存在" | "等級不存在"
}
```

### Authorization

- **管理員**: 可查詢所有價格
- **客戶**: 僅能查詢自己的 tier_id 價格（由 Server Action 自動過濾）

---

## getProductTierPrices

**用途**: 查詢單一商品在所有等級的價格（管理員用於價格設定頁面）

### Signature

```typescript
export async function getProductTierPrices(
  product_id: string
): Promise<ActionResult<TierPriceWithTier[]>>
```

### Input

```typescript
{
  product_id: string  // 商品 ID
}
```

### Output (Success)

```typescript
{
  success: true,
  data: [
    {
      id: "uuid-1",
      tier_id: "uuid-tier-1",
      tier_name: "批發",  // JOIN tiers 表取得等級名稱
      product_id: "uuid-product-1",
      price: 50.00,
      created_at: "2026-01-02T10:00:00Z",
      updated_at: "2026-01-02T10:00:00Z"
    },
    {
      id: "uuid-2",
      tier_id: "uuid-tier-2",
      tier_name: "零售",
      product_id: "uuid-product-1",
      price: 60.00,
      created_at: "2026-01-02T10:00:00Z",
      updated_at: "2026-01-02T10:00:00Z"
    }
  ]
}
```

### Authorization

- **僅管理員** 可執行

---

## setTierPrice

**用途**: 設定或更新單一商品在特定等級的價格

### Signature

```typescript
export async function setTierPrice(
  data: SetTierPriceInput
): Promise<ActionResult<TierPrice>>
```

### Input

```typescript
{
  product_id: string,  // 商品 ID
  tier_id: string,     // 會員等級 ID
  price: number        // 價格（必須 >= 0）
}
```

### Zod Schema

```typescript
// lib/validations/tier-price.schema.ts
export const setTierPriceSchema = z.object({
  product_id: z.string().uuid("商品 ID 格式錯誤"),
  tier_id: z.string().uuid("等級 ID 格式錯誤"),
  price: z.number().min(0, "價格不可為負數")
})
```

### Output (Success - 新增)

```typescript
{
  success: true,
  data: {
    id: "uuid-new",
    tier_id: "uuid-tier-1",
    product_id: "uuid-product-1",
    price: 50.00,
    created_at: "2026-01-02T10:00:00Z",
    updated_at: "2026-01-02T10:00:00Z"
  },
  message: "價格設定成功"
}
```

### Output (Success - 更新)

```typescript
{
  success: true,
  data: {
    id: "uuid-1",
    tier_id: "uuid-tier-1",
    product_id: "uuid-product-1",
    price: 55.00,  // 已更新
    created_at: "2026-01-02T10:00:00Z",
    updated_at: "2026-01-02T11:00:00Z"  // 自動更新
  },
  message: "價格更新成功"
}
```

### Output (Error)

```typescript
{
  success: false,
  message: "商品不存在" | "等級不存在" | "無權限設定價格",
  errors: {
    price: ["價格不可為負數"]
  }
}
```

### Business Logic

- 使用 **UPSERT** 操作（PostgreSQL `ON CONFLICT` 或 Supabase `upsert()`）
- 若該商品 × 等級的價格已存在，更新價格
- 若不存在，新增價格記錄

### Authorization

- **僅管理員** 可執行

### Side Effects

- `revalidatePath('/admin/pricing')`: 更新價格管理頁快取
- `revalidatePath('/store/series/[id]')`: 更新前台系列詳情頁快取（含價格）

---

## batchSetTierPrices

**用途**: 批量設定多個商品在所有等級的價格（管理員用於價格設定頁面）

### Signature

```typescript
export async function batchSetTierPrices(
  data: BatchSetTierPricesInput
): Promise<ActionResult<{ updated: number }>>
```

### Input

```typescript
{
  prices: [
    { product_id: string, tier_id: string, price: number },
    { product_id: string, tier_id: string, price: number },
    ...
  ]
}
```

### Zod Schema

```typescript
export const batchSetTierPricesSchema = z.object({
  prices: z.array(
    z.object({
      product_id: z.string().uuid(),
      tier_id: z.string().uuid(),
      price: z.number().min(0)
    })
  ).min(1, "至少需要設定一個價格")
})
```

### Output (Success)

```typescript
{
  success: true,
  data: {
    updated: 15  // 已更新/新增的價格記錄數量
  },
  message: "批量設定價格成功（15 筆）"
}
```

### Output (Error)

```typescript
{
  success: false,
  message: "無權限批量設定價格",
  errors: {
    prices: ["至少需要設定一個價格"]
  }
}
```

### Business Logic

- 使用 **批量 UPSERT** 操作（Supabase `upsert()` 支援批量）
- 若該商品 × 等級的價格已存在，更新價格
- 若不存在，新增價格記錄
- 使用事務確保原子性（全部成功或全部失敗）

### Authorization

- **僅管理員** 可執行

### Side Effects

- `revalidatePath('/admin/pricing')`: 更新價格管理頁快取
- `revalidatePath('/store')`: 更新前台所有系列快取

---

## deleteTierPrice

**用途**: 刪除單一商品在特定等級的價格（慎用，建議設為 0 而非刪除）

### Signature

```typescript
export async function deleteTierPrice(
  product_id: string,
  tier_id: string
): Promise<ActionResult<void>>
```

### Input

```typescript
{
  product_id: string,  // 商品 ID
  tier_id: string      // 會員等級 ID
}
```

### Output (Success)

```typescript
{
  success: true,
  message: "價格刪除成功"
}
```

### Output (Error)

```typescript
{
  success: false,
  message: "價格不存在" | "無權限刪除價格"
}
```

### Business Logic

- 刪除後，該等級的客戶無法看到此商品的價格（顯示「價格未設定」）
- **建議**: 若要暫時不顯示價格，使用 `setTierPrice(price: 0)` 而非刪除

### Authorization

- **僅管理員** 可執行

### Side Effects

- `revalidatePath('/admin/pricing')`: 更新價格管理頁快取
- `revalidatePath('/store/series/[id]')`: 更新前台系列詳情頁快取

---

## getAllTiersWithPrices

**用途**: 查詢所有會員等級與特定商品的價格（用於價格設定表格）

### Signature

```typescript
export async function getAllTiersWithPrices(
  product_id?: string
): Promise<ActionResult<TierWithPrice[]>>
```

### Input

```typescript
{
  product_id?: string  // 選填：若提供，回傳該商品的所有等級價格；若不提供，回傳所有等級（價格為 null）
}
```

### Output (Success - 有 product_id)

```typescript
{
  success: true,
  data: [
    {
      tier_id: "uuid-tier-1",
      tier_name: "批發",
      tier_rank: 1,
      price: 50.00,  // 已設定價格
      price_id: "uuid-price-1"
    },
    {
      tier_id: "uuid-tier-2",
      tier_name: "零售",
      tier_rank: 2,
      price: null,  // 未設定價格
      price_id: null
    }
  ]
}
```

### Output (Success - 無 product_id)

```typescript
{
  success: true,
  data: [
    {
      tier_id: "uuid-tier-1",
      tier_name: "批發",
      tier_rank: 1,
      price: null,
      price_id: null
    },
    {
      tier_id: "uuid-tier-2",
      tier_name: "零售",
      tier_rank: 2,
      price: null,
      price_id: null
    }
  ]
}
```

### Authorization

- **管理員**: 可查詢所有等級與價格
- **客戶**: 不可執行此操作（僅用於後台）

---

## Error Codes

| Code | Message | HTTP Equivalent |
|------|---------|----------------|
| `UNAUTHORIZED` | 無權限執行此操作 | 403 Forbidden |
| `NOT_FOUND` | 商品/等級/價格不存在 | 404 Not Found |
| `VALIDATION_ERROR` | 輸入資料格式錯誤 | 400 Bad Request |
| `CONSTRAINT_VIOLATION` | 價格不可為負數 | 400 Bad Request |

---

## Usage Examples

### 設定單一商品價格

```typescript
// app/(admin)/admin/pricing/page.tsx
const result = await setTierPrice({
  product_id: "uuid-product-1",
  tier_id: "uuid-tier-1",
  price: 50.00
})

if (result.success) {
  toast.success("價格設定成功")
}
```

### 批量設定價格（價格管理頁面）

```typescript
// components/admin/TierPriceTable.tsx
const handleBatchSave = async () => {
  const prices = products.flatMap(product =>
    tiers.map(tier => ({
      product_id: product.id,
      tier_id: tier.id,
      price: priceInputs[`${product.id}-${tier.id}`] || 0
    }))
  )

  const result = await batchSetTierPrices({ prices })
  if (result.success) {
    toast.success(`批量設定成功（${result.data.updated} 筆）`)
  }
}
```

### 查詢商品所有等級價格（編輯頁面）

```typescript
// app/(admin)/admin/products/[id]/page.tsx
const result = await getAllTiersWithPrices(product.id)

if (result.success) {
  const tierPrices = result.data
  // 顯示價格設定表格
}
```

---

## Testing Checklist

- [ ] 客戶無法設定/刪除價格
- [ ] 客戶查詢價格時僅回傳自己的 tier_id 價格
- [ ] 管理員可批量設定價格
- [ ] 批量 UPSERT 正確處理新增與更新
- [ ] 價格驗證（不可為負數）
- [ ] 刪除價格後，前台顯示「價格未設定」

---

## Performance Notes

### 批量設定優化

- 使用 Supabase `upsert()` 批量操作，一次請求完成所有價格設定
- 避免迴圈逐個設定（N+1 問題）

### 查詢優化

- `getAllTiersWithPrices` 使用 LEFT JOIN，一次查詢取得所有等級與價格
- 索引：`idx_tier_prices_lookup (tier_id, product_id)` 加速查詢

---

## Dependencies

- `lib/actions/helpers.ts`: `checkAuth()`, `ActionResult<T>`
- `lib/validations/tier-price.schema.ts`: Zod schemas
- `lib/supabase/server.ts`: `createClient()`
- `types/index.ts`: `TierPrice`, `TierWithPrice` 型別定義
