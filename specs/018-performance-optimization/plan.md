# 實作計畫：效能優化專案 - 智能快取策略與使用者體驗提升

**功能編號**：018
**功能名稱**：performance-optimization
**規格文件**：[spec.md](spec.md)
**建立日期**：2026-01-17
**計畫版本**：1.0

---

## 技術背景

### 當前架構

**Next.js 15 App Router 架構**：
- **路由結構**：基於檔案系統的路由（`app/` 目錄）
- **渲染模式**：Server Components 為主，Client Components 為輔
- **資料取得**：Server Actions（位於 `lib/actions/`）
- **快取機制**：當前大部分使用 `force-dynamic`（禁用快取）

**Supabase 資料庫**：
- **類型**：PostgreSQL
- **SDK**：`@supabase/supabase-js` v2.47+
- **認證**：Supabase Auth
- **RLS**：啟用 Row Level Security

**現有問題**：
1. 前台 Layout 使用 `force-dynamic`，導致所有頁面無快取
2. Dashboard 執行 9 個序列查詢（600ms+）
3. 商品頁面執行 3 個序列查詢（600ms+）
4. 價格管理頁面更新後出現空白，需手動刷新
5. 缺少多個高流量路由的 Loading UI

---

## Phase 0：研究與技術調查

### 0.1 Next.js 15 快取機制研究

**問題**：如何正確使用 Next.js 15 的 ISR 快取與 force-dynamic？

**研究結果**：

#### ISR（增量靜態重新生成）設定方式

```typescript
// app/(shop)/store/products/page.tsx
export const revalidate = 300  // 5 分鐘快取

export default async function ProductsPage() {
  const products = await getProducts()
  return <ProductList products={products} />
}
```

**關鍵要點**：
- `export const revalidate = N` 設定頁面快取時間（秒）
- `export const dynamic = 'force-dynamic'` 完全禁用快取
- 兩者不可同時使用（dynamic 優先）

#### 快取標籤系統

```typescript
// lib/actions/products.ts
import { unstable_cache } from 'next/cache'

export const getProducts = unstable_cache(
  async () => {
    const supabase = await createClient()
    const { data } = await supabase.from('products').select()
    return data
  },
  ['products'],  // 快取 key
  { tags: ['products'], revalidate: 300 }  // 快取標籤與時間
)
```

**失效機制**：
```typescript
import { revalidateTag, revalidatePath } from 'next/cache'

// Server Action 中觸發快取失效
revalidateTag('products')  // 失效所有標記為 'products' 的快取
revalidatePath('/store')   // 失效特定路徑的快取
```

**決策**：
- 使用頁面層級的 `revalidate` 設定（簡單直接）
- Server Actions 使用 `revalidateTag` 和 `revalidatePath` 失效快取
- 不使用 `unstable_cache`（避免複雜度）

---

### 0.2 價格管理頁面空白問題調查

**問題**：價格管理頁面更新後出現空白，需手動刷新

**可能原因**：
1. Server Action 執行後未觸發 `revalidatePath`
2. Client Component 狀態未正確更新
3. 快取導致顯示舊資料

**調查步驟**：
1. 檢查 `lib/actions/tier-prices.ts` 中的 Server Actions
2. 確認是否有 `revalidatePath('/admin/tier-prices')`
3. 檢查 Client Component 的狀態管理

**預期解決方案**：
```typescript
// lib/actions/tier-prices.ts
export async function updateTierPrice(data: UpdateTierPriceInput) {
  // ... 更新邏輯

  revalidatePath('/admin/tier-prices')  // ← 確保有這行
  revalidateTag('tier-prices')
  revalidateTag('products')

  return { success: true }
}
```

---

### 0.3 查詢並行化最佳實踐

**問題**：如何安全地將序列查詢改為並行執行？

**研究結果**：

#### Promise.all 並行模式

```typescript
// ✅ 正確：無相依性的查詢並行執行
const [seriesResult, categoriesResult, tagsResult] = await Promise.all([
  getActiveSeries(),
  getActiveCategories(),
  getAvailableTags(),
])
```

**注意事項**：
- 確保查詢之間無相依性（A 不依賴 B 的結果）
- 錯誤處理：使用 `Promise.allSettled()` 或個別 try-catch
- Supabase 連線池：預設支援並行查詢（無需額外配置）

#### Dashboard 查詢優化策略

**當前（9 個序列查詢）**：
```typescript
const todayOrders = await supabase.from('orders').select(...).gte(...)
const todayRevenue = await supabase.from('orders').select(...).gte(...)
// ... 7 個更多查詢
```

**優化方案 1：Promise.all 並行**
```typescript
const [todayOrders, todayRevenue, ...rest] = await Promise.all([
  supabase.from('orders').select(...).gte(...),
  supabase.from('orders').select(...).gte(...),
  // ... 其他查詢
])
```

**優化方案 2：RPC 函數聚合（進階）**
```sql
-- supabase/migrations/20260117_dashboard_metrics.sql
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS JSON AS $$
  -- 單一查詢返回所有指標
$$ LANGUAGE plpgsql;
```

**決策**：
- 先使用 Promise.all 並行化（簡單快速）
- RPC 函數聚合標記為可選（Phase 3）

---

### 0.4 Neo-Brutalism Loading UI 設計規範

**問題**：如何設計符合品牌風格的骨架屏？

**設計規範**（基於現有 UI 元件）：

```typescript
// 骨架屏基礎元件
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gray-200 border-2 border-black",
        className
      )}
    />
  )
}
```

**商品卡片骨架屏**：
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
    <div key={i} className="border-2 border-black p-4">
      <Skeleton className="w-full h-48 mb-2" />  {/* 圖片 */}
      <Skeleton className="h-4 w-3/4 mb-2" />    {/* 標題 */}
      <Skeleton className="h-6 w-1/2" />         {/* 價格 */}
    </div>
  ))}
</div>
```

**決策**：
- 使用統一的 `Skeleton` 元件
- 保持與實際內容相似的佈局
- 使用 `animate-pulse`（Tailwind 內建）

---

## Phase 1：設計資料模型與快取契約

### 1.1 快取配置資料模型

**目的**：明確定義每個頁面的快取策略

#### 頁面快取配置表

| 頁面路由 | 快取策略 | Revalidate | 快取標籤 | 說明 |
|---------|---------|-----------|---------|------|
| `/store/home` | ISR | 300s | `['products', 'series']` | 首頁商品推薦 |
| `/store/products` | ISR | 300s | `['products', 'categories', 'series']` | 商品列表 |
| `/store/[id]` | ISR | 600s | `['products', 'tier-prices']` | 商品詳情 |
| `/store/series/[id]` | ISR | 300s | `['series', 'products']` | 系列詳情 |
| `/store/cart` | force-dynamic | N/A | N/A | 購物車（即時價格） |
| `/store/orders` | force-dynamic | N/A | N/A | 客戶訂單列表 |
| `/admin/*` | force-dynamic | N/A | N/A | 所有後台頁面 |

#### 快取標籤與失效對應表

| 資料變更事件 | 觸發的 Server Action | 失效的快取標籤 | 失效的路徑 |
|------------|-------------------|-------------|-----------|
| 商品新增 | `createProduct()` | `['products']` | `/store` |
| 商品更新 | `updateProduct()` | `['products']` | `/store/[id]` |
| 商品刪除 | `deleteProduct()` | `['products']` | `/store` |
| 價格更新 | `updateTierPrice()` | `['tier-prices', 'products']` | `/admin/tier-prices` |
| 系列更新 | `updateSeries()` | `['series', 'products']` | `/store/series/[id]` |
| 分類更新 | `updateCategory()` | `['categories', 'products']` | `/store` |
| 訂單狀態變更 | `updateOrderStatus()` | `['orders']` | `/admin/orders` |

---

### 1.2 Loading UI 元件設計

**目的**：建立可重用的骨架屏元件庫

#### 基礎骨架屏元件

```typescript
// components/ui/skeleton.tsx（已存在，確認樣式）
import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-none bg-gray-200 border-2 border-black",
        className
      )}
    />
  )
}
```

#### 複合骨架屏元件

**ProductCardSkeleton**：
```tsx
// components/shop/product-card-skeleton.tsx
export function ProductCardSkeleton() {
  return (
    <div className="border-2 border-black p-4 bg-white">
      <Skeleton className="w-full aspect-square mb-3" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-6 w-1/2" />
    </div>
  )
}
```

**ProductGridSkeleton**：
```tsx
// components/shop/product-grid-skeleton.tsx
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}
```

---

### 1.3 查詢優化設計

**目的**：定義哪些查詢需要並行化，以及如何重構

#### Dashboard 查詢重構計畫

**當前結構（lib/actions/dashboard.ts）**：
```typescript
// 9 個序列查詢
const todayOrdersCount = await supabase.from('orders').select(...)  // Q1
const todayRevenue = await supabase.from('orders').select(...)      // Q2
const monthOrdersCount = await supabase.from('orders').select(...)  // Q3
// ... Q4-Q9
```

**重構後結構**：
```typescript
const [
  todayMetrics,
  monthMetrics,
  trendData,
  stockAlerts,
  recentOrders
] = await Promise.all([
  // Q1+Q2 合併：今日訂單統計
  supabase.from('orders')
    .select('id, total_amount', { count: 'exact' })
    .gte('created_at', todayStart),

  // Q3+Q4 合併：本月訂單統計
  supabase.from('orders')
    .select('id, total_amount', { count: 'exact' })
    .gte('created_at', monthStart),

  // Q5: 趨勢資料
  supabase.from('orders')
    .select('created_at, total_amount, status')
    .gte('created_at', last7Days),

  // Q6+Q7: 庫存警報
  supabase.from('products')
    .select('id, name, stock')
    .lt('stock', 10),

  // Q8+Q9: 最近訂單
  supabase.from('orders')
    .select('*, profiles(display_name)')
    .order('created_at', { ascending: false })
    .limit(5)
])
```

**預期改善**：
- 查詢數：9 → 5（-44%）
- 執行時間：600ms → 200ms（-67%，並行執行）

---

## Phase 2：實作任務清單

### 2.1 前台快取策略實作

#### Task 2.1.1：移除前台 Layout 的 force-dynamic

**檔案**：`app/(shop)/layout.tsx`

**變更**：
```typescript
// ❌ 移除這行
// export const dynamic = 'force-dynamic'

// ✅ 改為 ISR 快取
export const revalidate = 300  // 5 分鐘
```

**驗證**：
- 訪問商品列表頁 2 次，第 2 次應該明顯更快
- 檢查 Vercel 部署日誌，確認有快取命中

---

#### Task 2.1.2：設定前台頁面快取時間

**檔案列表**：
- `app/(shop)/store/home/page.tsx` → `revalidate: 300`
- `app/(shop)/store/products/page.tsx` → `revalidate: 300`
- `app/(shop)/store/[id]/page.tsx` → `revalidate: 600`
- `app/(shop)/store/series/[id]/page.tsx` → `revalidate: 300`

**範例變更**：
```typescript
// app/(shop)/store/products/page.tsx
export const revalidate = 300  // 5 分鐘快取

export default async function ProductsPage() {
  // 現有程式碼保持不變
}
```

**驗證**：
- 使用瀏覽器開發者工具檢查 Response Headers
- 應該看到 `Cache-Control: s-maxage=300, stale-while-revalidate`

---

#### Task 2.1.3：確保購物車與訂單頁動態渲染

**檔案列表**：
- `app/(shop)/store/cart/page.tsx`
- `app/(shop)/store/orders/page.tsx`

**變更**：
```typescript
// 確保這些頁面有 force-dynamic
export const dynamic = 'force-dynamic'

export default async function CartPage() {
  // 即時查詢最新價格
}
```

**驗證**：
- 價格更新後，購物車立即顯示新價格
- 無快取延遲

---

### 2.2 後台動態渲染確保

#### Task 2.2.1：確認後台 Layout 的 force-dynamic

**檔案**：`app/(admin)/admin/layout.tsx`

**檢查**：
```typescript
// 確保存在這行
export const dynamic = 'force-dynamic'
```

**驗證**：
- 所有後台頁面都即時顯示資料
- 無快取行為

---

#### Task 2.2.2：檢查所有後台頁面的 dynamic 設定

**檔案列表**：
- `app/(admin)/admin/dashboard/page.tsx`
- `app/(admin)/admin/tier-prices/page.tsx`
- `app/(admin)/admin/products/page.tsx`
- `app/(admin)/admin/orders/page.tsx`
- `app/(admin)/admin/users/page.tsx`

**檢查項目**：
- 確保每個 page.tsx 都有 `export const dynamic = 'force-dynamic'`
- 或依賴 Layout 的設定（Next.js 會繼承）

**驗證**：
- 資料更新後立即反映
- 無需手動刷新

---

### 2.3 快取失效機制實作

#### Task 2.3.1：商品 Server Actions 快取失效

**檔案**：`lib/actions/products.ts`

**變更位置**：
1. `createProduct()`
2. `updateProduct()`
3. `deleteProduct()`

**範例**：
```typescript
import { revalidateTag, revalidatePath } from 'next/cache'

export async function updateProduct(id: string, data: UpdateProductInput) {
  // ... 現有更新邏輯

  // ✅ 新增快取失效
  revalidateTag('products')
  revalidatePath('/store')
  revalidatePath(`/store/${id}`)

  return { success: true, data: updatedProduct }
}
```

**驗收**：
- 更新商品後，前台在 5-10 分鐘內顯示新資料
- 後台立即顯示新資料

---

#### Task 2.3.2：價格 Server Actions 快取失效（修復空白 Bug）

**檔案**：`lib/actions/tier-prices.ts`

**關鍵變更**：
```typescript
export async function updateTierPrice(data: UpdateTierPriceInput) {
  // ... 現有更新邏輯

  // ✅ 新增快取失效（修復空白問題）
  revalidatePath('/admin/tier-prices')  // ← 關鍵！
  revalidateTag('tier-prices')
  revalidateTag('products')

  return { success: true }
}
```

**其他函數**：
- `createTierPrice()` → 同樣邏輯
- `deleteTierPrice()` → 同樣邏輯
- `batchUpdateTierPrices()` → 同樣邏輯

**驗收**：
- 價格更新後，頁面**立即**顯示新價格
- **無空白頁面**
- **無需手動刷新**

---

#### Task 2.3.3：系列與分類 Server Actions 快取失效

**檔案**：
- `lib/actions/series.ts`
- `lib/actions/categories.ts`

**變更範例**：
```typescript
// lib/actions/series.ts
export async function updateSeries(id: string, data: UpdateSeriesInput) {
  // ... 更新邏輯

  revalidateTag('series')
  revalidateTag('products')
  revalidatePath('/store/series')
  revalidatePath(`/store/series/${id}`)

  return { success: true }
}
```

---

#### Task 2.3.4：訂單 Server Actions 快取失效

**檔案**：`lib/actions/orders.ts`

**變更**：
```typescript
export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  // ... 更新邏輯

  revalidateTag('orders')
  revalidatePath('/admin/orders')
  revalidatePath('/store/orders')  // 客戶訂單列表

  return { success: true }
}
```

---

### 2.4 Loading UI 實作

#### Task 2.4.1：建立基礎骨架屏元件

**檔案**：`components/ui/skeleton.tsx`

**檢查**：
- 確認元件已存在
- 樣式符合 Neo-Brutalism（`border-2 border-black`）

**如不存在，建立**：
```tsx
import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-none bg-gray-200 border-2 border-black",
        className
      )}
    />
  )
}
```

---

#### Task 2.4.2：建立複合骨架屏元件

**檔案**：`components/shop/product-card-skeleton.tsx`

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export function ProductCardSkeleton() {
  return (
    <div className="border-2 border-black p-4 bg-white shadow-neo-sm md:shadow-neo">
      <Skeleton className="w-full aspect-square mb-3" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-6 w-1/2" />
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}
```

---

#### Task 2.4.3：實作系列詳情頁 Loading UI

**檔案**：`app/(shop)/store/series/[id]/loading.tsx`（新建）

```tsx
import { ProductGridSkeleton } from '@/components/shop/product-card-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function SeriesLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* 系列標題 */}
      <Skeleton className="h-8 w-64 mb-6" />

      {/* 商品網格 */}
      <ProductGridSkeleton count={8} />
    </div>
  )
}
```

**驗收**：
- 訪問 `/store/series/123` 時立即顯示骨架屏
- 無白屏閃爍

---

#### Task 2.4.4：實作客戶訂單列表 Loading UI

**檔案**：`app/(shop)/store/orders/loading.tsx`（新建）

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function OrdersLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-8 w-48 mb-6" />

      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="border-2 border-black p-4 bg-white">
            <div className="flex justify-between mb-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

#### Task 2.4.5：實作管理員訂單列表 Loading UI

**檔案**：`app/(admin)/admin/orders/loading.tsx`（新建）

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminOrdersLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-8 w-48 mb-6" />

      {/* 桌面版：表格骨架屏 */}
      <div className="hidden md:block border-2 border-black">
        <div className="grid grid-cols-6 gap-4 p-4 bg-gray-100 border-b-2 border-black">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-4" />
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="grid grid-cols-6 gap-4 p-4 border-b border-gray-200">
            {[1, 2, 3, 4, 5, 6].map(j => (
              <Skeleton key={j} className="h-4" />
            ))}
          </div>
        ))}
      </div>

      {/* 手機版：卡片骨架屏 */}
      <div className="md:hidden space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="border-2 border-black p-4 bg-white">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

#### Task 2.4.6：實作價格管理頁面 Loading UI

**檔案**：`app/(admin)/admin/tier-prices/loading.tsx`（新建）

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function TierPricesLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-8 w-48 mb-6" />

      {/* 篩選器 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* 價格表格 */}
      <div className="border-2 border-black">
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-100 border-b-2 border-black">
          <Skeleton className="h-4" />
          <Skeleton className="h-4" />
          <Skeleton className="h-4" />
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
          <div key={i} className="grid grid-cols-3 gap-4 p-4 border-b border-gray-200">
            <Skeleton className="h-4" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

#### Task 2.4.7：實作商品管理頁面 Loading UI

**檔案**：`app/(admin)/admin/products/loading.tsx`（新建）

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminProductsLoading() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* 商品表格/網格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
          <div key={i} className="border-2 border-black p-4 bg-white">
            <Skeleton className="w-full aspect-square mb-3" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

### 2.5 查詢並行化實作

#### Task 2.5.1：優化 Dashboard 查詢

**檔案**：`lib/actions/dashboard.ts`

**當前程式碼位置**：約第 61-131 行

**重構步驟**：

1. **識別獨立查詢**（無相依性）
2. **使用 Promise.all 並行執行**
3. **合併相同時間範圍的查詢**

**範例重構**：

```typescript
// ❌ 當前（序列執行）
export async function getDashboardMetrics() {
  const todayStart = startOfDay(new Date())
  const monthStart = startOfMonth(new Date())

  const { count: todayOrdersCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString())

  const { data: todayRevenueData } = await supabase
    .from('orders')
    .select('total_amount')
    .gte('created_at', todayStart.toISOString())

  // ... 7 個更多查詢
}
```

```typescript
// ✅ 優化後（並行執行）
export async function getDashboardMetrics() {
  const todayStart = startOfDay(new Date())
  const monthStart = startOfMonth(new Date())
  const last7Days = subDays(new Date(), 7)

  const [
    todayOrders,
    monthOrders,
    trendData,
    lowStockProducts,
    recentOrders
  ] = await Promise.all([
    // 查詢 1：今日訂單（合併 count + revenue）
    supabase
      .from('orders')
      .select('id, total_amount', { count: 'exact' })
      .gte('created_at', todayStart.toISOString())
      .neq('status', 'cancelled'),

    // 查詢 2：本月訂單（合併 count + revenue）
    supabase
      .from('orders')
      .select('id, total_amount', { count: 'exact' })
      .gte('created_at', monthStart.toISOString())
      .neq('status', 'cancelled'),

    // 查詢 3：近 7 日趨勢
    supabase
      .from('orders')
      .select('created_at, total_amount, status')
      .gte('created_at', last7Days.toISOString())
      .order('created_at'),

    // 查詢 4：低庫存商品
    supabase
      .from('products')
      .select('id, name, stock', { count: 'exact' })
      .lt('stock', 10)
      .eq('status', 'active'),

    // 查詢 5：最近訂單
    supabase
      .from('orders')
      .select(`
        id, order_number, created_at, status, total_amount,
        profiles:user_id(display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(5)
  ])

  // 計算指標
  const todayOrdersCount = todayOrders.count || 0
  const todayRevenue = todayOrders.data?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0

  const monthOrdersCount = monthOrders.count || 0
  const monthRevenue = monthOrders.data?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0

  // ... 處理其他資料

  return {
    todayOrders: todayOrdersCount,
    todayRevenue,
    monthOrders: monthOrdersCount,
    monthRevenue,
    trendData: trendData.data,
    lowStockCount: lowStockProducts.count,
    recentOrders: recentOrders.data,
  }
}
```

**驗收**：
- Dashboard 載入時間 < 300ms（當前約 600ms）
- 使用瀏覽器開發者工具確認查詢並行執行
- 資料正確性不變

---

#### Task 2.5.2：優化商品頁面查詢

**檔案**：`app/(shop)/store/products/page.tsx`

**當前程式碼位置**：約第 33-42 行

**重構**：

```typescript
// ❌ 當前（序列執行）
const seriesResult = await getActiveSeries()
const categoriesResult = await getActiveCategories()
const tagsResult = await getAvailableTags()

// ✅ 優化後（並行執行）
const [seriesResult, categoriesResult, tagsResult] = await Promise.all([
  getActiveSeries(),
  getActiveCategories(),
  getAvailableTags(),
])
```

**驗收**：
- 頁面載入時間減少約 400ms（600ms → 200ms）
- 3 個查詢同時開始執行（時間戳相近）

---

#### Task 2.5.3：檢查其他頁面的序列查詢

**檔案列表**：
- `app/(shop)/store/series/[id]/page.tsx`
- `app/(admin)/admin/dashboard/page.tsx`（如有多個查詢）

**檢查標準**：
- 尋找連續的 `await` 呼叫
- 確認查詢之間無相依性
- 改為 `Promise.all`

---

### 2.6 測試與驗證

#### Task 2.6.1：前台快取驗證

**測試場景**：

1. **快取生效測試**：
   - 訪問商品列表頁 2 次
   - 第 2 次載入時間應明顯縮短
   - 檢查瀏覽器開發者工具的 Network 面板
   - 應該看到 `(disk cache)` 或 `304 Not Modified`

2. **快取失效測試**：
   - 管理員新增商品 "測試商品 A"
   - 前台客戶立即訪問商品列表（看不到新商品）
   - 等待 5 分鐘後再次訪問（應該看到新商品）

**驗收標準**：
- 商品列表頁載入時間 < 1.5 秒
- 快取失效機制正常運作

---

#### Task 2.6.2：後台即時性驗證（修復空白 Bug）

**測試場景**：

**場景 C 複現**（價格管理頁面）：
1. 管理員登入後台
2. 前往價格管理頁面（`/admin/tier-prices`）
3. 選擇系列「飲料」與等級「批發」
4. 設定某商品價格為 $100
5. 點擊「儲存」按鈕
6. **關鍵驗證**：觀察頁面是否立即顯示新價格

**預期結果**：
- ✅ 儲存成功後，頁面**立即**顯示新價格 $100
- ✅ **無空白頁面**
- ✅ **無需手動刷新瀏覽器**

**如果失敗**：
- 檢查 `lib/actions/tier-prices.ts` 中的 `revalidatePath('/admin/tier-prices')`
- 確認 Server Action 執行完成後有觸發

---

#### Task 2.6.3：Loading UI 驗證

**測試步驟**：
1. 開啟瀏覽器開發者工具 > Network 面板
2. 設定網路節流（Slow 3G）
3. 點擊連結前往各個頁面
4. 觀察骨架屏顯示

**檢查頁面**：
- `/store/series/123`
- `/store/orders`
- `/admin/orders`
- `/admin/tier-prices`
- `/admin/products`

**驗收標準**：
- 骨架屏立即顯示（< 100ms）
- 無白屏閃爍
- 骨架屏佈局與實際內容相似

---

#### Task 2.6.4：查詢並行化驗證

**測試步驟**：
1. 開啟瀏覽器開發者工具 > Network 面板
2. 訪問 Dashboard 頁面
3. 記錄所有 Supabase 查詢的時間戳（Waterfall 視圖）

**驗收標準**：
- 多個查詢的開始時間相近（< 50ms 差異）
- 總查詢時間 < 300ms（當前約 600ms）
- Dashboard 完整載入時間 < 1 秒

---

#### Task 2.6.5：效能指標測試

**使用工具**：
- Chrome DevTools Lighthouse
- Vercel Analytics（部署後）

**測試指標**：
- **FCP（首次內容繪製）**：目標 < 1.2 秒
- **LCP（最大內容繪製）**：目標 < 2 秒
- **TTI（可互動時間）**：目標 < 2.5 秒
- **CLS（佈局位移）**：目標 < 0.1

**測試頁面**：
- `/store/products`（前台商品列表）
- `/store/123`（商品詳情）
- `/admin/dashboard`（後台首頁）

---

## Phase 3：部署與監控（可選）

### 3.1 部署前檢查

- [ ] 所有測試通過
- [ ] 後台空白 Bug 已修復
- [ ] Loading UI 已實作
- [ ] 快取策略已正確配置
- [ ] 查詢已並行化

### 3.2 Vercel 部署

```bash
git push origin 001-performance-optimization
# Vercel 自動部署
```

### 3.3 生產環境驗證

**快取驗證**：
- 檢查 Vercel 部署日誌
- 確認 ISR 快取正常運作

**效能監控**：
- 使用 Vercel Analytics 檢查 Core Web Vitals
- 監控 Supabase 資料庫查詢次數是否減少

---

## 附錄：快速參考

### 快取策略決策矩陣

| 頁面路由 | 快取策略 | Revalidate | 快取標籤 |
|---------|---------|-----------|---------|
| `/store/products` | ISR | 300s | `['products', 'categories', 'series']` |
| `/store/[id]` | ISR | 600s | `['products', 'tier-prices']` |
| `/store/series/[id]` | ISR | 300s | `['series', 'products']` |
| `/store/cart` | force-dynamic | N/A | N/A |
| `/admin/*` | force-dynamic | N/A | N/A |

### Server Actions 快取失效檢查清單

- [ ] `lib/actions/products.ts` → `revalidateTag('products')`
- [ ] `lib/actions/tier-prices.ts` → `revalidatePath('/admin/tier-prices')` **（關鍵！）**
- [ ] `lib/actions/series.ts` → `revalidateTag('series')`
- [ ] `lib/actions/categories.ts` → `revalidateTag('categories')`
- [ ] `lib/actions/orders.ts` → `revalidateTag('orders')`

### Loading UI 檔案清單

- [ ] `app/(shop)/store/series/[id]/loading.tsx`
- [ ] `app/(shop)/store/orders/loading.tsx`
- [ ] `app/(admin)/admin/orders/loading.tsx`
- [ ] `app/(admin)/admin/tier-prices/loading.tsx`
- [ ] `app/(admin)/admin/products/loading.tsx`

---

**計畫撰寫者**：Claude Sonnet 4.5
**最後更新**：2026-01-17
