# Feature Enhancement: 零售價格固定化與系列快速價格設定

**Feature**: 003-series-and-pricing (Enhancement)
**Created**: 2026-01-03
**Status**: 規劃階段
**Input**: 將零售價格設為固定不可刪除,並新增系列快速價格設定功能

---

## 背景與動機

### 當前問題

1. **零售價格與零售等級未受保護**:
   - 零售價格 (`products.retail_price`) 是產品的重要組成,但目前可選填
   - 零售等級 (`tiers` 表中 `rank = 最高` 的等級) 可被刪除
   - 導致產品缺乏統一的價格基準

2. **價格設定效率低**:
   - 當前價格管理頁面 (`/admin/pricing`) 僅支援「單一商品」批量設定
   - 若要設定整個系列的價格,需逐個選擇商品,效率低
   - 缺乏「選擇系列 → 批量設定該系列所有商品價格」的快速方式

### 業務需求

1. **零售價格固定化**:
   - 零售價格是產品的基準價格,所有會員等級價格應以此為參考
   - 零售等級是最低折扣等級,所有客戶至少應看到零售價
   - 這兩者應在系統設計上受到保護,不可刪除

2. **系列快速價格設定**:
   - 批發商通常以「系列」為單位設定價格 (如「美粒果系列全系列批發價 8 折」)
   - 需要支援選擇系列後,批量設定該系列所有商品的價格
   - 提升價格管理效率

---

## 目標

### 核心目標

1. **零售價格必填**:
   - 新增商品時,必須填寫零售價格 (`retail_price`)
   - 零售價格在前台顯示為「原價」,用於計算折扣力度

2. **零售等級不可刪除**:
   - 在 `tiers` 表中,`name = '零售'` 的等級受到保護
   - 管理員無法刪除零售等級
   - 零售等級價格 = 零售價格 (自動同步)

3. **新增商品時自動建立零售價格**:
   - 商品建立時,系統自動在 `tier_prices` 表建立零售等級的價格記錄
   - 價格值 = `retail_price`

4. **系列快速價格設定**:
   - 價格管理頁面新增「系列選擇器」
   - 選擇系列後,顯示該系列所有商品的價格設定表格
   - 支援批量設定該系列所有商品的價格

---

## 功能規格

### Feature 1: 零售價格固定化

#### 1.1 資料庫層級

**零售等級保護**:
- 在 `tiers` 表中,新增 `is_protected` 欄位 (BOOLEAN, DEFAULT false)
- 零售等級的 `is_protected = true`
- 刪除等級時,檢查 `is_protected`,若為 true 則拒絕刪除

**Migration 範例**:
```sql
-- 新增保護欄位
ALTER TABLE tiers ADD COLUMN is_protected BOOLEAN DEFAULT false;

-- 標記零售等級為受保護
UPDATE tiers SET is_protected = true WHERE name = '零售';

-- 刪除保護 Constraint (可選 - 在應用層處理)
-- ALTER TABLE tiers ADD CONSTRAINT prevent_delete_protected_tier
--   CHECK (NOT (is_protected = true AND status = 'deleted'));
```

#### 1.2 商品建立流程

**必填零售價格**:
- 修改 `lib/validations/product.schema.ts` - `createProductSchema`:
  - `retail_price` 改為必填 (`z.number().min(0)`)
  - 移除 `.nullable()` 或 `.optional()`

**自動建立零售價格記錄**:
- 修改 `lib/actions/products.ts` - `createProduct()`:
  - 商品建立成功後,自動呼叫 `setTierPrice()` 建立零售等級價格
  - 價格值 = `retail_price`

**範例邏輯**:
```typescript
// lib/actions/products.ts - createProduct()
export async function createProduct(prev: any, formData: FormData) {
  // ... 驗證與建立商品邏輯

  // 商品建立成功後,自動建立零售價格
  if (result.success && newProduct) {
    // 查詢零售等級 ID
    const { data: retailTier } = await supabase
      .from('tiers')
      .select('id')
      .eq('name', '零售')
      .single()

    if (retailTier) {
      // 自動建立零售價格
      await setTierPrice({
        product_id: newProduct.id,
        tier_id: retailTier.id,
        price: validation.data.retail_price,
      })
    }
  }

  return result
}
```

#### 1.3 零售等級刪除保護

**修改 `lib/actions/tiers.ts` - `deleteTier()`**:
- 在刪除前檢查 `is_protected`
- 若為 true,回傳錯誤訊息「零售等級不可刪除」

**範例邏輯**:
```typescript
// lib/actions/tiers.ts - deleteTier()
export async function deleteTier(id: string) {
  // ... 權限檢查

  // 檢查是否為受保護等級
  const { data: tier } = await supabase
    .from('tiers')
    .select('is_protected, name')
    .eq('id', id)
    .single()

  if (tier?.is_protected) {
    return {
      success: false,
      message: `「${tier.name}」等級是系統預設等級,不可刪除`,
    }
  }

  // ... 原有刪除邏輯
}
```

#### 1.4 UI 調整

**商品表單 (`components/admin/product-form.tsx`)**:
- 零售價格欄位標記為必填 (`*`)
- 移除選填提示

**會員等級管理頁面 (`app/(admin)/admin/tiers/page.tsx`)**:
- 零售等級的「刪除」按鈕禁用
- 顯示「系統預設」標籤

---

### Feature 2: 系列快速價格設定

#### 2.1 資料查詢邏輯

**新增 Server Action: `getSeriesProductsForPricing()`**:
- 位置: `lib/actions/tier-prices.ts`
- 用途: 查詢指定系列的所有商品與其等級價格資訊

**Signature**:
```typescript
export async function getSeriesProductsForPricing(
  series_id: string
): Promise<ActionResult<ProductWithAllTierPrices[]>>
```

**回傳格式**:
```typescript
{
  success: true,
  data: [
    {
      id: "product-1",
      code: "DRK-0001",
      name: "蘋果汁 500ml",
      retail_price: 60,
      tier_prices: [
        { tier_id: "tier-1", tier_name: "批發", tier_rank: 1, price: 50 },
        { tier_id: "tier-2", tier_name: "零售", tier_rank: 2, price: 60 },
        { tier_id: "tier-3", tier_name: "經銷商", tier_rank: 3, price: null }
      ]
    },
    {
      id: "product-2",
      code: "DRK-0002",
      name: "橘子汁 500ml",
      retail_price: 55,
      tier_prices: [
        { tier_id: "tier-1", tier_name: "批發", tier_rank: 1, price: 45 },
        { tier_id: "tier-2", tier_name: "零售", tier_rank: 2, price: 55 },
        { tier_id: "tier-3", tier_name: "經銷商", tier_rank: 3, price: null }
      ]
    }
  ]
}
```

**SQL 查詢邏輯**:
```sql
-- 查詢系列所有商品
SELECT
  p.id,
  p.code,
  p.name,
  p.retail_price,
  p.status
FROM products p
WHERE p.series_id = $1
ORDER BY p.code ASC;

-- 查詢所有等級
SELECT id, name, rank FROM tiers ORDER BY rank ASC;

-- 查詢該系列所有商品的等級價格
SELECT tp.*
FROM tier_prices tp
INNER JOIN products p ON tp.product_id = p.id
WHERE p.series_id = $1;

-- 在 Server Action 中整合資料
```

#### 2.2 UI 元件

**新增元件: `SeriesSelector`**:
- 位置: `components/admin/series-selector.tsx`
- 用途: 選擇系列 (類似現有的 `ProductSelector`)

**功能**:
- 下拉選單列出所有系列
- 選擇後導向 `/admin/pricing?series_id=xxx`

**範例實作**:
```typescript
'use client'

export function SeriesSelector({
  series,
  selectedSeriesId,
}: {
  series: Series[]
  selectedSeriesId?: string
}) {
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const seriesId = e.target.value
    if (seriesId) {
      router.push(`/admin/pricing?series_id=${seriesId}`)
    } else {
      router.push('/admin/pricing')
    }
  }

  return (
    <div className="rounded-none border-3 border-black bg-white p-4 shadow-neo">
      <label className="mb-2 block font-bold">選擇系列</label>
      <select
        value={selectedSeriesId || ''}
        onChange={handleChange}
        className="w-full rounded-none border-2 border-black px-4 py-2"
      >
        <option value="">請選擇系列</option>
        {series.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  )
}
```

**新增元件: `SeriesPriceTable`**:
- 位置: `components/admin/series-price-table.tsx`
- 用途: 批量設定系列商品價格

**功能**:
- 表格顯示系列所有商品 (橫向) × 所有等級 (縱向)
- 每個格子為價格輸入欄位
- 支援批量儲存

**範例實作**:
```typescript
'use client'

export function SeriesPriceTable({
  series,
  products,
  tiers,
}: {
  series: Series
  products: ProductWithAllTierPrices[]
  tiers: Tier[]
}) {
  const [prices, setPrices] = useState<Record<string, number | null>>({})

  const handleSubmit = async () => {
    const priceData = Object.entries(prices)
      .filter(([_, price]) => price !== null)
      .map(([key, price]) => {
        const [product_id, tier_id] = key.split('-')
        return { product_id, tier_id, price: price! }
      })

    const result = await batchSetTierPrices({ prices: priceData })
    // ... 處理結果
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-3 border-black">
        <thead>
          <tr>
            <th className="border-2 border-black p-2">商品 / 等級</th>
            {tiers.map((tier) => (
              <th key={tier.id} className="border-2 border-black p-2">
                {tier.name}
                {tier.is_protected && (
                  <span className="ml-1 text-xs text-gray-500">(固定)</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td className="border-2 border-black p-2 font-bold">
                {product.code} - {product.name}
                <div className="text-xs text-gray-600">
                  原價: ${product.retail_price}
                </div>
              </td>
              {tiers.map((tier) => {
                const tierPrice = product.tier_prices.find(
                  (tp) => tp.tier_id === tier.id
                )
                const isRetail = tier.is_protected

                return (
                  <td key={tier.id} className="border-2 border-black p-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={prices[`${product.id}-${tier.id}`] ?? tierPrice?.price ?? ''}
                      onChange={(e) =>
                        setPrices({
                          ...prices,
                          [`${product.id}-${tier.id}`]: e.target.value
                            ? parseFloat(e.target.value)
                            : null,
                        })
                      }
                      disabled={isRetail}
                      className={`w-24 rounded-none border-2 px-2 py-1 ${
                        isRetail ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={handleSubmit} className="mt-4 btn">
        批量儲存
      </button>
    </div>
  )
}
```

#### 2.3 頁面整合

**修改 `app/(admin)/admin/pricing/page.tsx`**:
- 新增 `series_id` 參數支援
- 支援兩種模式:
  1. **單一商品模式** (`?product_id=xxx`) - 顯示 `TierPriceTable`
  2. **系列批量模式** (`?series_id=xxx`) - 顯示 `SeriesPriceTable`

**邏輯流程**:
```typescript
export default async function PricingPage({ searchParams }) {
  const params = await searchParams
  const productId = params.product_id
  const seriesId = params.series_id

  // 取得所有系列與商品
  const series = await getSeries()
  const products = await getProducts({ limit: 1000 })

  // 模式 1: 系列批量設定
  if (seriesId) {
    const seriesProducts = await getSeriesProductsForPricing(seriesId)
    const selectedSeries = series.find((s) => s.id === seriesId)
    return (
      <div>
        <h1>價格管理 - 系列模式</h1>
        <SeriesSelector series={series} selectedSeriesId={seriesId} />
        <SeriesPriceTable
          series={selectedSeries}
          products={seriesProducts.data}
          tiers={tiers}
        />
      </div>
    )
  }

  // 模式 2: 單一商品設定
  if (productId) {
    // ... 原有邏輯
  }

  // 預設顯示選擇器
  return (
    <div>
      <h1>價格管理</h1>
      <p>請選擇系列或商品</p>
      <SeriesSelector series={series} />
      <ProductSelector products={products} />
    </div>
  )
}
```

---

## 實作任務清單

### Phase 1: 零售價格固定化

- [ ] **T-R1**: Migration - 新增 `tiers.is_protected` 欄位,標記零售等級
- [ ] **T-R2**: 修改 `lib/validations/product.schema.ts` - `retail_price` 改為必填
- [ ] **T-R3**: 修改 `lib/actions/products.ts` - `createProduct()` 自動建立零售價格
- [ ] **T-R4**: 修改 `lib/actions/tiers.ts` - `deleteTier()` 新增保護檢查
- [ ] **T-R5**: 修改 `components/admin/product-form.tsx` - 零售價格欄位標記必填
- [ ] **T-R6**: 修改 `app/(admin)/admin/tiers/page.tsx` - 禁用零售等級刪除按鈕

### Phase 2: 系列快速價格設定

- [ ] **T-S1**: 新增 `lib/actions/tier-prices.ts` - `getSeriesProductsForPricing()`
- [ ] **T-S2**: 新增型別定義 `types/index.ts` - `ProductWithAllTierPrices`
- [ ] **T-S3**: 新增 `components/admin/series-selector.tsx`
- [ ] **T-S4**: 新增 `components/admin/series-price-table.tsx`
- [ ] **T-S5**: 修改 `app/(admin)/admin/pricing/page.tsx` - 整合系列與商品兩種模式

### Phase 3: 測試與驗證

- [ ] **T-T1**: 測試新增商品時零售價格必填驗證
- [ ] **T-T2**: 測試新增商品後自動建立零售價格記錄
- [ ] **T-T3**: 測試刪除零售等級時顯示保護訊息
- [ ] **T-T4**: 測試系列批量價格設定 (選擇系列 → 批量儲存)
- [ ] **T-T5**: 測試系列價格表格中零售價格欄位禁用
- [ ] **T-T6**: 驗證零售價格與零售等級價格同步

---

## 資料模型變更

### tiers 表 (新增欄位)

```sql
ALTER TABLE tiers ADD COLUMN is_protected BOOLEAN DEFAULT false;
UPDATE tiers SET is_protected = true WHERE name = '零售';
```

| 欄位名稱 | 型別 | 約束 | 說明 |
|---------|------|------|------|
| is_protected | BOOLEAN | NOT NULL, DEFAULT false | 是否為受保護等級 (零售等級 = true) |

### products 表 (驗證變更)

| 欄位名稱 | 原本 | 變更後 | 說明 |
|---------|------|--------|------|
| retail_price | NULLABLE | NOT NULL | 零售價格改為必填 |

---

## 型別定義

```typescript
// types/index.ts

export interface ProductWithAllTierPrices extends Product {
  tier_prices: {
    tier_id: string
    tier_name: string
    tier_rank: number
    price: number | null
  }[]
}

export interface Tier {
  id: string
  name: string
  rank: number
  is_protected?: boolean  // 🆕 新增
  created_at: string
  updated_at: string
}
```

---

## 使用者體驗流程

### 流程 1: 新增商品 (零售價格必填)

1. 管理員進入「新增商品」頁面
2. 填寫商品名稱、系列、**零售價格** (必填 *)
3. 提交表單
4. 系統自動建立商品 + 自動建立零售等級價格記錄
5. 導向商品列表

### 流程 2: 系列批量價格設定

1. 管理員進入「價格管理」頁面
2. 選擇「系列」模式 (而非「商品」)
3. 從下拉選單選擇「美粒果系列」
4. 顯示該系列所有商品的價格表格 (商品 × 等級)
5. 批量輸入價格 (零售價格欄位禁用,顯示原價)
6. 點擊「批量儲存」
7. 系統批量更新所有價格

---

## 優點與效益

### 優點

1. **資料一致性**:
   - 所有商品必須有零售價格
   - 零售等級不可刪除,確保價格基準存在

2. **效率提升**:
   - 系列批量價格設定,大幅減少重複操作
   - 適合批發商「以系列為單位」設定價格的業務流程

3. **使用者體驗**:
   - 零售價格在商品建立時同步設定,無需事後補設
   - 價格管理頁面支援兩種模式 (商品 / 系列),靈活度高

### 效益

- **管理員操作效率**: 系列批量設定減少 80% 操作時間
- **資料完整性**: 100% 商品擁有零售價格
- **系統穩定性**: 零售等級保護防止誤刪

---

## 風險與緩解措施

### 風險 1: 現有商品缺少零售價格

**問題**: 若現有資料庫中有商品 `retail_price = NULL`,設為必填後會導致查詢失敗

**緩解**:
- Migration 時檢查並修復缺失資料
- 為 `retail_price = NULL` 的商品設定預設值 (如 0 或最低等級價格)

**Migration 範例**:
```sql
-- 檢查缺失資料
SELECT COUNT(*) FROM products WHERE retail_price IS NULL;

-- 修復: 設定為最低等級價格
UPDATE products p
SET retail_price = (
  SELECT MIN(tp.price)
  FROM tier_prices tp
  WHERE tp.product_id = p.id
)
WHERE p.retail_price IS NULL;

-- 若仍為 NULL,設為 0
UPDATE products SET retail_price = 0 WHERE retail_price IS NULL;

-- 設為必填
ALTER TABLE products ALTER COLUMN retail_price SET NOT NULL;
```

### 風險 2: 零售等級名稱不一致

**問題**: 若 `tiers` 表中零售等級名稱不是「零售」(如「Retail」、「零售客戶」),保護邏輯會失效

**緩解**:
- Migration 時檢查並標準化名稱
- 使用 `rank` 判斷 (假設零售等級總是最高 rank)

**Migration 範例**:
```sql
-- 方案 1: 標準化名稱
UPDATE tiers SET name = '零售' WHERE name ILIKE '%零售%' OR name = 'Retail';

-- 方案 2: 使用 rank 判斷 (假設零售等級 rank 最高)
UPDATE tiers SET is_protected = true WHERE rank = (SELECT MAX(rank) FROM tiers);
```

---

## 後續擴展

### 可能的延伸功能

1. **批量價格調整**:
   - 「美粒果系列全部打 9 折」
   - 「批發等級全部降 5 元」

2. **價格範本**:
   - 預設價格範本 (如「批發 8 折、經銷商 7 折」)
   - 新增系列時自動套用範本

3. **價格歷史記錄**:
   - 記錄價格變更歷史
   - 支援價格回溯

---

## 總結

本增強功能透過以下兩個核心改善,提升系統的資料完整性與操作效率:

1. **零售價格固定化**: 確保所有商品擁有價格基準,零售等級受保護
2. **系列快速價格設定**: 支援批量設定系列商品價格,大幅提升效率

符合專案「等級綁定價格」憲章原則,並與現有架構完全相容。

---

**規劃完成日期**: 2026-01-03
**預估實作時間**: 4-6 小時
**優先級**: P1 (重要增強)
