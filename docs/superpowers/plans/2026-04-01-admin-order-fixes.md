# 代客下單修復與完善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修復代客下單功能的邏輯問題、UI 問題和邊際情況，並實作組合優惠展開式選購流程。

**Architecture:** 小幅修復分散在多個現有檔案，組合優惠選購是新增一個 `combo-deal-selector.tsx` 子元件 + 一個新 Server Action。所有修復都不影響現有客戶端購物車流程。

**Tech Stack:** Next.js 15 App Router, React, Supabase, Tailwind v4

---

## File Structure

### 新增檔案
- `components/admin/orders/combo-deal-selector.tsx` — 組合優惠展開式商品選擇器

### 修改檔案
- `components/admin/orders/step-checkout.tsx` — 白屏防護 + 移除 useAlert 的彈窗陷阱
- `components/admin/orders/draft-items-summary.tsx` — 金額同步
- `components/admin/orders/step-customer-select.tsx` — 未設定等級提示
- `components/admin/orders/regular-product-picker.tsx` — 移除庫存顯示 + 系列名稱空值 + 錯誤提示
- `components/admin/orders/combo-deal-picker.tsx` — 整合展開式選購 + 錯誤提示
- `lib/actions/orders.ts` — tierId 驗證
- `lib/actions/combo-deals.ts` — 新增查詢組合優惠含商品詳情的 action

---

### Task 1: 快速修復（白屏、金額同步、客戶提示、庫存、系列名稱、後端驗證）

**Files:**
- Modify: `components/admin/orders/step-checkout.tsx`
- Modify: `components/admin/orders/draft-items-summary.tsx`
- Modify: `components/admin/orders/step-customer-select.tsx`
- Modify: `components/admin/orders/regular-product-picker.tsx`
- Modify: `lib/actions/orders.ts`

- [ ] **Step 1: 修復 StepCheckout 白屏防護**

在 `components/admin/orders/step-checkout.tsx` 中，替換第 128 行：

```typescript
if (!selectedCustomer || !calculation) return null
```

改為：

```typescript
if (!selectedCustomer) return null

if (!calculation) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <Package className="h-12 w-12 text-text-secondary opacity-40" />
      <p className="text-sm text-text-secondary">尚未選擇任何商品</p>
      <Button variant="outline" onClick={() => draft.setCurrentStep(2)}>
        返回選擇商品
      </Button>
    </div>
  )
}
```

在檔案頂部 import 加入 `Package` from `lucide-react`。

- [ ] **Step 2: 修復 StepCheckout 的 useAlert 彈窗陷阱**

在 `step-checkout.tsx` 中，`handleSubmit` 的成功/失敗回饋目前使用 `await alert({...})`，這會觸發 Radix Dialog 和 Sheet 的衝突。

改為使用 inline 狀態訊息：

在 component 頂部新增：
```typescript
const [submitResult, setSubmitResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
```

替換 `handleSubmit` 中的 alert 調用：

成功時：
```typescript
if (result.success) {
  setSubmitResult({ type: 'success', message: `訂單 ${result.data?.orderNumber} 已建立` })
  // 延遲關閉讓用戶看到成功訊息
  setTimeout(() => onOrderCreated(), 1500)
} else {
  setSubmitResult({ type: 'error', message: result.message || '建立訂單時發生錯誤' })
}
```

catch 中：
```typescript
setSubmitResult({ type: 'error', message: '建立訂單時發生未預期的錯誤' })
```

移除 `finally` 中的 `setSubmitting(false)`，改為在 error 時才恢復：
```typescript
} catch {
  setSubmitResult({ type: 'error', message: '建立訂單時發生未預期的錯誤' })
  setSubmitting(false)
}
```

在送出按鈕上方加入結果顯示：
```tsx
{submitResult && (
  <div className={cn(
    'p-3 rounded-theme-sm text-sm',
    submitResult.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
  )}>
    {submitResult.type === 'success' ? '✓ ' : '✗ '}{submitResult.message}
  </div>
)}
```

移除 `useAlert` import（如果不再使用的話）。同樣移除優惠券套用失敗的 alert，改為 inline 提示：

在 `handleApplyCoupon` 中，替換 alert 調用為 `setCouponError`：
```typescript
const [couponError, setCouponError] = useState<string | null>(null)
```

失敗時：
```typescript
if (!result.valid) {
  setCouponError(result.error || '優惠券不適用')
  return
}
// 成功時清除錯誤
setCouponError(null)
```

在優惠券列表下方顯示錯誤：
```tsx
{couponError && (
  <div className="text-xs text-red-500 mt-1">{couponError}</div>
)}
```

- [ ] **Step 3: 修復 DraftItemsSummary 金額同步**

在 `components/admin/orders/draft-items-summary.tsx` 中，替換自行計算的邏輯：

將第 15-21 行替換為：
```typescript
const { calculation } = draft
if (!calculation) return null

const total = calculation.retailTotal - calculation.memberDiscount - calculation.comboDiscount
```

顯示部分的 `$Math.round(total).toLocaleString()` 改為 `$${total.toLocaleString()}`。

- [ ] **Step 4: 修復未設定等級客戶提示**

在 `components/admin/orders/step-customer-select.tsx` 中：

新增 state：
```typescript
const [noTierError, setNoTierError] = useState<string | null>(null)
```

替換第 51 行 `if (!customer.tier_id) return`：
```typescript
if (!customer.tier_id) {
  setNoTierError(customer.id)
  return
}
setNoTierError(null)
```

在客戶列表的每個 button 下方，加入條件顯示錯誤提示：
```tsx
{noTierError === customer.id && (
  <div className="px-4 py-2 text-xs text-red-500 bg-red-50">
    此客戶未設定等級，無法代客下單
  </div>
)}
```

- [ ] **Step 5: 移除庫存顯示 + 系列名稱空值處理**

在 `components/admin/orders/regular-product-picker.tsx` 中：

移除第 170-172 行的庫存顯示：
```tsx
<span className="text-xs text-text-secondary">
  庫存: {product.stock}
</span>
```

替換第 158 行 `{product.series_name}` 為 `{product.series_name || '未分類'}`。

- [ ] **Step 6: 修復商品載入錯誤提示**

在 `regular-product-picker.tsx` 的 `loadProducts` 中，新增錯誤狀態：

```typescript
const [error, setError] = useState<string | null>(null)
```

修改 `loadProducts`：
```typescript
const loadProducts = useCallback(async () => {
  setLoading(true)
  setError(null)
  const result = await getProductsWithTierPrices(tierId, {
    search: debouncedSearch || undefined,
    seriesId: selectedSeriesId || undefined,
    limit: 50,
  })
  if (result.success && result.data) {
    setProducts(result.data)
  } else {
    setError(result.message || '載入商品失敗')
  }
  setLoading(false)
}, [tierId, debouncedSearch, selectedSeriesId])
```

在商品列表區域加入錯誤顯示：
```tsx
{error && (
  <div className="py-4 text-center text-sm text-red-500">
    {error}
    <button onClick={loadProducts} className="ml-2 underline">重試</button>
  </div>
)}
```

- [ ] **Step 7: 後端 tierId 驗證**

在 `lib/actions/orders.ts` 中，找到代客下單的 tierId 設定處（約第 109-110 行）：

```typescript
userId = targetProfile.id
tierId = targetProfile.tier_id || undefined
```

在其後加入驗證：
```typescript
if (!tierId) {
  return {
    success: false,
    message: '目標客戶未設定等級，無法建立訂單',
  }
}
```

- [ ] **Step 8: 執行型別檢查與 build**

Run: `cd /home/haraluya/APP/vsale-lite && pnpm type-check && pnpm build`
Expected: 通過

- [ ] **Step 9: Commit**

```bash
git add components/admin/orders/step-checkout.tsx components/admin/orders/draft-items-summary.tsx components/admin/orders/step-customer-select.tsx components/admin/orders/regular-product-picker.tsx lib/actions/orders.ts
git commit -m "fix: 修復代客下單邏輯與 UI 問題（白屏、金額同步、提示、驗證）"
```

---

### Task 2: 新增組合優惠詳情查詢 Action（含系列商品 + 等級價格）

**Files:**
- Modify: `lib/actions/combo-deals.ts`

- [ ] **Step 1: 在 combo-deals.ts 底部新增 getComboDealDetailForAdmin**

現有的 `getComboDealDetail` 回傳 `products: []`（管理員編輯用，不需商品列表）。新增一個帶商品資訊和等級價格的版本：

```typescript
/**
 * 代客下單：查詢組合優惠完整詳情含系列商品與等級價格（管理員專用）
 */
export async function getComboDealDetailWithProducts(
  comboDealId: string,
  tierId: string
): Promise<ActionResult<{
  id: string
  name: string
  combo_mode: 'each' | 'mix_match'
  discount_type: 'fixed' | 'percentage'
  discount_value: number
  mix_match_total_quantity?: number
  series: Array<{
    series_id: string
    series_name: string
    required_quantity: number | null
    products: Array<{
      product_id: string
      product_name: string
      product_code: string
      series_id: string
      retail_price: number
      tier_price: number
    }>
  }>
}>> {
  try {
    await checkAuth('admin')
    const adminClient = createAdminClient()

    // 查詢組合優惠基本資料
    const { data: comboDeal, error: dealError } = await adminClient
      .from('combo_deals')
      .select('id, name, combo_mode, discount_type, discount_value')
      .eq('id', comboDealId)
      .eq('status', 'active')
      .single()

    if (dealError || !comboDeal) {
      return { success: false, message: '組合優惠不存在或已失效' }
    }

    // 查詢任選模式配置
    let mixMatchTotalQuantity: number | undefined
    if (comboDeal.combo_mode === 'mix_match') {
      const { data: config } = await adminClient
        .from('combo_deal_mix_match_config')
        .select('total_quantity')
        .eq('combo_deal_id', comboDealId)
        .single()
      mixMatchTotalQuantity = config?.total_quantity
    }

    // 查詢系列關聯
    const { data: seriesData, error: seriesError } = await adminClient
      .from('combo_deal_series')
      .select(`
        series_id,
        required_quantity,
        display_order,
        series:series_id(id, name, status)
      `)
      .eq('combo_deal_id', comboDealId)
      .order('display_order', { ascending: true })

    if (seriesError) {
      return { success: false, message: '查詢系列資料失敗' }
    }

    const activeSeries = (seriesData || []).filter(
      (s: any) => s.series?.status === 'active'
    )

    // 批次查詢所有系列的商品（含等級價格）
    const seriesIds = activeSeries.map((s: any) => s.series_id)

    const { data: products, error: productsError } = await adminClient
      .from('products')
      .select(`
        id, name, code, series_id, retail_price,
        tier_prices(price, tier_id)
      `)
      .in('series_id', seriesIds)
      .eq('status', 'active')
      .order('code', { ascending: true })

    if (productsError) {
      return { success: false, message: '查詢商品資料失敗' }
    }

    // 按系列分組商品
    const productsBySeriesId = new Map<string, any[]>()
    for (const p of products || []) {
      const list = productsBySeriesId.get(p.series_id) || []
      list.push(p)
      productsBySeriesId.set(p.series_id, list)
    }

    // 組裝結果
    const series = activeSeries.map((s: any) => ({
      series_id: s.series_id,
      series_name: s.series?.name || '',
      required_quantity: s.required_quantity,
      products: (productsBySeriesId.get(s.series_id) || []).map((p: any) => {
        const tierPriceData = p.tier_prices?.find((tp: any) => tp.tier_id === tierId)
        return {
          product_id: p.id,
          product_name: p.name,
          product_code: p.code || '',
          series_id: p.series_id,
          retail_price: p.retail_price,
          tier_price: tierPriceData?.price ?? p.retail_price,
        }
      }),
    }))

    return {
      success: true,
      data: {
        id: comboDeal.id,
        name: comboDeal.name,
        combo_mode: comboDeal.combo_mode,
        discount_type: comboDeal.discount_type,
        discount_value: comboDeal.discount_value,
        mix_match_total_quantity: mixMatchTotalQuantity,
        series,
      },
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢組合優惠時發生錯誤',
    }
  }
}
```

- [ ] **Step 2: 型別檢查**

Run: `cd /home/haraluya/APP/vsale-lite && pnpm type-check`

- [ ] **Step 3: Commit**

```bash
git add lib/actions/combo-deals.ts
git commit -m "feat: 新增 getComboDealDetailWithProducts action（含系列商品與等級價格）"
```

---

### Task 3: 建立組合優惠展開式選擇器

**Files:**
- Create: `components/admin/orders/combo-deal-selector.tsx`

- [ ] **Step 1: 建立組合優惠商品選擇器**

建立 `components/admin/orders/combo-deal-selector.tsx`：

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronUp, Loader2, Plus, Minus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getComboDealDetailWithProducts } from '@/lib/actions/combo-deals'
import { calculateComboDealPrice } from '@/lib/pricing/combo-deals'
import type { ComboDealCartItem } from '@/stores/cart'
import type { SelectedProduct } from '@/types/combo-deals'

interface ComboDealSelectorProps {
  dealId: string
  dealName: string
  comboMode: 'each' | 'mix_match'
  discountType: 'fixed' | 'percentage'
  discountValue: number
  tierId: string
  mixMatchTotalQuantity?: number
  onAdd: (item: ComboDealCartItem) => void
  onClose: () => void
}

type DealDetail = {
  series: Array<{
    series_id: string
    series_name: string
    required_quantity: number | null
    products: Array<{
      product_id: string
      product_name: string
      product_code: string
      series_id: string
      retail_price: number
      tier_price: number
    }>
  }>
  mix_match_total_quantity?: number
}

type SelectionMap = Map<string, number> // product_id → quantity

export function ComboDealSelector({
  dealId, dealName, comboMode, discountType, discountValue,
  tierId, mixMatchTotalQuantity, onAdd, onClose,
}: ComboDealSelectorProps) {
  const [detail, setDetail] = useState<DealDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selections, setSelections] = useState<SelectionMap>(new Map())

  // 載入組合優惠詳情
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getComboDealDetailWithProducts(dealId, tierId).then((result) => {
      if (cancelled) return
      if (result.success && result.data) {
        setDetail(result.data)
      } else {
        setError(result.message || '載入失敗')
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [dealId, tierId])

  // 更新選擇數量
  const updateSelection = useCallback((productId: string, delta: number) => {
    setSelections(prev => {
      const next = new Map(prev)
      const current = next.get(productId) || 0
      const newQty = current + delta
      if (newQty <= 0) {
        next.delete(productId)
      } else {
        next.set(productId, newQty)
      }
      return next
    })
  }, [])

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="p-3 text-sm text-red-500">{error || '載入失敗'}</div>
    )
  }

  // 計算各系列已選數量
  const getSeriesSelectedQty = (seriesId: string) => {
    const seriesProducts = detail.series.find(s => s.series_id === seriesId)?.products || []
    return seriesProducts.reduce((sum, p) => sum + (selections.get(p.product_id) || 0), 0)
  }

  const totalSelected = Array.from(selections.values()).reduce((sum, q) => sum + q, 0)

  // 判斷是否可加入訂單
  let canAdd = false
  if (comboMode === 'each') {
    canAdd = detail.series.every(s =>
      s.required_quantity === null || getSeriesSelectedQty(s.series_id) === s.required_quantity
    )
  } else {
    const required = detail.mix_match_total_quantity || mixMatchTotalQuantity || 0
    canAdd = totalSelected === required
  }

  // 計算價格
  const tierPrices = new Map<string, number>()
  const retailPrices = new Map<string, number>()
  detail.series.forEach(s => s.products.forEach(p => {
    tierPrices.set(p.product_id, p.tier_price)
    retailPrices.set(p.product_id, p.retail_price)
  }))

  const selectedProducts: Array<{ product_id: string; quantity: number; retail_price: number }> = []
  selections.forEach((qty, productId) => {
    selectedProducts.push({
      product_id: productId,
      quantity: qty,
      retail_price: retailPrices.get(productId) || 0,
    })
  })

  const pricing = selectedProducts.length > 0
    ? calculateComboDealPrice(selectedProducts, tierPrices, { discount_type: discountType, discount_value: discountValue })
    : null

  // 加入訂單
  const handleAdd = () => {
    if (!pricing || !canAdd) return

    const selectedProductsList: SelectedProduct[] = []
    selections.forEach((qty, productId) => {
      const product = detail.series.flatMap(s => s.products).find(p => p.product_id === productId)
      if (product) {
        selectedProductsList.push({
          product_id: productId,
          series_id: product.series_id,
          quantity: qty,
        })
      }
    })

    const item: ComboDealCartItem = {
      id: `${dealId}-${Date.now()}`,
      combo_deal_id: dealId,
      combo_deal_name: dealName,
      selected_products: selectedProductsList,
      original_price: pricing.originalPrice,
      discounted_price: pricing.discountedPrice,
      discount_amount: pricing.discountAmount,
    }

    onAdd(item)
    onClose()
  }

  return (
    <div className="border-t bg-gray-50 p-3 space-y-3">
      {/* 收合按鈕 */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">
          {comboMode === 'each' ? '各系列選擇商品' : `任選 ${detail.mix_match_total_quantity || mixMatchTotalQuantity || 0} 件`}
          {comboMode === 'mix_match' && ` (已選 ${totalSelected} 件)`}
        </span>
        <button onClick={onClose} className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1">
          收合 <ChevronUp className="h-3 w-3" />
        </button>
      </div>

      {/* 系列商品列表 */}
      {detail.series.map((series) => {
        const seriesQty = getSeriesSelectedQty(series.series_id)
        const isComplete = comboMode === 'each' && series.required_quantity !== null && seriesQty === series.required_quantity

        return (
          <div key={series.series_id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{series.series_name || '未分類'}</span>
              {comboMode === 'each' && series.required_quantity !== null && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded',
                  isComplete ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-text-secondary'
                )}>
                  {seriesQty}/{series.required_quantity}
                </span>
              )}
            </div>
            <div className="space-y-0.5">
              {series.products.map((product) => {
                const qty = selections.get(product.product_id) || 0
                return (
                  <div key={product.product_id} className="flex items-center justify-between p-1.5 rounded bg-white text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-text-secondary font-mono">{product.product_code}</span>
                      <span className="ml-1.5 truncate">{product.product_name}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <span className="text-xs text-blue-600 font-medium">${product.tier_price}</span>
                      {qty > 0 ? (
                        <div className="flex items-center gap-0.5">
                          <button
                            className="h-6 w-6 flex items-center justify-center rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                            onClick={() => updateSelection(product.product_id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-semibold">{qty}</span>
                          <button
                            className="h-6 w-6 flex items-center justify-center rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                            onClick={() => updateSelection(product.product_id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="h-6 w-6 flex items-center justify-center rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                          onClick={() => updateSelection(product.product_id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* 價格預覽 + 加入按鈕 */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="text-xs">
          {pricing ? (
            <>
              <span className="text-text-secondary line-through">${pricing.originalPrice.toLocaleString()}</span>
              <span className="ml-1.5 text-blue-600 font-semibold">${pricing.discountedPrice.toLocaleString()}</span>
              <span className="ml-1.5 text-green-600">省${pricing.discountAmount.toLocaleString()}</span>
            </>
          ) : (
            <span className="text-text-secondary">請選擇商品</span>
          )}
        </div>
        <Button
          size="sm"
          disabled={!canAdd}
          onClick={handleAdd}
          className="gap-1"
        >
          <Check className="h-3 w-3" />
          加入訂單
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 型別檢查**

Run: `cd /home/haraluya/APP/vsale-lite && pnpm type-check`

可能需要修正 `calculateComboDealPrice` 的參數格式。此函式有兩個 overload：
1. `(selectedProducts, tierPricesMap, comboDeal)` — 使用 Map
2. `(selectedProducts, discountType, discountValue)` — 商品已含價格

我們使用第 1 種（Map 版），需確保 `selectedProducts` 格式匹配 `SelectedProduct[]`（需要 `product_id` 和 `quantity`）。

- [ ] **Step 3: Commit**

```bash
git add components/admin/orders/combo-deal-selector.tsx
git commit -m "feat: 新增組合優惠展開式商品選擇器元件"
```

---

### Task 4: 整合組合優惠選擇器到 ComboDealPicker

**Files:**
- Modify: `components/admin/orders/combo-deal-picker.tsx`

- [ ] **Step 1: 重寫 ComboDealPicker 整合展開式選購**

完整替換 `components/admin/orders/combo-deal-picker.tsx`：

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Gift, ChevronDown } from 'lucide-react'
import { getActiveComboDealsByTierId } from '@/lib/actions/combo-deals'
import { formatDiscountLabel } from '@/lib/pricing/combo-deals'
import { ComboDealSelector } from './combo-deal-selector'
import type { AdminOrderDraftReturn } from '@/hooks/use-admin-order-draft'
import type { ComboDealCartItem } from '@/stores/cart'

interface ComboDealPickerProps {
  draft: AdminOrderDraftReturn
  tierId: string
}

type ComboDealItem = {
  id: string
  name: string
  poster_url: string | null
  combo_mode: 'each' | 'mix_match'
  discount_type: 'fixed' | 'percentage'
  discount_value: number
  start_date: string
  end_date: string
  series_count: number
  mix_match_total_quantity?: number
}

export function ComboDealPicker({ draft, tierId }: ComboDealPickerProps) {
  const [deals, setDeals] = useState<ComboDealItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedDealId, setExpandedDealId] = useState<string | null>(null)

  useEffect(() => {
    async function loadDeals() {
      setLoading(true)
      setError(null)
      const result = await getActiveComboDealsByTierId(tierId)
      if (result.success && result.data) {
        setDeals(result.data)
      } else {
        setError(result.message || '載入組合優惠失敗')
      }
      setLoading(false)
    }
    loadDeals()
  }, [tierId])

  const handleAdd = (item: ComboDealCartItem) => {
    draft.addComboDeal(item)
    setExpandedDealId(null)
  }

  if (loading) {
    return (
      <div className="py-4 text-center text-sm text-text-secondary">載入組合優惠中...</div>
    )
  }

  if (error) {
    return (
      <div className="py-4 text-center text-sm text-red-500">
        {error}
        <button
          onClick={() => {
            setError(null)
            setLoading(true)
            getActiveComboDealsByTierId(tierId).then(r => {
              if (r.success && r.data) setDeals(r.data)
              else setError(r.message || '載入失敗')
              setLoading(false)
            })
          }}
          className="ml-2 underline"
        >
          重試
        </button>
      </div>
    )
  }

  if (deals.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-text-secondary">
        <Gift className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
        此等級目前無可用的組合優惠
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {deals.map((deal) => {
        const isExpanded = expandedDealId === deal.id
        return (
          <div key={deal.id} className="rounded-theme-sm border-theme bg-surface overflow-hidden">
            {/* 組合優惠卡片 */}
            <div className="flex items-center gap-3 p-3 hover:bg-surface-secondary transition-colors">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{deal.name}</div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-text-secondary">
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    {formatDiscountLabel(deal.discount_type, deal.discount_value)}
                  </span>
                  <span>
                    {deal.combo_mode === 'each'
                      ? `${deal.series_count} 個系列各選`
                      : `任選 ${deal.mix_match_total_quantity ?? '?'} 件`}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant={isExpanded ? 'outline' : 'default'}
                onClick={() => setExpandedDealId(isExpanded ? null : deal.id)}
                className="gap-1"
              >
                {isExpanded ? '收合' : '選購'}
                {!isExpanded && <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>

            {/* 展開的選擇器 */}
            {isExpanded && (
              <ComboDealSelector
                dealId={deal.id}
                dealName={deal.name}
                comboMode={deal.combo_mode}
                discountType={deal.discount_type}
                discountValue={deal.discount_value}
                tierId={tierId}
                mixMatchTotalQuantity={deal.mix_match_total_quantity}
                onAdd={handleAdd}
                onClose={() => setExpandedDealId(null)}
              />
            )}
          </div>
        )
      })}

      {/* 已加入的組合優惠 */}
      {draft.comboDeals.length > 0 && (
        <div className="mt-3 pt-3 border-t space-y-1.5">
          <div className="text-xs font-medium text-text-secondary">已加入的組合優惠</div>
          {draft.comboDeals.map((deal) => (
            <div
              key={deal.id}
              className="flex items-center justify-between p-2 rounded-theme-sm bg-green-50 border border-green-200"
            >
              <div className="text-sm">
                <span className="font-medium">{deal.combo_deal_name}</span>
                <span className="ml-2 text-green-700 text-xs">
                  ${Math.round(deal.discounted_price).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => draft.removeComboDeal(deal.id)}
                className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
              >
                移除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 型別檢查與 build**

Run: `cd /home/haraluya/APP/vsale-lite && pnpm type-check && pnpm build`

- [ ] **Step 3: Commit**

```bash
git add components/admin/orders/combo-deal-picker.tsx
git commit -m "feat: 組合優惠整合展開式選購流程（各選 + 任選模式）"
```

---

### Task 5: 最終整合測試

- [ ] **Step 1: 完整 build**

Run: `cd /home/haraluya/APP/vsale-lite && pnpm build`

- [ ] **Step 2: 重啟 dev server**

```bash
pnpm dev
```

- [ ] **Step 3: 測試清單**

1. 搜尋客戶 → 點擊未設定等級的客戶 → 確認出現紅色提示
2. 選擇有等級的客戶 → 進入 Step 2
3. 商品列表無庫存顯示
4. 系列名稱為空的商品顯示「未分類」
5. 搜尋商品 → 故意斷網 → 確認出現錯誤提示和重試按鈕
6. 組合優惠點擊「選購」→ 展開商品選擇區域
7. 各選模式：每個系列選到指定數量 → 「加入訂單」按鈕啟用
8. 任選模式：選到總數量 → 「加入訂單」按鈕啟用
9. 加入後組合優惠出現在「已加入」區域
10. 不選商品直接到 Step 3 → 確認顯示空狀態 + 返回按鈕
11. Step 3 修改數量和價格 → 金額摘要即時更新
12. 套用不符合的優惠券 → 確認出現 inline 錯誤
13. 送出訂單成功 → 確認出現 inline 成功訊息
14. 摘要條金額和結帳頁金額一致
