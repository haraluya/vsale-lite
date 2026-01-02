# API Contract: Shop (前台商品與價格查詢)

**Module**: `lib/actions/shop.ts`
**Feature**: 003-series-and-pricing
**Date**: 2026-01-02

## Overview

前台商品瀏覽與價格查詢 Server Actions，提供系列列表、系列詳情頁商品列表（含當前用戶等級價格）、用戶資訊查詢等功能。

---

## getActiveSeries

**用途**: 查詢所有 active 系列（前台系列列表頁面）

### Signature

```typescript
export async function getActiveSeries(
  category_id?: string
): Promise<ActionResult<Series[]>>
```

### Input

```typescript
{
  category_id?: string  // 選填：過濾特定分類的系列
}
```

### Output (Success)

```typescript
{
  success: true,
  data: [
    {
      id: "uuid-1",
      category_id: "uuid-cat-1",
      name: "美粒果系列",
      description: "各式果汁飲料",
      image_url: "https://...storage.../series/uuid-1/main.jpg",
      status: "active",
      sort_order: 1,
      created_at: "2026-01-02T10:00:00Z",
      updated_at: "2026-01-02T10:00:00Z"
    }
  ]
}
```

### Output (Error)

```typescript
{
  success: false,
  message: "查詢失敗" | "未登入"
}
```

### Business Logic

- 僅回傳 `status = 'active'` 的系列
- 按 `sort_order ASC` 排序
- 若提供 `category_id`，過濾特定分類

### Authorization

- **客戶**: 可查詢（僅 active）
- **管理員**: 可查詢（同樣僅 active，後台用 `getSeries()` 查詢全部）

### Caching

- Next.js `revalidatePath('/store')` 管理快取
- 預設快取時間：60 秒

---

## getSeriesProductsWithPrice

**用途**: 查詢系列詳情頁的所有商品與當前用戶等級價格

### Signature

```typescript
export async function getSeriesProductsWithPrice(
  series_id: string
): Promise<ActionResult<ProductWithPrice[]>>
```

### Input

```typescript
{
  series_id: string  // 系列 ID
}
```

### Output (Success)

```typescript
{
  success: true,
  data: [
    {
      id: "uuid-product-1",
      series_id: "uuid-series-1",
      code: "DRK-0001",
      name: "蘋果汁 500ml",
      retail_price: 60.00,  // 原價（可為 null）
      user_price: 50.00,    // 當前用戶等級價格（可為 null）
      stock: 100,
      stock_status: "sufficient",  // sufficient | low | out_of_stock
      unit: "瓶",
      image_url: "https://...storage.../products/uuid-product-1/main.jpg",
      status: "active",
      created_at: "2026-01-02T10:00:00Z",
      updated_at: "2026-01-02T10:00:00Z"
    },
    {
      id: "uuid-product-2",
      series_id: "uuid-series-1",
      code: "DRK-0002",
      name: "橘子汁 500ml",
      retail_price: 60.00,
      user_price: null,  // 未設定此等級價格
      stock: -20,  // 負庫存（欠貨）
      stock_status: "out_of_stock",
      unit: "瓶",
      image_url: null,
      status: "active",
      created_at: "2026-01-02T10:00:00Z",
      updated_at: "2026-01-02T10:00:00Z"
    }
  ]
}
```

### Output (Error)

```typescript
{
  success: false,
  message: "系列不存在" | "系列已下架" | "未登入"
}
```

### Business Logic

1. 檢查系列是否存在且 `status = 'active'`
2. 取得當前用戶的 `tier_id`（透過 `checkAuth()`）
3. 查詢該系列下所有 `status = 'active'` 的商品
4. LEFT JOIN `tier_prices` 表，過濾 `tier_id = user.tier_id`
5. 整合價格資料（`user_price`）

### Query Example

```sql
SELECT
  p.*,
  tp.price AS user_price
FROM products p
INNER JOIN series s ON p.series_id = s.id
LEFT JOIN tier_prices tp ON p.id = tp.product_id AND tp.tier_id = $2
WHERE p.series_id = $1
  AND p.status = 'active'
  AND s.status = 'active';
```

### Authorization

- **客戶**: 可查詢（僅回傳自己 tier_id 的價格）
- **管理員**: 可查詢（同樣僅回傳自己 tier_id 的價格，不顯示其他等級）

### Performance

- **查詢時間**: < 100ms (p95)
- **支援規模**: 50 個商品/系列
- **索引**: `idx_products_series_id`, `idx_tier_prices_lookup`

---

## getCurrentUser

**用途**: 查詢當前用戶資訊（用於導航列顯示）

### Signature

```typescript
export async function getCurrentUser(): Promise<ActionResult<CurrentUser>>
```

### Input

無需參數（從 Session 取得）

### Output (Success)

```typescript
{
  success: true,
  data: {
    id: "uuid-user-1",
    phone: "0912345678",
    tier_id: "uuid-tier-1",
    tier_name: "批發",
    role: "client",
    created_at: "2026-01-01T10:00:00Z"
  }
}
```

### Output (Error)

```typescript
{
  success: false,
  message: "未登入"
}
```

### Business Logic

- 透過 `checkAuth()` 取得當前用戶 ID
- JOIN `profiles` 與 `tiers` 表，取得用戶資訊與等級名稱

### Authorization

- **所有已登入用戶** 可執行

### Caching

- 快取於 Server Component 層級（Next.js 自動快取）
- Session 變更時自動失效

---

## logout

**用途**: 登出當前用戶

### Signature

```typescript
export async function logout(): Promise<ActionResult<void>>
```

### Input

無需參數

### Output (Success)

```typescript
{
  success: true,
  message: "登出成功"
}
```

### Output (Error)

```typescript
{
  success: false,
  message: "登出失敗"
}
```

### Business Logic

- 呼叫 Supabase `auth.signOut()`
- 清除 Session Cookie

### Side Effects

- 清除用戶 Session
- 導回登入頁面（由前端處理）

---

## getSeriesById

**用途**: 查詢單一系列詳情（用於系列詳情頁頂部）

### Signature

```typescript
export async function getSeriesById(
  series_id: string
): Promise<ActionResult<Series>>
```

### Input

```typescript
{
  series_id: string  // 系列 ID
}
```

### Output (Success)

```typescript
{
  success: true,
  data: {
    id: "uuid-1",
    category_id: "uuid-cat-1",
    category_name: "飲料",  // JOIN categories 表取得分類名稱
    name: "美粒果系列",
    description: "各式果汁飲料",
    image_url: "https://...storage.../series/uuid-1/main.jpg",
    status: "active",
    sort_order: 1,
    created_at: "2026-01-02T10:00:00Z",
    updated_at: "2026-01-02T10:00:00Z"
  }
}
```

### Output (Error)

```typescript
{
  success: false,
  message: "系列不存在" | "系列已下架"
}
```

### Business Logic

- 僅回傳 `status = 'active'` 的系列
- JOIN `categories` 表取得分類名稱

### Authorization

- **客戶**: 可查詢（僅 active）
- **管理員**: 可查詢（同樣僅 active）

---

## Error Codes

| Code | Message | HTTP Equivalent |
|------|---------|----------------|
| `UNAUTHORIZED` | 未登入 | 401 Unauthorized |
| `NOT_FOUND` | 系列/商品不存在 | 404 Not Found |
| `FORBIDDEN` | 系列已下架 | 403 Forbidden |

---

## Usage Examples

### 系列列表頁（前台首頁）

```typescript
// app/(shop)/store/page.tsx
export default async function StorePage() {
  const result = await getActiveSeries()

  if (!result.success) {
    return <ErrorMessage>{result.message}</ErrorMessage>
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {result.data.map(series => (
        <SeriesCard key={series.id} series={series} />
      ))}
    </div>
  )
}
```

### 系列詳情頁（商品列表 + 價格）

```typescript
// app/(shop)/store/series/[id]/page.tsx
export default async function SeriesDetailPage({ params }: { params: { id: string } }) {
  const [seriesResult, productsResult] = await Promise.all([
    getSeriesById(params.id),
    getSeriesProductsWithPrice(params.id)
  ])

  if (!seriesResult.success || !productsResult.success) {
    return <ErrorMessage>系列不存在或已下架</ErrorMessage>
  }

  return (
    <div>
      <SeriesHeader series={seriesResult.data} />
      <ProductList products={productsResult.data} />
    </div>
  )
}
```

### 商品卡片（顯示價格）

```typescript
// components/shop/ProductCard.tsx
export function ProductCard({ product }: { product: ProductWithPrice }) {
  const hasPriceSet = product.user_price !== null
  const showDiscount = product.retail_price && product.user_price && product.retail_price > product.user_price

  return (
    <div className="border-3 border-black p-4">
      <h3>{product.name}</h3>
      <div className="mt-2">
        {hasPriceSet ? (
          <>
            {showDiscount && (
              <p className="text-sm text-gray-500 line-through">
                原價 ${product.retail_price}
              </p>
            )}
            <p className="text-xl font-bold">
              您的價格 ${product.user_price}
            </p>
          </>
        ) : (
          <p className="text-red-600">價格未設定</p>
        )}
      </div>
      <StockStatus status={product.stock_status} />
      <AddToCartButton disabled={!hasPriceSet} />
    </div>
  )
}
```

### 導航列（顯示用戶資訊）

```typescript
// components/shop/Navbar.tsx
export async function Navbar() {
  const result = await getCurrentUser()

  if (!result.success) {
    return <LoginButton />
  }

  const user = result.data

  return (
    <nav className="flex justify-between items-center p-4 border-b-3 border-black">
      <div>
        <p className="text-sm">{user.phone}</p>
        <p className="text-xs text-gray-600">會員等級: {user.tier_name}</p>
      </div>
      <button onClick={logout}>登出</button>
    </nav>
  )
}
```

---

## Testing Checklist

- [ ] 客戶僅能查詢 active 系列與商品
- [ ] 客戶僅能看到自己 tier_id 的價格（不洩漏其他等級）
- [ ] 未設定價格的商品顯示「價格未設定」
- [ ] 庫存狀態正確顯示（不顯示實際庫存數量）
- [ ] 導航列顯示當前用戶等級
- [ ] 登出功能正常（清除 Session）

---

## Performance Notes

### 批量查詢優化

- `getSeriesProductsWithPrice` 使用 LEFT JOIN，一次查詢取得所有商品與價格
- 避免 N+1 查詢問題（逐個查詢商品價格）

### Caching Strategy

- 系列列表：快取 60 秒（`revalidatePath('/store')`）
- 系列詳情頁：快取 30 秒（`revalidatePath('/store/series/[id]')`）
- 用戶資訊：Session 快取（Supabase 自動處理）

---

## Dependencies

- `lib/actions/helpers.ts`: `checkAuth()`, `ActionResult<T>`
- `lib/supabase/server.ts`: `createClient()`
- `types/index.ts`: `Series`, `Product`, `ProductWithPrice`, `CurrentUser` 型別定義
