# Quickstart Guide: 商品系列與等級價格管理

**Feature**: 003-series-and-pricing
**Branch**: `003-series-and-pricing`
**Date**: 2026-01-02

## 快速導航

- [🚀 開發前準備](#開發前準備)
- [📦 資料庫 Migration](#資料庫-migration)
- [🛠️ 開發流程](#開發流程)
- [🧪 測試驗證](#測試驗證)
- [📚 文件參考](#文件參考)

---

## 開發前準備

### 1. 確認環境

```bash
# 確認分支
git branch  # 應顯示 003-series-and-pricing

# 確認依賴已安裝
pnpm install

# 確認 Supabase 連線正常
# 檢查 .env.local 中的 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 2. 閱讀核心文件

**必讀**:
- `spec.md`: 功能規格與使用者故事
- `data-model.md`: 資料庫 Schema 與關聯
- `contracts/`: Server Actions API 合約

**選讀**:
- `research.md`: 技術決策與替代方案
- `plan.md`: 實作計畫與憲章檢查

---

## 資料庫 Migration

### 執行 Migration

**重要**: Migration 檔案已準備好（`supabase/migrations/20260102_series_and_tier_prices.sql`），請在 **Supabase SQL Editor** 中執行。

#### 步驟

1. 登入 Supabase Dashboard
2. 進入專案的 **SQL Editor**
3. 開啟本地檔案 `supabase/migrations/20260102_series_and_tier_prices.sql`
4. 複製全部內容，貼到 SQL Editor
5. 點擊 **Run** 執行

#### Migration 包含內容

- ✅ Phase 1: 新增 `series` 表、`tier_prices` 表，修改 `categories` 與 `products` 表
- ✅ Phase 2: 資料遷移（建立「未分類系列」，遷移現有商品）
- ✅ Phase 3: 商品編號自動產生邏輯（PostgreSQL Function + Trigger）
- ✅ Phase 4: RLS 策略（`series`, `tier_prices`, `products`）
- ✅ Phase 5: 驗證與測試

#### 驗證 Migration 成功

執行完成後，檢查輸出訊息：

```
NOTICE:  資料遷移成功：所有商品已遷移到系列
NOTICE:  資料遷移完成統計：
NOTICE:  - 系列數量：3
NOTICE:  - 商品數量：X
NOTICE:  - 所有商品已遷移到系列：✓
NOTICE:  ==============================================
NOTICE:  Migration 完成: 003-series-and-tier-prices
NOTICE:  執行時間: 2026-01-02 ...
NOTICE:  ==============================================
```

---

## 開發流程

### Phase 1: 型別定義與驗證

#### 1.1 新增型別定義

**檔案**: `types/index.ts`

```typescript
// 新增系列型別
export interface Series {
  id: string
  category_id: string | null
  name: string
  description: string | null
  image_url: string | null
  status: 'active' | 'inactive'
  sort_order: number
  created_at: string
  updated_at: string
}

// 新增等級價格型別
export interface TierPrice {
  id: string
  tier_id: string
  product_id: string
  price: number
  created_at: string
  updated_at: string
}

// 前台商品含價格型別
export interface ProductWithPrice extends Product {
  user_price: number | null  // 當前用戶等級價格
  retail_price: number | null  // 原價
}

// 等級含價格型別（用於價格設定表格）
export interface TierWithPrice {
  tier_id: string
  tier_name: string
  tier_rank: number
  price: number | null
  price_id: string | null
}
```

#### 1.2 新增 Zod Schema

**檔案**: `lib/validations/series.schema.ts`

```typescript
import { z } from 'zod'

export const createSeriesSchema = z.object({
  category_id: z.string().uuid().nullable(),
  name: z.string().min(1, "系列名稱不可為空"),
  description: z.string().optional(),
  sort_order: z.number().int().min(0).default(0)
})

export const updateSeriesSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  sort_order: z.number().int().min(0).optional()
})
```

**檔案**: `lib/validations/tier-price.schema.ts`

```typescript
import { z } from 'zod'

export const setTierPriceSchema = z.object({
  product_id: z.string().uuid("商品 ID 格式錯誤"),
  tier_id: z.string().uuid("等級 ID 格式錯誤"),
  price: z.number().min(0, "價格不可為負數")
})

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

#### 1.3 更新商品 Schema

**檔案**: `lib/validations/product.schema.ts`

```typescript
// 修改 createProductSchema
export const createProductSchema = z.object({
  series_id: z.string().uuid("請選擇系列"),  // 新增（取代 category_id）
  name: z.string().min(1, "商品名稱不可為空"),
  retail_price: z.number().min(0).nullable().optional(),  // 新增
  stock: z.number().int().default(0),
  stock_status: z.enum(["sufficient", "low", "out_of_stock"]).default("sufficient"),  // 新增
  unit: z.string().default("件")
})
```

---

### Phase 2: Server Actions 實作

#### 2.1 系列管理 Server Actions

**檔案**: `lib/actions/series.ts`

參考：`contracts/series.md`

**實作順序**:
1. `getSeries()` - 查詢系列列表
2. `getSeriesById()` - 查詢單一系列
3. `createSeries()` - 建立系列
4. `updateSeries()` - 更新系列
5. `deleteSeries()` - 刪除系列（含商品檢查）
6. `uploadSeriesImage()` - 上傳系列圖片

#### 2.2 等級價格 Server Actions

**檔案**: `lib/actions/tier-prices.ts`

參考：`contracts/tier-prices.md`

**實作順序**:
1. `getAllTiersWithPrices()` - 查詢所有等級與價格（用於表格）
2. `setTierPrice()` - 設定單一商品價格（UPSERT）
3. `batchSetTierPrices()` - 批量設定價格
4. `getProductTierPrices()` - 查詢商品所有等級價格

#### 2.3 前台商品查詢 Server Actions

**檔案**: `lib/actions/shop.ts`

參考：`contracts/shop.md`

**實作順序**:
1. `getActiveSeries()` - 查詢 active 系列列表
2. `getSeriesById()` - 查詢系列詳情
3. `getSeriesProductsWithPrice()` - 查詢系列商品 + 價格（核心功能）
4. `getCurrentUser()` - 查詢當前用戶資訊
5. `logout()` - 登出

#### 2.4 更新現有 Server Actions

**檔案**: `lib/actions/products.ts`

修改項目：
- `createProduct()`: 使用 `series_id` 取代 `category_id`，商品編號自動產生（移除 `code` 輸入）
- `updateProduct()`: 新增 `retail_price`, `stock_status` 欄位

**檔案**: `lib/supabase/storage.ts`

新增：
- `uploadSeriesImage(series_id, file)`: 上傳系列圖片（路徑 `products/series/{series_id}/main.{ext}`）

---

### Phase 3: 前台 UI 實作

#### 3.1 前台 Layout（導航列）

**檔案**: `app/(shop)/layout.tsx`

**功能**:
- 顯示用戶手機號碼、會員等級
- 登出按鈕

**實作要點**:
```typescript
// 使用 Server Component 查詢用戶資訊
const userResult = await getCurrentUser()

return (
  <>
    <Navbar user={userResult.data} />
    {children}
  </>
)
```

#### 3.2 系列列表頁

**檔案**: `app/(shop)/store/page.tsx`

**功能**:
- 顯示所有 active 系列卡片
- 點擊卡片進入系列詳情頁

**實作要點**:
```typescript
const result = await getActiveSeries()

return (
  <div className="grid grid-cols-1 gap-4">
    {result.data.map(series => (
      <SeriesCard key={series.id} series={series} />
    ))}
  </div>
)
```

#### 3.3 系列詳情頁

**檔案**: `app/(shop)/store/series/[id]/page.tsx`

**功能**:
- 顯示系列資訊（圖片、名稱、描述）
- 顯示該系列下所有商品列表（含價格）

**實作要點**:
```typescript
const [seriesResult, productsResult] = await Promise.all([
  getSeriesById(params.id),
  getSeriesProductsWithPrice(params.id)
])

return (
  <>
    <SeriesHeader series={seriesResult.data} />
    <ProductList products={productsResult.data} />
  </>
)
```

#### 3.4 商品卡片元件

**檔案**: `components/shop/ProductCard.tsx`

**功能**:
- 顯示商品圖片、名稱、原價、用戶價格
- 顯示庫存狀態（不顯示實際數量）
- 未設定價格時禁用加入購物車

**UI 規格** (Neo-Brutalism):
```tsx
<div className="
  rounded-none
  border-3 border-black
  bg-white
  shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
  hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
  transition-all duration-150
  p-4
">
  {/* 商品圖片 */}
  {/* 商品名稱 */}
  {/* 價格顯示 */}
  {/* 庫存狀態 */}
  {/* 加入購物車按鈕 */}
</div>
```

---

### Phase 4: 後台 UI 實作

#### 4.1 系列管理頁面

**檔案**: `app/(admin)/admin/series/page.tsx`

**功能**:
- 系列列表（含 inactive）
- 建立新系列按鈕
- 編輯/刪除系列

#### 4.2 系列表單

**檔案**: `app/(admin)/admin/series/new/page.tsx` 與 `[id]/page.tsx`

**功能**:
- 系列名稱、描述、分類、排序權重輸入
- 圖片上傳（系列主圖）
- 狀態切換（active/inactive）

#### 4.3 價格管理頁面

**檔案**: `app/(admin)/admin/pricing/page.tsx`

**功能**:
- 批量設定商品在各等級的價格
- 表格形式顯示（行：商品，列：等級）
- 批量儲存按鈕

**表格範例**:

| 商品名稱 | 批發 | 零售 | 經銷商 |
|---------|------|------|--------|
| 蘋果汁 500ml | $50 | $60 | $45 |
| 橘子汁 500ml | $50 | $60 | $45 |

#### 4.4 修改商品表單

**檔案**: `app/(admin)/admin/products/new/page.tsx` 與 `[id]/page.tsx`

**修改項目**:
- 移除 `category_id` 選擇器，改為 `series_id` 選擇器
- 移除商品編號輸入（自動產生）
- 新增原價輸入（`retail_price`）
- 新增庫存狀態選擇器（`stock_status`）

---

## 測試驗證

### Unit Tests

**檔案**: `lib/actions/__tests__/series.test.ts`

測試項目：
- ✅ 系列 CRUD 操作
- ✅ 權限檢查（客戶無法建立/更新/刪除）
- ✅ 刪除保護（系列下有商品時拒絕刪除）

**檔案**: `lib/actions/__tests__/tier-prices.test.ts`

測試項目：
- ✅ 價格 UPSERT 操作
- ✅ 批量設定價格
- ✅ 價格驗證（不可為負數）

**檔案**: `lib/actions/__tests__/shop.test.ts`

測試項目：
- ✅ 客戶僅能查詢 active 系列與商品
- ✅ 客戶僅能看到自己 tier_id 的價格
- ✅ 未設定價格的商品 `user_price` 為 null

---

### Integration Tests

#### 測試 User Story 1: 客戶瀏覽系列並查看等級價格

**步驟**:
1. 使用「批發」等級帳號登入（手機號碼：0912345678）
2. 進入「飲料 > 美粒果系列」頁面
3. 驗證看到「原價 $60 您的價格 $50（批發）」
4. 切換「零售」等級帳號登入（手機號碼：0987654321）
5. 驗證看到「原價 $60 您的價格 $60（零售）」

#### 測試 User Story 2: 管理員設定商品系列與等級價格

**步驟**:
1. 管理員登入（Email：admin@example.com）
2. 建立「美粒果系列」，選擇分類「飲料」
3. 上傳系列圖片
4. 新增商品「蘋果汁 500ml」，選擇系列「美粒果系列」
5. 驗證商品編號自動產生為 `DRK-0001`
6. 進入價格管理頁面，設定批發價 $50，零售價 $60，經銷商價 $45
7. 驗證前台不同等級客戶看到對應價格

#### 測試 User Story 3: 前台使用者查看個人資訊與登出

**步驟**:
1. 客戶登入
2. 驗證頂部導航列顯示「0912345678 | 會員等級: 批發」與登出按鈕
3. 點擊登出
4. 驗證導回登入頁面，Session 清除

---

### Edge Cases 測試

- [ ] 商品刪除後編號斷號（下一個商品編號不回填）
- [ ] 並發建立商品（編號不重複）
- [ ] 系列遷移（商品從系列 A 遷移到系列 B，編號不變）
- [ ] 未設定價格的商品（顯示「價格未設定」，加入購物車禁用）
- [ ] 分類代碼衝突（新增分類時代碼重複，顯示錯誤）
- [ ] 系列刪除保護（系列下有商品，禁止刪除）

---

## 文件參考

### 核心文件

- **spec.md**: 功能規格與使用者故事
- **data-model.md**: 資料庫 Schema 與關聯
- **contracts/series.md**: 系列管理 API 合約
- **contracts/tier-prices.md**: 等級價格 API 合約
- **contracts/shop.md**: 前台商品查詢 API 合約

### 技術參考

- **research.md**: 技術決策與替代方案
- **plan.md**: 實作計畫與憲章檢查
- **CLAUDE.md**: 專案憲章與開發規範

### 資料庫 Migration

- **supabase/migrations/20260102_series_and_tier_prices.sql**: 完整 Migration 檔案

---

## 開發檢查清單

### Phase 1: 型別與驗證 ✅

- [ ] 新增 `types/index.ts` 型別定義（Series, TierPrice, ProductWithPrice）
- [ ] 新增 `lib/validations/series.schema.ts`
- [ ] 新增 `lib/validations/tier-price.schema.ts`
- [ ] 更新 `lib/validations/product.schema.ts`

### Phase 2: Server Actions ✅

- [ ] 實作 `lib/actions/series.ts`（6 個函式）
- [ ] 實作 `lib/actions/tier-prices.ts`（4 個函式）
- [ ] 實作 `lib/actions/shop.ts`（5 個函式）
- [ ] 更新 `lib/actions/products.ts`（修改 create/update）
- [ ] 更新 `lib/supabase/storage.ts`（新增 uploadSeriesImage）

### Phase 3: 前台 UI ✅

- [ ] 更新 `app/(shop)/layout.tsx`（導航列）
- [ ] 更新 `app/(shop)/store/page.tsx`（系列列表）
- [ ] 新增 `app/(shop)/store/series/[id]/page.tsx`（系列詳情頁）
- [ ] 新增 `components/shop/SeriesCard.tsx`
- [ ] 新增 `components/shop/ProductCard.tsx`
- [ ] 新增 `components/shop/Navbar.tsx`

### Phase 4: 後台 UI ✅

- [ ] 新增 `app/(admin)/admin/series/page.tsx`（系列列表）
- [ ] 新增 `app/(admin)/admin/series/new/page.tsx`（建立系列）
- [ ] 新增 `app/(admin)/admin/series/[id]/page.tsx`（編輯系列）
- [ ] 新增 `app/(admin)/admin/pricing/page.tsx`（價格管理）
- [ ] 新增 `components/admin/SeriesForm.tsx`
- [ ] 新增 `components/admin/TierPriceTable.tsx`
- [ ] 更新 `app/(admin)/admin/products/new/page.tsx`
- [ ] 更新 `app/(admin)/admin/products/[id]/page.tsx`

### Phase 5: 測試 ✅

- [ ] Unit Tests（series, tier-prices, shop）
- [ ] Integration Tests（User Story 1, 2, 3）
- [ ] Edge Cases 測試

---

## 常見問題

### Q: 商品編號會自動產生嗎？

**A**: 是的，商品建立時 PostgreSQL Trigger 會自動產生編號（格式：`分類代碼-流水號`，如 `DRK-0001`）。前台與後台的商品編號欄位均為唯讀，無需手動輸入。

### Q: 若商品未設定價格，客戶看到什麼？

**A**: 客戶看到「價格未設定」，加入購物車按鈕禁用。商品仍會顯示，不會隱藏。

### Q: 系列圖片儲存在哪裡？

**A**: 使用 Supabase Storage 的 `products` bucket，路徑為 `products/series/{series_id}/main.{ext}`。與商品圖片使用相同 bucket，但路徑前綴不同。

### Q: 客戶可以看到其他等級的價格嗎？

**A**: 不行。Server Action 會過濾 `tier_id`，僅回傳當前用戶等級的價格。前端無法直接呼叫 Supabase Client。

### Q: 若系列下架，商品會如何？

**A**: 系列 `status = 'inactive'` 時，前台不顯示該系列及其下所有商品（即使商品 `status = 'active'`）。後台管理員仍可見。

---

## 完成後

1. ✅ 執行型別檢查：`pnpm type-check`
2. ✅ 執行測試：`pnpm test`
3. ✅ 執行建置：`pnpm build`
4. ✅ 提交變更：`git add . && git commit -m "feat: 完成商品系列與等級價格管理功能"`
5. ✅ 合併到 master（經過測試與驗收後）

---

**Quickstart Guide 完成** ✅
