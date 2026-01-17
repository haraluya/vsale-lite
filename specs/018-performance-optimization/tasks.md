# 實作任務清單：效能優化專案

**功能編號**：018
**功能名稱**：performance-optimization
**計畫文件**：[plan.md](plan.md)
**建立日期**：2026-01-17

---

## 任務概覽

| Phase | 任務數 | 預估時間 | 狀態 |
|-------|-------|---------|------|
| Phase 1: 前台快取策略 | 3 | 1.5h | Pending |
| Phase 2: 後台動態渲染 | 2 | 0.5h | Pending |
| Phase 3: 快取失效機制 | 4 | 2h | Pending |
| Phase 4: Loading UI | 7 | 2h | Pending |
| Phase 5: 查詢並行化 | 3 | 2h | Pending |
| Phase 6: 測試驗證 | 5 | 2h | Pending |
| **總計** | **24** | **10h** | **0% 完成** |

---

## Phase 1：前台快取策略實作

### Task 1.1：移除前台 Layout 的 force-dynamic ⭐

**優先級**：P0（高）
**預估時間**：15 分鐘
**相依性**：無

**檔案**：`app/(shop)/layout.tsx`

**變更內容**：
```typescript
// ❌ 移除這行
// export const dynamic = 'force-dynamic'

// ✅ 新增 ISR 快取
export const revalidate = 300  // 5 分鐘

// 其他程式碼保持不變
export default async function ShopLayout({ children }) {
  // ...
}
```

**驗收標準**：
- [x] 移除 `export const dynamic = 'force-dynamic'`
- [ ] 新增 `export const revalidate = 300`
- [ ] 頁面可正常訪問，無錯誤
- [ ] 第 2 次訪問明顯更快（快取生效）

**測試方法**：
```bash
# 訪問商品列表頁 2 次
curl http://localhost:3000/store/products
# 第 2 次應該更快
```

---

### Task 1.2：設定前台頁面快取時間 ⭐

**優先級**：P0（高）
**預估時間**：30 分鐘
**相依性**：Task 1.1

**檔案列表**：
1. `app/(shop)/store/home/page.tsx`
2. `app/(shop)/store/products/page.tsx`
3. `app/(shop)/store/[id]/page.tsx`
4. `app/(shop)/store/series/[id]/page.tsx`

**變更內容**（每個檔案）：
```typescript
// 在 page.tsx 最上方新增
export const revalidate = 300  // 商品列表與系列：5 分鐘
// 或
export const revalidate = 600  // 商品詳情：10 分鐘

// 其他程式碼保持不變
export default async function Page() {
  // ...
}
```

**具體配置**：
- `home/page.tsx` → `revalidate: 300`
- `products/page.tsx` → `revalidate: 300`
- `[id]/page.tsx` → `revalidate: 600`
- `series/[id]/page.tsx` → `revalidate: 300`

**驗收標準**：
- [ ] 4 個頁面都新增 `revalidate` 設定
- [ ] Response Headers 包含 `Cache-Control: s-maxage=N`
- [ ] 頁面載入時間明顯縮短

**測試方法**：
```bash
# 檢查 Response Headers
curl -I http://localhost:3000/store/products
# 應該看到 Cache-Control: s-maxage=300
```

---

### Task 1.3：確保購物車與訂單頁動態渲染 ⭐

**優先級**：P0（高）
**預估時間**：15 分鐘
**相依性**：無

**檔案列表**：
1. `app/(shop)/store/cart/page.tsx`
2. `app/(shop)/store/orders/page.tsx`

**變更內容**（每個檔案）：
```typescript
// 確保有這行（如果沒有，新增）
export const dynamic = 'force-dynamic'

export default async function Page() {
  // ...
}
```

**驗收標準**：
- [ ] 2 個頁面都有 `force-dynamic`
- [ ] 購物車顯示即時價格
- [ ] 訂單列表顯示最新狀態
- [ ] Response Headers 無 `Cache-Control`

**測試方法**：
```bash
# 價格更新後，購物車立即反映
# 1. 管理員更新價格
# 2. 客戶刷新購物車
# 3. 確認顯示新價格
```

---

## Phase 2：後台動態渲染確保

### Task 2.1：確認後台 Layout 的 force-dynamic

**優先級**：P0（高）
**預估時間**：10 分鐘
**相依性**：無

**檔案**：`app/(admin)/admin/layout.tsx`

**檢查內容**：
```typescript
// 確保存在這行
export const dynamic = 'force-dynamic'
```

**驗收標準**：
- [ ] Layout 有 `force-dynamic`
- [ ] 所有後台頁面都即時顯示資料

---

### Task 2.2：檢查所有後台頁面的 dynamic 設定

**優先級**：P1（中）
**預估時間**：20 分鐘
**相依性**：Task 2.1

**檔案列表**：
1. `app/(admin)/admin/dashboard/page.tsx`
2. `app/(admin)/admin/tier-prices/page.tsx`
3. `app/(admin)/admin/products/page.tsx`
4. `app/(admin)/admin/orders/page.tsx`
5. `app/(admin)/admin/users/page.tsx`

**檢查項目**：
- [ ] 每個 page.tsx 都有 `export const dynamic = 'force-dynamic'`
- [ ] 或依賴 Layout 的設定（Next.js 會繼承）

**驗收標準**：
- [ ] 所有後台頁面即時顯示資料
- [ ] 無快取行為

---

## Phase 3：快取失效機制實作

### Task 3.1：商品 Server Actions 快取失效

**優先級**：P0（高）
**預估時間**：30 分鐘
**相依性**：Task 1.2

**檔案**：`lib/actions/products.ts`

**變更位置**：
1. `createProduct()` 函數
2. `updateProduct()` 函數
3. `deleteProduct()` 函數

**變更內容**（範例）：
```typescript
import { revalidateTag, revalidatePath } from 'next/cache'

export async function updateProduct(id: string, data: UpdateProductInput) {
  // ... 現有更新邏輯
  const { data: updatedProduct, error } = await supabase
    .from('products')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, message: error.message }
  }

  // ✅ 新增快取失效
  revalidateTag('products')
  revalidatePath('/store')
  revalidatePath(`/store/${id}`)

  return { success: true, data: updatedProduct }
}
```

**其他函數類似變更**：
- `createProduct()` → `revalidateTag('products')` + `revalidatePath('/store')`
- `deleteProduct()` → `revalidateTag('products')` + `revalidatePath('/store')`

**驗收標準**：
- [ ] 3 個函數都新增快取失效邏輯
- [ ] 更新商品後，前台在 5 分鐘內顯示新資料
- [ ] 後台立即顯示新資料

---

### Task 3.2：價格 Server Actions 快取失效（修復空白 Bug）⭐⭐⭐

**優先級**：P0（最高）
**預估時間**：45 分鐘
**相依性**：Task 1.2

**檔案**：`lib/actions/tier-prices.ts`

**關鍵變更**（`updateTierPrice` 函數）：
```typescript
import { revalidateTag, revalidatePath } from 'next/cache'

export async function updateTierPrice(data: UpdateTierPriceInput) {
  // ... 現有更新邏輯
  const { error } = await supabase
    .from('tier_prices')
    .upsert({
      product_id: data.productId,
      tier_id: data.tierId,
      price: data.price,
    })

  if (error) {
    return { success: false, message: error.message }
  }

  // ✅ 新增快取失效（修復空白問題的關鍵！）
  revalidatePath('/admin/tier-prices')  // ← 最重要！
  revalidateTag('tier-prices')
  revalidateTag('products')

  return { success: true, message: '價格更新成功' }
}
```

**其他函數類似變更**：
- `createTierPrice()` → 同樣邏輯
- `deleteTierPrice()` → 同樣邏輯
- `batchUpdateTierPrices()` → 同樣邏輯

**驗收標準**：
- [ ] 4 個函數都新增快取失效邏輯
- [ ] **價格更新後，頁面立即顯示新價格（無空白）**
- [ ] **無需手動刷新瀏覽器**
- [ ] 前台在 5 分鐘內顯示新價格

**測試場景（場景 C）**：
1. 管理員前往價格管理頁面
2. 選擇系列和等級，設定新價格 $100
3. 點擊「儲存」
4. **驗證**：頁面立即顯示 $100（無空白）

---

### Task 3.3：系列與分類 Server Actions 快取失效

**優先級**：P1（中）
**預估時間**：30 分鐘
**相依性**：Task 1.2

**檔案**：
1. `lib/actions/series.ts`
2. `lib/actions/categories.ts`

**變更內容**（`series.ts` 範例）：
```typescript
export async function updateSeries(id: string, data: UpdateSeriesInput) {
  // ... 更新邏輯

  revalidateTag('series')
  revalidateTag('products')
  revalidatePath('/store/series')
  revalidatePath(`/store/series/${id}`)

  return { success: true }
}
```

**變更內容**（`categories.ts` 範例）：
```typescript
export async function updateCategory(id: string, data: UpdateCategoryInput) {
  // ... 更新邏輯

  revalidateTag('categories')
  revalidateTag('products')
  revalidatePath('/store')

  return { success: true }
}
```

**驗收標準**：
- [ ] 系列更新後，系列頁面在 5 分鐘內更新
- [ ] 分類更新後，商品列表在 5 分鐘內更新

---

### Task 3.4：訂單 Server Actions 快取失效

**優先級**：P1（中）
**預估時間**：15 分鐘
**相依性**：無

**檔案**：`lib/actions/orders.ts`

**變更位置**：`updateOrderStatus()` 函數

**變更內容**：
```typescript
export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  // ... 更新邏輯

  revalidateTag('orders')
  revalidatePath('/admin/orders')
  revalidatePath('/store/orders')  // 客戶訂單列表

  return { success: true }
}
```

**驗收標準**：
- [ ] 訂單狀態更新後，後台立即反映
- [ ] 客戶訂單列表即時更新

---

## Phase 4：Loading UI 實作

### Task 4.1：確認基礎骨架屏元件存在

**優先級**：P1（中）
**預估時間**：15 分鐘
**相依性**：無

**檔案**：`components/ui/skeleton.tsx`

**檢查內容**：
- [ ] 檔案存在
- [ ] 樣式包含 `border-2 border-black`（Neo-Brutalism）
- [ ] 使用 `animate-pulse`

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

### Task 4.2：建立複合骨架屏元件

**優先級**：P1（中）
**預估時間**：30 分鐘
**相依性**：Task 4.1

**檔案**：`components/shop/product-card-skeleton.tsx`（新建）

**內容**：
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

**驗收標準**：
- [ ] 元件正確渲染
- [ ] 樣式符合 Neo-Brutalism

---

### Task 4.3：實作系列詳情頁 Loading UI

**優先級**：P1（中）
**預估時間**：15 分鐘
**相依性**：Task 4.2

**檔案**：`app/(shop)/store/series/[id]/loading.tsx`（新建）

**內容**：參考 plan.md 中的範例

**驗收標準**：
- [ ] 訪問 `/store/series/123` 時立即顯示骨架屏
- [ ] 無白屏閃爍

---

### Task 4.4：實作客戶訂單列表 Loading UI

**優先級**：P1（中）
**預估時間**：15 分鐘
**相依性**：Task 4.1

**檔案**：`app/(shop)/store/orders/loading.tsx`（新建）

**內容**：參考 plan.md

**驗收標準**：
- [ ] 骨架屏立即顯示
- [ ] 佈局與實際內容相似

---

### Task 4.5：實作管理員訂單列表 Loading UI

**優先級**：P1（中）
**預估時間**：20 分鐘
**相依性**：Task 4.1

**檔案**：`app/(admin)/admin/orders/loading.tsx`（新建）

**內容**：參考 plan.md（包含桌面版表格 + 手機版卡片）

**驗收標準**：
- [ ] 桌面版顯示表格骨架屏
- [ ] 手機版顯示卡片骨架屏

---

### Task 4.6：實作價格管理頁面 Loading UI

**優先級**：P1（中）
**預估時間**：20 分鐘
**相依性**：Task 4.1

**檔案**：`app/(admin)/admin/tier-prices/loading.tsx`（新建）

**內容**：參考 plan.md

**驗收標準**：
- [ ] 骨架屏包含篩選器與表格
- [ ] 立即顯示

---

### Task 4.7：實作商品管理頁面 Loading UI

**優先級**：P1（中）
**預估時間**：20 分鐘
**相依性**：Task 4.1

**檔案**：`app/(admin)/admin/products/loading.tsx`（新建）

**內容**：參考 plan.md

**驗收標準**：
- [ ] 商品網格骨架屏正確顯示

---

## Phase 5：查詢並行化實作

### Task 5.1：優化 Dashboard 查詢 ⭐

**優先級**：P0（高）
**預估時間**：1 小時
**相依性**：無

**檔案**：`lib/actions/dashboard.ts`

**當前程式碼位置**：約第 61-131 行

**重構步驟**：
1. 識別 9 個序列查詢
2. 合併相同時間範圍的查詢（count + revenue）
3. 使用 `Promise.all` 並行執行

**參考範例**：見 plan.md Task 2.5.1

**驗收標準**：
- [ ] 查詢數從 9 個減少到 5 個
- [ ] 使用 `Promise.all` 並行執行
- [ ] Dashboard 載入時間 < 300ms
- [ ] 資料正確性不變

**測試方法**：
```bash
# 使用瀏覽器開發者工具 Network 面板
# 確認查詢並行執行（時間戳相近）
```

---

### Task 5.2：優化商品頁面查詢 ⭐

**優先級**：P0（高）
**預估時間**：30 分鐘
**相依性**：無

**檔案**：`app/(shop)/store/products/page.tsx`

**當前程式碼位置**：約第 33-42 行

**重構**：
```typescript
// ❌ 移除序列執行
// const seriesResult = await getActiveSeries()
// const categoriesResult = await getActiveCategories()
// const tagsResult = await getAvailableTags()

// ✅ 改為並行執行
const [seriesResult, categoriesResult, tagsResult] = await Promise.all([
  getActiveSeries(),
  getActiveCategories(),
  getAvailableTags(),
])
```

**驗收標準**：
- [ ] 3 個查詢並行執行
- [ ] 頁面載入時間減少約 400ms
- [ ] 資料正確性不變

---

### Task 5.3：檢查其他頁面的序列查詢

**優先級**：P2（低）
**預估時間**：30 分鐘
**相依性**：Task 5.1, Task 5.2

**檔案列表**：
- `app/(shop)/store/series/[id]/page.tsx`
- 其他有多個查詢的頁面

**檢查標準**：
- [ ] 尋找連續的 `await` 呼叫
- [ ] 確認查詢之間無相依性
- [ ] 改為 `Promise.all`

---

## Phase 6：測試與驗證

### Task 6.1：前台快取驗證

**優先級**：P0（高）
**預估時間**：30 分鐘
**相依性**：Phase 1 完成

**測試場景**：

**快取生效測試**：
1. 訪問商品列表頁 2 次
2. 記錄載入時間
3. 確認第 2 次明顯更快

**快取失效測試**：
1. 管理員新增商品 "測試商品 A"
2. 前台立即訪問（看不到新商品）
3. 等待 5 分鐘後再次訪問（應該看到）

**驗收標準**：
- [ ] 商品列表頁載入時間 < 1.5 秒
- [ ] 快取失效機制正常運作
- [ ] Response Headers 包含 `Cache-Control`

---

### Task 6.2：後台即時性驗證（修復空白 Bug）⭐⭐⭐

**優先級**：P0（最高）
**預估時間**：30 分鐘
**相依性**：Task 3.2

**測試場景**（場景 C 複現）：
1. 管理員登入後台
2. 前往價格管理頁面 (`/admin/tier-prices`)
3. 選擇系列「飲料」與等級「批發」
4. 設定某商品價格為 $100
5. 點擊「儲存」按鈕
6. **關鍵驗證**：觀察頁面是否立即顯示新價格

**預期結果**：
- [ ] 儲存成功後，頁面**立即**顯示新價格 $100
- [ ] **無空白頁面**
- [ ] **無需手動刷新瀏覽器**

**如果失敗**：
- 檢查 `lib/actions/tier-prices.ts`
- 確認有 `revalidatePath('/admin/tier-prices')`

---

### Task 6.3：Loading UI 驗證

**優先級**：P1（中）
**預估時間**：30 分鐘
**相依性**：Phase 4 完成

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
- [ ] 骨架屏立即顯示（< 100ms）
- [ ] 無白屏閃爍
- [ ] 骨架屏佈局與實際內容相似

---

### Task 6.4：查詢並行化驗證

**優先級**：P0（高）
**預估時間**：15 分鐘
**相依性**：Phase 5 完成

**測試步驟**：
1. 開啟瀏覽器開發者工具 > Network 面板
2. 訪問 Dashboard 頁面
3. 記錄所有 Supabase 查詢的時間戳（Waterfall 視圖）

**驗收標準**：
- [ ] 多個查詢的開始時間相近（< 50ms 差異）
- [ ] 總查詢時間 < 300ms
- [ ] Dashboard 完整載入時間 < 1 秒

---

### Task 6.5：效能指標測試

**優先級**：P1（中）
**預估時間**：30 分鐘
**相依性**：所有 Phase 完成

**使用工具**：
- Chrome DevTools Lighthouse
- Vercel Analytics（部署後）

**測試指標**：
- [ ] **FCP**：< 1.2 秒（當前約 2.8 秒）
- [ ] **LCP**：< 2 秒（當前約 3.5 秒）
- [ ] **TTI**：< 2.5 秒
- [ ] **CLS**：< 0.1

**測試頁面**：
- `/store/products`
- `/store/123`
- `/admin/dashboard`

---

## 完成檢查清單

### 前台快取策略

- [ ] Layout 移除 force-dynamic
- [ ] 4 個頁面設定 revalidate
- [ ] 購物車與訂單頁保持 force-dynamic
- [ ] 快取測試通過

### 後台動態渲染

- [ ] Layout 有 force-dynamic
- [ ] 所有頁面即時顯示資料

### 快取失效機制

- [ ] 商品 Server Actions（3 個函數）
- [ ] 價格 Server Actions（4 個函數）⭐
- [ ] 系列與分類 Server Actions
- [ ] 訂單 Server Actions
- [ ] 空白 Bug 已修復 ⭐⭐⭐

### Loading UI

- [ ] 基礎 Skeleton 元件存在
- [ ] ProductCardSkeleton 建立
- [ ] 5 個路由的 loading.tsx 建立

### 查詢並行化

- [ ] Dashboard 查詢優化
- [ ] 商品頁面查詢優化
- [ ] 其他頁面檢查完成

### 測試驗證

- [ ] 前台快取驗證
- [ ] 後台即時性驗證（空白 Bug）⭐
- [ ] Loading UI 驗證
- [ ] 查詢並行化驗證
- [ ] 效能指標測試

---

## 風險與注意事項

### 高風險項目

1. **Task 3.2：價格 Server Actions 快取失效**
   - **風險**：如果未正確實作，空白 Bug 不會修復
   - **緩解**：仔細測試場景 C，確保有 `revalidatePath('/admin/tier-prices')`

2. **Task 5.1：Dashboard 查詢優化**
   - **風險**：並行查詢可能導致資料不一致
   - **緩解**：仔細檢查查詢之間無相依性，逐一驗證資料正確性

3. **Task 1.1：移除前台 Layout force-dynamic**
   - **風險**：可能影響認證流程
   - **緩解**：確保認證邏輯使用 `checkAuth()`（已有 React cache）

### 注意事項

- 所有 Server Actions 變更後，務必測試功能正確性
- Loading UI 實作時，確保佈局與實際內容一致（避免 CLS）
- 查詢並行化後，使用瀏覽器開發者工具確認並行執行

---

**任務清單撰寫者**：Claude Sonnet 4.5
**最後更新**：2026-01-17
