# 價格體系重構與優化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 統一價格計算模組，修復前後端金額不一致 bug，優化購物車組合優惠顯示與折扣展開明細

**Architecture:** 新增 `lib/pricing/order-calculator.ts` 作為唯一金額計算來源，`orders.ts` 和前端元件都透過它計算。移除組合優惠-優惠券互動機制，兩者完全獨立。購物車摘要改為「折扣加總 + 展開明細」模式。

**Tech Stack:** Next.js 15 App Router, Supabase, Zustand, Tailwind v4, Lucide Icons

---

### Task 1: 新增統一價格計算模組

**Files:**
- Create: `lib/pricing/order-calculator.ts`
- Modify: `types/index.ts:216-225` (CartItemWithProduct 新增 retailPrice)

- [ ] **Step 1: 擴展 CartItemWithProduct 型別**

在 `types/index.ts` 的 `CartItemWithProduct` 型別中新增 `retailPrice` 欄位：

```typescript
// types/index.ts - CartItemWithProduct
export type CartItemWithProduct = {
  productId: string
  productName: string
  seriesName: string
  imageUrl: string | null
  quantity: number
  price: number | null      // 當前用戶等級價格
  retailPrice: number | null // 🆕 零售價格（原價顯示用）
  subtotal: number
  series_id?: string
}
```

- [ ] **Step 2: 更新 getCartItemsWithPrices 回傳 retailPrice**

在 `lib/actions/cart.ts` 的 `getCartItemsWithPrices` 函數中，確保查詢回傳 `retail_price` 並映射到 `CartItemWithProduct.retailPrice`。找到映射 CartItemWithProduct 的位置，加入：

```typescript
retailPrice: product.retail_price ?? null,
```

- [ ] **Step 3: 建立 order-calculator.ts**

```typescript
// lib/pricing/order-calculator.ts

/**
 * 統一訂單金額計算模組
 *
 * 所有金額計算的唯一來源，前後端共用。
 * 規則：
 * - 原價 = 零售價（retail_price）
 * - 優惠券折扣基數 = 僅普通商品等級價
 * - 組合優惠與優惠券完全獨立
 * - 運費基數 = 普通商品等級價 + 組合優惠折後價
 * - 全部使用 Math.round() 整數精度
 */

export interface RegularItemInput {
  retailPrice: number
  tierPrice: number
  quantity: number
  seriesId?: string
}

export interface ComboDealInput {
  name: string
  retailTotal: number      // 組合內商品零售價合計
  originalPrice: number    // 等級價合計
  discountedPrice: number  // 折後價
  discountAmount: number   // 折扣金額
}

export interface CouponInput {
  code: string
  discountType: 'fixed' | 'percentage'
  discountValue: number
  minOrderAmount?: number | null
  seriesRestrictions?: string[]
}

export interface OrderCalculationResult {
  retailTotal: number
  memberDiscount: number
  comboDiscount: number
  couponDiscount: number
  couponEligibleAmount: number
  shippingSubtotal: number
  discountDetails: DiscountDetail[]
}

export interface DiscountDetail {
  label: string
  amount: number
  type: 'combo' | 'coupon'
}

/**
 * 計算訂單所有金額
 */
export function calculateOrderAmounts(input: {
  regularItems: RegularItemInput[]
  comboDeals: ComboDealInput[]
  coupon?: CouponInput | null
}): OrderCalculationResult {
  const { regularItems, comboDeals, coupon } = input

  // 1. 普通商品
  const regularRetailTotal = regularItems.reduce(
    (sum, item) => sum + item.retailPrice * item.quantity, 0
  )
  const regularTierTotal = regularItems.reduce(
    (sum, item) => sum + item.tierPrice * item.quantity, 0
  )

  // 2. 組合優惠
  const comboRetailTotal = comboDeals.reduce(
    (sum, deal) => sum + deal.retailTotal, 0
  )
  const comboOriginalTotal = comboDeals.reduce(
    (sum, deal) => sum + deal.originalPrice, 0
  )
  const comboDiscountedTotal = comboDeals.reduce(
    (sum, deal) => sum + deal.discountedPrice, 0
  )
  const comboDiscountTotal = comboDeals.reduce(
    (sum, deal) => sum + deal.discountAmount, 0
  )

  // 3. 彙總
  const retailTotal = Math.round(regularRetailTotal + comboRetailTotal)
  const memberDiscount = Math.round(
    (regularRetailTotal - regularTierTotal) + (comboRetailTotal - comboOriginalTotal)
  )

  // 4. 優惠券（僅普通商品）
  let couponEligibleAmount = regularTierTotal
  if (coupon?.seriesRestrictions && coupon.seriesRestrictions.length > 0) {
    couponEligibleAmount = regularItems
      .filter(item => item.seriesId && coupon.seriesRestrictions!.includes(item.seriesId))
      .reduce((sum, item) => sum + item.tierPrice * item.quantity, 0)
  }
  couponEligibleAmount = Math.round(couponEligibleAmount)

  let couponDiscount = 0
  if (coupon && couponEligibleAmount > 0) {
    if (coupon.minOrderAmount && couponEligibleAmount < coupon.minOrderAmount) {
      couponDiscount = 0
    } else if (coupon.discountType === 'fixed') {
      couponDiscount = Math.min(coupon.discountValue, couponEligibleAmount)
    } else if (coupon.discountType === 'percentage') {
      couponDiscount = Math.round(couponEligibleAmount * coupon.discountValue / 100)
    }
    couponDiscount = Math.max(0, Math.min(couponDiscount, couponEligibleAmount))
  }

  // 5. 運費基數
  const shippingSubtotal = Math.round(regularTierTotal + comboDiscountedTotal)

  // 6. 折扣明細
  const discountDetails: DiscountDetail[] = []
  for (const deal of comboDeals) {
    if (deal.discountAmount > 0) {
      discountDetails.push({
        label: `🔥 ${deal.name}`,
        amount: Math.round(deal.discountAmount),
        type: 'combo',
      })
    }
  }
  if (coupon && couponDiscount > 0) {
    discountDetails.push({
      label: `🏷️ ${coupon.code}`,
      amount: couponDiscount,
      type: 'coupon',
    })
  }

  return {
    retailTotal,
    memberDiscount: Math.round(memberDiscount),
    comboDiscount: Math.round(comboDiscountTotal),
    couponDiscount,
    couponEligibleAmount,
    shippingSubtotal,
    discountDetails,
  }
}

/**
 * 計算最終訂單金額（含運費）
 */
export function calculateGrandTotal(
  result: OrderCalculationResult,
  shippingFee: number
): number {
  return result.retailTotal - result.memberDiscount - result.comboDiscount - result.couponDiscount + shippingFee
}
```

- [ ] **Step 4: 驗證 build 通過**

Run: `pnpm type-check`
Expected: PASS（新檔案尚未被引用，不應報錯）

- [ ] **Step 5: Commit**

```bash
git add lib/pricing/order-calculator.ts types/index.ts lib/actions/cart.ts
git commit -m "feat: 新增統一價格計算模組 order-calculator"
```

---

### Task 2: 清理死碼與統一精度

**Files:**
- Modify: `lib/pricing/combo-deals.ts:109-113,126-152,192-216,227-245`
- Modify: `lib/utils/coupon-helpers.ts:51,110-112`

- [ ] **Step 1: 移除 combo-deals.ts 中的死碼**

從 `lib/pricing/combo-deals.ts` 中移除以下函數：
- `calculateEachModePricing()` (行 126-136)
- `calculateMixMatchModePricing()` (行 142-152)
- `applyCouponToComboDealprice()` (行 201-216)
- `validatePricing()` (行 227-245) — 未被外部使用

保留：`calculateComboDealPrice()`、`applyDiscount()`、`formatDiscountLabel()`、`formatPrice()`

- [ ] **Step 2: 確認移除的函數沒有外部引用**

搜尋整個專案確認：
```bash
grep -r "calculateEachModePricing\|calculateMixMatchModePricing\|applyCouponToComboDealprice\|validatePricing" --include="*.ts" --include="*.tsx" lib/ components/ app/ stores/
```
Expected: 無結果（或僅 combo-deals.ts 內部）

- [ ] **Step 3: 統一 combo-deals.ts 精度為整數**

`lib/pricing/combo-deals.ts` 行 109-113 已經使用 `Math.round()` 整數，確認無需變更。

- [ ] **Step 4: 統一 coupon-helpers.ts 精度為整數**

在 `lib/utils/coupon-helpers.ts` 中，修改行 110-112：

```typescript
// 修改前
discountAmount: Math.round(discountAmount * 100) / 100,
originalAmount: Math.round(eligibleAmount * 100) / 100,
finalAmount: Math.round((eligibleAmount - discountAmount) * 100) / 100,

// 修改後
discountAmount: Math.round(discountAmount),
originalAmount: Math.round(eligibleAmount),
finalAmount: Math.round(eligibleAmount - discountAmount),
```

- [ ] **Step 5: 移除 coupon-helpers.ts 的 comboDealsTotal 參數**

在 `lib/utils/coupon-helpers.ts` 中：

1. 移除 `calculateCouponDiscount` 的 `comboDealsTotal` 參數（行 51）
2. 移除計算中加入 `comboDealsTotal` 的邏輯（行 76-83 中的 `+ comboDealsTotal`）
3. 移除 `validateCouponConditions` 的 `comboDealsTotal` 參數（行 142）

修改後的適用金額計算（行 67-84）：

```typescript
// 2. 計算適用商品總額（僅普通商品）
let eligibleAmount = 0

if (coupon.series_restrictions && coupon.series_restrictions.length > 0) {
  // 有系列限制：僅計算限定系列商品
  eligibleAmount = cartItems
    .filter((item) => coupon.series_restrictions!.includes(item.series_id))
    .reduce((sum, item) => sum + item.price * item.quantity, 0)
} else {
  // 無系列限制：計算全部普通商品（不含組合優惠）
  eligibleAmount = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
}
```

- [ ] **Step 6: 驗證 build 通過**

Run: `pnpm type-check`
Expected: 可能有編譯錯誤（呼叫端仍傳 comboDealsTotal），在 Task 3 修復

- [ ] **Step 7: Commit**

```bash
git add lib/pricing/combo-deals.ts lib/utils/coupon-helpers.ts
git commit -m "refactor: 清理死碼並統一金額精度為整數"
```

---

### Task 3: 重構 coupons.ts — 移除組合優惠互動邏輯

**Files:**
- Modify: `lib/actions/coupons.ts:48-101,163,211-244,285,317-321,356,372-376,478-479,535-563,912-950`

- [ ] **Step 1: 移除 checkCouponComboRestrictions 函數**

刪除 `lib/actions/coupons.ts` 行 48-101 的 `checkCouponComboRestrictions` 函數。

- [ ] **Step 2: 移除 createCoupon 中的組合優惠限制建立邏輯**

刪除行 211-244 的組合優惠限制建立區塊（`// 7. 🆕 Feature 021: 建立組合優惠限制` 整段）。

同時移除行 163 的 `exclude_combo_deals` 欄位寫入：
```typescript
// 移除這行
exclude_combo_deals: data.exclude_combo_deals,
```

- [ ] **Step 3: 移除 getCoupons / getCouponById 中的組合優惠限制查詢**

找到 `getCoupons` 和 `getCouponById` 函數中的 `.select()` 查詢，移除 `combo_restrictions:coupon_combo_restrictions(combo_deal_id)` 部分。

同時移除回傳資料中的 `combo_restrictions` 和 `combo_apply_all` 映射：
```typescript
// 移除這些行
combo_restrictions: coupon.combo_restrictions?.filter(...)...
combo_apply_all: coupon.combo_restrictions?.some(...)...
```

- [ ] **Step 4: 移除 updateCoupon 中的組合優惠限制更新邏輯**

1. 移除行 478-479 的 `exclude_combo_deals` 更新
2. 刪除行 535-563 的組合優惠限制更新區塊

- [ ] **Step 5: 簡化 validateCoupon 函數**

修改 `validateCoupon` 函數（行 845-975）：

1. 移除行 912-922 的 `exclude_combo_deals` 檢查
2. 移除行 924-938 的 `checkCouponComboRestrictions` 呼叫
3. 移除行 946-950 的 `comboDealsTotal` 計算
4. 移除傳給 `calculateCouponDiscount` 的 `comboDealsTotal` 參數（行 961）

修改後的 validateCoupon 計算部分：

```typescript
// 7. 轉換關聯資料為 ID 陣列
const tierRestrictions =
  coupon.tier_restrictions?.map((r: any) => r.tier_id) || []
const seriesRestrictions =
  coupon.series_restrictions?.map((r: any) => r.series_id) || []

// 8. 計算折扣（僅普通商品）
const result = calculateCouponDiscount({
  coupon: {
    ...coupon,
    tier_restrictions: tierRestrictions,
    series_restrictions: seriesRestrictions,
  },
  cartItems: data.cartItems as CartItemForCoupon[],
  userTierId: tierId,
})

return {
  success: true,
  data: {
    ...result,
    availableUserCouponId: userCoupons[0].id,
  },
}
```

- [ ] **Step 6: 移除 validateCoupon 的 comboDeals 輸入參數**

在 validateCoupon 的 Zod schema 驗證中，移除 `comboDeals` 欄位（如果有）。同時更新所有呼叫端（CartContent.tsx 行 145-153, CouponSelector.tsx 行 49-57），不再傳入 `comboDeals`。

- [ ] **Step 7: 驗證 build 通過**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add lib/actions/coupons.ts
git commit -m "refactor: 移除優惠券與組合優惠的互動邏輯，兩者完全獨立"
```

---

### Task 4: 重構 orders.ts — 使用統一計算模組

**Files:**
- Modify: `lib/actions/orders.ts:157-204,341-356,371-392`

- [ ] **Step 1: 重構 createOrder 的價格計算**

在 `lib/actions/orders.ts` 的 `createOrder` 函數中，匯入並使用統一計算模組。

在計算訂單商品時（行 169-204），同時收集 `retail_price`：

```typescript
import { calculateOrderAmounts, calculateGrandTotal } from '@/lib/pricing/order-calculator'
import type { RegularItemInput, ComboDealInput } from '@/lib/pricing/order-calculator'
```

在商品迴圈中（行 169-204），新增收集 `regularItemInputs`：

```typescript
const regularItemInputs: RegularItemInput[] = []

for (const item of items) {
  // ... 現有的商品查詢和價格計算邏輯 ...

  regularItemInputs.push({
    retailPrice: product.retail_price ?? price,
    tierPrice: price,
    quantity: item.quantity,
    seriesId: (product as any).series_id || undefined,
  })
}
```

- [ ] **Step 2: 替換內聯優惠券計算**

刪除行 341-356 的內聯優惠券折扣計算，改用統一計算模組：

```typescript
// 5. 使用統一計算模組計算優惠券折扣
const comboDealInputs: ComboDealInput[] = comboDealSnapshotsData.map(d => ({
  name: '', // 訂單建立不需要名稱
  retailTotal: 0, // 訂單建立不需要零售價
  originalPrice: d.originalPrice,
  discountedPrice: d.discountedPrice,
  discountAmount: d.discountAmount,
}))

let couponDiscountAmount = 0
if (couponData) {
  const calcResult = calculateOrderAmounts({
    regularItems: regularItemInputs,
    comboDeals: comboDealInputs,
    coupon: {
      code: couponData.code,
      discountType: couponData.discount_type,
      discountValue: couponData.discount_value,
      minOrderAmount: couponData.min_order_amount,
      seriesRestrictions: couponData.series_restrictions || [],
    },
  })
  couponDiscountAmount = calcResult.couponDiscount
  couponData.discount_amount = couponDiscountAmount
}
```

- [ ] **Step 3: 修正運費計算基數**

行 371-378 的運費計算不需要變更（已正確使用 `totalAmount + comboDealTotalAmount`）。

確認最終金額計算（行 389-392）使用 `couponData.discount_amount`（已透過統一模組計算）。

- [ ] **Step 4: 驗證 build 通過**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/actions/orders.ts
git commit -m "fix: 訂單建立改用統一計算模組，修復優惠券折扣不一致 bug"
```

---

### Task 5: 重構 CartContent.tsx — 使用統一計算模組

**Files:**
- Modify: `components/shop/CartContent.tsx:184-195,296-308`

- [ ] **Step 1: 引入統一計算模組並重構金額計算**

替換 `CartContent.tsx` 行 184-195 的金額計算邏輯：

```typescript
import { calculateOrderAmounts } from '@/lib/pricing/order-calculator'
import type { RegularItemInput, ComboDealInput } from '@/lib/pricing/order-calculator'

// ... 在 component 內 ...

// 使用統一計算模組
const orderCalcResult = useMemo(() => {
  const regularItems: RegularItemInput[] = cartItemsWithPrices.map(item => ({
    retailPrice: item.retailPrice ?? item.price ?? 0,
    tierPrice: item.price ?? 0,
    quantity: item.quantity,
    seriesId: item.series_id,
  }))

  const comboDealInputs: ComboDealInput[] = comboDeals.map(deal => {
    // 計算組合內的零售價合計
    const retailTotal = deal.selected_products.reduce((sum, product) => {
      const detail = comboDealProductDetails.get(product.product_id)
      return sum + (detail?.retail_price || detail?.unit_price || 0) * product.quantity
    }, 0)

    return {
      name: deal.combo_deal_name,
      retailTotal,
      originalPrice: deal.original_price,
      discountedPrice: deal.discounted_price,
      discountAmount: deal.discount_amount,
    }
  })

  return calculateOrderAmounts({
    regularItems,
    comboDeals: comboDealInputs,
    coupon: appliedCoupon ? {
      code: appliedCoupon.code_normalized,
      discountType: appliedCoupon.discount_type,
      discountValue: appliedCoupon.discount_value,
      minOrderAmount: appliedCoupon.min_order_amount,
      seriesRestrictions: [], // 前端不處理系列限制，由後端驗證
    } : null,
  })
}, [cartItemsWithPrices, comboDeals, comboDealProductDetails, appliedCoupon])

// 保留原有的 totalItems 計算
const normalItemsCount = getTotalItems()
const comboDealItemsCount = comboDeals.reduce(
  (sum, item) => sum + item.selected_products.reduce((s, p) => s + p.quantity, 0),
  0
)
const totalItems = normalItemsCount + comboDealItemsCount
const isEmpty = items.length === 0 && comboDeals.length === 0
```

- [ ] **Step 2: 更新 CartSummary props**

修改傳給 CartSummary 的 props（行 296-308）：

```tsx
<CartSummary
  orderCalcResult={orderCalcResult}
  totalItems={totalItems}
  isEmpty={isEmpty}
  couponDiscount={couponDiscount}
  couponCode={appliedCoupon?.code_normalized}
  comboDeals={comboDeals}
  onOpenCouponSelector={() => setShowCouponSelector(true)}
  hasRegularItems={cartItemsWithPrices.length > 0}
/>
```

- [ ] **Step 3: 調整組合優惠渲染順序（普通商品在上，組合優惠在下）**

根據設計，購物車排列順序改為普通商品先、組合優惠後。修改行 281-293：

```tsx
{/* 一般商品項目（先渲染，在上方） */}
{cartItemsWithPrices.map((item) => (
  <CartItem key={item.productId} item={item} />
))}

{/* 組合優惠項目 */}
{comboDeals.map((item) => (
  <ComboDealCartItem
    key={item.id}
    item={item}
    productDetails={comboDealProductDetails}
  />
))}
```

- [ ] **Step 4: Commit**

```bash
git add components/shop/CartContent.tsx
git commit -m "refactor: CartContent 改用統一計算模組"
```

---

### Task 6: 重構 cart-summary.tsx — 折扣加總+展開明細

**Files:**
- Modify: `components/shop/cart-summary.tsx` (整體重構)

- [ ] **Step 1: 更新 CartSummary props 介面**

```typescript
import { useState } from 'react'
import type { OrderCalculationResult } from '@/lib/pricing/order-calculator'
import { calculateGrandTotal } from '@/lib/pricing/order-calculator'
import { ChevronDown } from 'lucide-react'

interface CartSummaryProps {
  orderCalcResult: OrderCalculationResult
  totalItems: number
  isEmpty: boolean
  couponDiscount?: number
  couponCode?: string
  comboDeals?: ComboDealCartItem[]
  onOpenCouponSelector?: () => void
  hasRegularItems?: boolean
}
```

- [ ] **Step 2: 重寫金額顯示邏輯**

移除所有內部計算邏輯（行 57-75, 148-152），改用 `orderCalcResult`。新增折扣展開/收合狀態：

```typescript
export function CartSummary({
  orderCalcResult,
  totalItems,
  isEmpty,
  couponDiscount = 0,
  couponCode,
  comboDeals = [],
  onOpenCouponSelector,
  hasRegularItems = true,
}: CartSummaryProps) {
  const [shippingFee, setShippingFee] = useState<number | null>(null)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | null>(null)
  const [isLoadingShipping, setIsLoadingShipping] = useState(true)
  const [discountExpanded, setDiscountExpanded] = useState(false)

  const {
    retailTotal,
    memberDiscount,
    comboDiscount,
    couponDiscount: calcCouponDiscount,
    shippingSubtotal,
    discountDetails,
  } = orderCalcResult

  const totalPromoDiscount = comboDiscount + calcCouponDiscount
  const hasMultipleDiscounts = discountDetails.length > 1
  const canExpand = totalPromoDiscount > 0 && hasMultipleDiscounts

  const finalAmount = calculateGrandTotal(orderCalcResult, shippingFee ?? 0)
```

- [ ] **Step 3: 修正運費 useEffect 基數**

修改 `useEffect` 中的運費計算（行 96-98），使用 `shippingSubtotal`：

```typescript
useEffect(() => {
  async function fetchShippingFee() {
    // ... 現有的 auth 邏輯 ...
    const [shippingResult, profileResult] = await Promise.all([
      supabase.rpc('calculate_shipping_fee', {
        p_user_id: user.id,
        p_subtotal: shippingSubtotal, // 🔧 修正：使用普通等級價 + 組合折後價
      }),
      // ... 現有的 profile 查詢 ...
    ])
    // ... 現有的錯誤處理 ...
  }

  if (!isEmpty) {
    fetchShippingFee()
  } else {
    setShippingFee(0)
    setFreeShippingThreshold(null)
    setIsLoadingShipping(false)
  }
}, [shippingSubtotal, isEmpty])
```

免運差額計算也改用 `shippingSubtotal`：
```typescript
const freeShippingGap = calculateFreeShippingGap(shippingSubtotal, freeShippingThreshold)
```

- [ ] **Step 4: 重寫價格摘要 JSX**

替換金額顯示區塊為新的折扣展開明細設計：

```tsx
<div className="space-y-4">
  {/* 總數量 */}
  <div className="flex items-center justify-between border-b pb-4">
    <span className="text-text-secondary">商品總數</span>
    <span className="text-xl font-bold">{totalItems} 件</span>
  </div>

  {/* 商品金額（零售價） */}
  <div className="flex items-center justify-between pb-2">
    <span className="text-text-secondary">商品金額</span>
    <span className="text-lg font-bold">
      NT$ {retailTotal.toLocaleString()}
    </span>
  </div>

  {/* 會員專屬折扣 */}
  {memberDiscount > 0 && (
    <div className="flex items-center justify-between pb-2">
      <span className="text-sm text-blue-600 font-bold">
        會員專屬折扣
      </span>
      <span className="text-lg font-bold text-blue-600">
        - NT$ {memberDiscount.toLocaleString()}
      </span>
    </div>
  )}

  {/* 優惠折扣（加總 + 展開明細） */}
  {totalPromoDiscount > 0 && (
    <div className="pb-2">
      <div
        className={`flex justify-between items-center ${canExpand ? 'cursor-pointer' : ''}`}
        onClick={canExpand ? () => setDiscountExpanded(!discountExpanded) : undefined}
      >
        <span className="text-sm text-red-500 font-bold flex items-center gap-1">
          優惠折扣
          {canExpand && (
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                discountExpanded ? 'rotate-180' : ''
              }`}
            />
          )}
        </span>
        <span className="text-lg font-bold text-red-500">
          - NT$ {totalPromoDiscount.toLocaleString()}
        </span>
      </div>

      {/* 折扣明細展開區 */}
      {discountExpanded && discountDetails.length > 0 && (
        <div className="pl-3 mt-2 space-y-1 border-l-2 border-red-200">
          {discountDetails.map((d, i) => (
            <div key={i} className="flex justify-between items-center">
              <span className="text-xs text-text-secondary">
                {d.label}
              </span>
              <span className="text-xs text-red-400">
                - NT$ {d.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 單一折扣直接顯示 label */}
      {!canExpand && discountDetails.length === 1 && (
        <div className="pl-3 mt-1 border-l-2 border-red-200">
          <span className="text-xs text-text-secondary">
            {discountDetails[0].label}
          </span>
        </div>
      )}
    </div>
  )}

  {/* 運費 */}
  <div className="flex items-center justify-between pb-2">
    <span className="text-text-secondary flex items-center gap-1">
      <Truck className="w-4 h-4" />
      運費
    </span>
    <span
      className={`text-lg font-bold ${getShippingFeeColorClass(
        isLoadingShipping,
        shippingFee
      )}`}
    >
      {getShippingFeeStatusText(isLoadingShipping, shippingFee)}
    </span>
  </div>

  {/* 免運提示 */}
  {freeShippingMessage && shippingFee !== null && shippingFee > 0 && (
    <div className="rounded-theme-sm border border-orange-500 bg-orange-50 dark:bg-orange-950 px-3 py-2">
      <p className="text-sm text-orange-700 dark:text-orange-300">
        <strong>{freeShippingMessage}</strong>
      </p>
    </div>
  )}

  {/* 優惠券按鈕 */}
  {!isEmpty && onOpenCouponSelector && (
    hasRegularItems ? (
      <button
        onClick={onOpenCouponSelector}
        className="w-full rounded-theme-sm border bg-orange-50 dark:bg-orange-950
                   hover:bg-orange-100 dark:hover:bg-orange-900 px-4 py-3 text-sm font-bold
                   transition-colors flex items-center justify-center gap-2"
      >
        <Ticket className="w-4 h-4" />
        {couponDiscount > 0 ? '更換優惠券' : '選擇優惠券'}
      </button>
    ) : (
      <div className="w-full rounded-theme-sm border bg-gray-100 dark:bg-gray-800
                      px-4 py-3 text-sm opacity-60">
        <div className="flex items-center justify-center gap-2 font-bold text-text-secondary">
          <Ticket className="w-4 h-4" />
          選擇優惠券
        </div>
        <p className="text-xs text-center text-text-secondary mt-1">
          購物車內無適用商品（組合優惠不列入計算）
        </p>
      </div>
    )
  )}

  {/* 最終總金額 */}
  <div className="flex items-center justify-between border-t pt-4">
    <span className="text-text-secondary font-bold">總金額</span>
    <span className="text-2xl font-bold text-success">
      NT$ {finalAmount.toLocaleString()}
    </span>
  </div>

  {/* 結帳按鈕等（保持不變） */}
</div>
```

- [ ] **Step 5: 移除不再需要的 props**

移除 `comboDealProductDetails` prop（不再需要在 CartSummary 內部計算會員折扣，由 `orderCalcResult` 提供）。

- [ ] **Step 6: 驗證 build 通過**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add components/shop/cart-summary.tsx
git commit -m "feat: 購物車摘要改用統一計算模組，新增折扣展開明細"
```

---

### Task 7: 優化組合優惠購物車顯示

**Files:**
- Modify: `components/shop/combo-deals/ComboDealCartItem.tsx` (整體改版)

- [ ] **Step 1: 改版 ComboDealCartItem 為 amber 容器設計**

替換整個元件的 JSX 結構：

```tsx
export function ComboDealCartItem({ item, productDetails }: ComboDealCartItemProps) {
  const removeComboDeal = useCartStore((state) => state.removeComboDeal)
  const confirm = useConfirm()
  const alert = useAlert()

  async function handleDelete() {
    const confirmed = await confirm({
      title: '確認刪除',
      description: `確定要從購物車移除「${item.combo_deal_name}」？`,
      variant: 'danger',
    })

    if (confirmed) {
      removeComboDeal(item.id)
      await alert({
        title: '已刪除',
        message: '組合優惠已從購物車移除',
        variant: 'success',
      })
    }
  }

  // 計算零售價合計（原價顯示用）
  const retailTotal = item.selected_products.reduce((sum, product) => {
    const detail = productDetails?.get(product.product_id)
    return sum + (detail?.retail_price || detail?.unit_price || 0) * product.quantity
  }, 0)

  // 總省下金額（零售價 - 折後價）
  const totalSavings = retailTotal - item.discounted_price

  return (
    <div className="border-2 border-amber-200 bg-amber-50/30 dark:bg-amber-950/20 rounded-xl overflow-hidden">
      {/* 標題列 */}
      <div className="flex items-center justify-between gap-2 bg-amber-50 dark:bg-amber-900/30 px-4 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg flex-shrink-0">🔥</span>
          <span className="font-bold text-amber-900 dark:text-amber-100 truncate">
            {item.combo_deal_name}
          </span>
          {totalSavings > 0 && (
            <span className="text-sm font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
              已省 NT$ {totalSavings.toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/store/combo-deals/${item.combo_deal_id}?edit=true&cart_item_id=${item.id}`}
            className={cn(
              'flex items-center gap-1 rounded-theme-sm bg-blue-400 font-bold transition-all',
              designTokens.cleanCommerce.border.full,
              'border-border shadow-neo-sm',
              'hover:-translate-y-0.5 hover:shadow-theme-hover',
              'px-3 py-2 text-sm min-h-[44px]'
            )}
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden sm:inline">編輯</span>
          </Link>

          <button
            onClick={handleDelete}
            className="flex items-center gap-1 rounded-theme-sm text-red-500 font-bold
                       text-sm px-3 py-2 min-h-[44px] hover:bg-red-50 dark:hover:bg-red-950
                       transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">移除整組</span>
          </button>
        </div>
      </div>

      {/* 商品列表 */}
      <div className="p-3 space-y-2">
        {item.selected_products.map((product, index) => {
          const detail = productDetails?.get(product.product_id)
          return (
            <div
              key={`${product.product_id}-${index}`}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <div className="flex-1 min-w-0">
                {detail?.series_name && (
                  <span className="inline-block rounded bg-amber-100 dark:bg-amber-800 border border-amber-300
                                   px-1.5 py-0.5 mr-1.5 text-xs font-bold text-amber-800 dark:text-amber-200">
                    {detail.series_name}
                  </span>
                )}
                <span className="text-foreground">
                  {detail?.product_name || product.product_id}
                </span>
              </div>
              <span className="text-text-secondary whitespace-nowrap">
                NT$ {(detail?.retail_price || detail?.unit_price || 0).toLocaleString()} × {product.quantity}
              </span>
            </div>
          )
        })}
      </div>

      {/* 小計 */}
      <div className="border-t border-amber-200 px-4 py-2 flex items-center justify-between">
        <span className="text-sm text-text-secondary">小計</span>
        <div className="flex items-center gap-2">
          {retailTotal !== item.discounted_price && (
            <span className="text-sm text-text-secondary line-through">
              NT$ {retailTotal.toLocaleString()}
            </span>
          )}
          <span className="text-lg font-bold text-success">
            NT$ {item.discounted_price.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 驗證 build 通過**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/shop/combo-deals/ComboDealCartItem.tsx
git commit -m "feat: 組合優惠購物車改版為 amber 容器設計，顯示零售原價與已省金額"
```

---

### Task 8: 優惠券選擇器提示與反灰狀態

**Files:**
- Modify: `components/shop/coupons/CouponSelector.tsx:209-271`

- [ ] **Step 1: 在優惠券卡片加入提示文字**

在每張優惠券卡片（行 209-271）的底部加入提示。修改 JSX：

在 `coupon.min_order_amount` 顯示之後（行 239 之後），加入：

```tsx
{/* 組合優惠排除提示 */}
<div className="text-xs text-text-secondary mt-1 flex items-center gap-1">
  <Info className="w-3 h-3 flex-shrink-0" />
  僅適用於一般商品，組合優惠不列入計算
</div>
```

匯入 `Info` 圖示：
```typescript
import { X, Info } from 'lucide-react'
```

- [ ] **Step 2: 不可用優惠券顯示未達門檻的具體金額**

在 `validation && !validation.valid` 區塊（行 229-233），增強錯誤訊息。在 CouponSelector 的 props 中新增 `regularItemsTotal`：

```typescript
interface CouponSelectorProps {
  cartItems: (BaseCartItem & { price: number; series_id?: string })[]
  regularItemsTotal: number  // 🆕 普通商品等級價合計
  onClose?: () => void
}
```

然後在 CartContent.tsx 傳入：
```tsx
<CouponSelector
  cartItems={...}
  regularItemsTotal={cartItemsWithPrices.reduce((sum, item) => sum + item.subtotal, 0)}
  onClose={() => setShowCouponSelector(false)}
/>
```

- [ ] **Step 3: 驗證 build 通過**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/shop/coupons/CouponSelector.tsx components/shop/CartContent.tsx
git commit -m "feat: 優惠券選擇器新增組合優惠排除提示與反灰狀態"
```

---

### Task 9: 更新結帳頁面 CheckoutContent.tsx

**Files:**
- Modify: `components/shop/CheckoutContent.tsx:84-429`

- [ ] **Step 1: 引入統一計算模組**

替換行 84-91 的金額計算邏輯，改用 `calculateOrderAmounts`（與 CartContent.tsx 相同模式）：

```typescript
import { calculateOrderAmounts, calculateGrandTotal } from '@/lib/pricing/order-calculator'
import type { RegularItemInput, ComboDealInput } from '@/lib/pricing/order-calculator'

// ... 在 component 內 ...

const orderCalcResult = useMemo(() => {
  const regularItems: RegularItemInput[] = cartItemsWithPrices.map(item => ({
    retailPrice: item.retailPrice ?? item.price ?? 0,
    tierPrice: item.price ?? 0,
    quantity: item.quantity,
    seriesId: item.series_id,
  }))

  const comboDealInputs: ComboDealInput[] = comboDeals.map(deal => {
    const retailTotal = deal.selected_products.reduce((sum, product) => {
      const detail = comboDealProductDetails.get(product.product_id)
      return sum + (detail?.retail_price || detail?.unit_price || 0) * product.quantity
    }, 0)

    return {
      name: deal.combo_deal_name,
      retailTotal,
      originalPrice: deal.original_price,
      discountedPrice: deal.discounted_price,
      discountAmount: deal.discount_amount,
    }
  })

  return calculateOrderAmounts({
    regularItems,
    comboDeals: comboDealInputs,
    coupon: appliedCoupon ? {
      code: appliedCoupon.code_normalized,
      discountType: appliedCoupon.discount_type,
      discountValue: appliedCoupon.discount_value,
      minOrderAmount: appliedCoupon.min_order_amount,
    } : null,
  })
}, [cartItemsWithPrices, comboDeals, comboDealProductDetails, appliedCoupon])

const finalAmount = calculateGrandTotal(orderCalcResult, 0) // 結帳頁運費另計
const totalItems = getTotalItems()
const isEmpty = items.length === 0 && comboDeals.length === 0
```

- [ ] **Step 2: 更新金額顯示區塊**

替換行 349-430 的「總計」區塊，改用與 cart-summary 一致的折扣展開明細模式：

```tsx
{/* 總計 */}
<div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-black">
  <div className="space-y-2">
    {/* 商品金額（零售價） */}
    <div className="flex items-center justify-between">
      <p className={designTokens.typography.body.base}>商品金額</p>
      <p className="text-base font-semibold">
        NT$ {orderCalcResult.retailTotal.toLocaleString()}
      </p>
    </div>

    {/* 會員專屬折扣 */}
    {orderCalcResult.memberDiscount > 0 && (
      <div className="flex items-center justify-between text-blue-600">
        <p className={designTokens.typography.body.base}>會員專屬折扣</p>
        <p className="text-base font-bold">
          - NT$ {orderCalcResult.memberDiscount.toLocaleString()}
        </p>
      </div>
    )}

    {/* 優惠折扣 */}
    {(orderCalcResult.comboDiscount + orderCalcResult.couponDiscount) > 0 && (
      <div>
        <div className="flex items-center justify-between text-red-500">
          <p className={cn(designTokens.typography.body.base, "font-bold")}>優惠折扣</p>
          <p className="text-base font-bold">
            - NT$ {(orderCalcResult.comboDiscount + orderCalcResult.couponDiscount).toLocaleString()}
          </p>
        </div>
        <div className="pl-3 mt-1 space-y-1 border-l-2 border-red-200">
          {orderCalcResult.discountDetails.map((d, i) => (
            <div key={i} className="flex justify-between items-center">
              <span className="text-xs text-text-secondary">{d.label}</span>
              <span className="text-xs text-red-400">- NT$ {d.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* 運費提示 */}
    <div className="flex items-center justify-between text-text-secondary text-sm pt-2 border-t border-gray-200">
      <p>運費</p>
      <p>（訂單送出後計算）</p>
    </div>

    {/* 最終總額 */}
    <div className="flex items-center justify-between pt-2 border-t-2 border-gray-300">
      <p className={designTokens.typography.h3}>訂單總金額</p>
      <p className="text-2xl md:text-3xl font-bold text-success">
        NT$ {finalAmount.toLocaleString()}
      </p>
    </div>
  </div>
</div>
```

- [ ] **Step 3: 更新組合優惠區塊使用零售價**

在行 249-312 的組合優惠項目顯示中，將「原價」改為零售價：

```tsx
{/* 價格資訊 */}
<div className="border-t-2 border-yellow-300 pt-2 ml-7 space-y-1 text-sm">
  <div className="flex justify-between text-text-secondary">
    <span>零售價</span>
    <span className="line-through">
      NT$ {(() => {
        const retailTotal = deal.selected_products.reduce((sum, product) => {
          const detail = comboDealProductDetails.get(product.product_id)
          return sum + (detail?.retail_price || detail?.unit_price || 0) * product.quantity
        }, 0)
        return retailTotal.toLocaleString()
      })()}
    </span>
  </div>
  <div className="flex justify-between text-success font-semibold">
    <span>組合優惠價</span>
    <span className="text-lg">NT$ {deal.discounted_price.toLocaleString()}</span>
  </div>
</div>
```

- [ ] **Step 4: 驗證 build 通過**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/shop/CheckoutContent.tsx
git commit -m "feat: 結帳頁面改用統一計算模組，統一零售原價與折扣展開顯示"
```

---

### Task 10: 移除管理員優惠券表單的組合優惠限制區塊

**Files:**
- Modify: `components/admin/coupons/CouponForm.tsx:82-95,188-190,549-657`

- [ ] **Step 1: 移除組合優惠限制相關 state**

刪除行 82-95 的 `comboRestrictionMode` 和 `selectedComboDeals` state。

- [ ] **Step 2: 移除表單提交中的組合優惠欄位**

刪除行 188-190 的：
```typescript
exclude_combo_deals: comboRestrictionMode === 'exclude',
combo_apply_all: comboRestrictionMode === 'all',
combo_restrictions: comboRestrictionMode === 'specific' ? selectedComboDeals : [],
```

- [ ] **Step 3: 移除組合優惠限制 UI 區塊**

刪除行 549-657 整個 `<FormSection variant="warning" title="組合優惠限制（選填）">` 區塊。

- [ ] **Step 4: 清理相關的 imports 和組合優惠資料載入**

移除所有載入組合優惠清單的邏輯（如 `getComboDeals` 呼叫、`comboDeals` state 等）。

- [ ] **Step 5: 驗證 build 通過**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/admin/coupons/CouponForm.tsx
git commit -m "refactor: 移除管理員優惠券表單的組合優惠限制設定區塊"
```

---

### Task 11: 資料庫 Migration

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_remove_coupon_combo_restrictions.sql`

- [ ] **Step 1: 建立 migration 檔案**

```bash
npx supabase migration new remove_coupon_combo_restrictions
```

- [ ] **Step 2: 撰寫 migration SQL**

```sql
-- 移除組合優惠-優惠券限制表
-- 設計決策：優惠券與組合優惠完全獨立，不再需要互動機制
-- 參考：docs/superpowers/specs/2026-03-31-pricing-system-refactor-design.md

-- 1. 移除 RLS 政策（如果存在）
DROP POLICY IF EXISTS "coupon_combo_restrictions_admin_all" ON coupon_combo_restrictions;
DROP POLICY IF EXISTS "coupon_combo_restrictions_select" ON coupon_combo_restrictions;

-- 2. 移除組合優惠限制表
DROP TABLE IF EXISTS coupon_combo_restrictions;

-- 3. 移除 coupons 表的 exclude_combo_deals 欄位
ALTER TABLE coupons DROP COLUMN IF EXISTS exclude_combo_deals;
```

- [ ] **Step 3: Commit（不執行 migration，等使用者逐站操作）**

```bash
git add supabase/migrations/
git commit -m "chore: 新增 migration 移除 coupon_combo_restrictions 表和 exclude_combo_deals 欄位"
```

---

### Task 12: 全面驗證與最終 Build

**Files:** 無新增/修改

- [ ] **Step 1: 型別檢查**

Run: `pnpm type-check`
Expected: PASS（零錯誤）

- [ ] **Step 2: ESLint 檢查**

Run: `pnpm lint`
Expected: PASS 或僅有既有 warning

- [ ] **Step 3: Build 測試**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 4: 重啟 dev server**

```bash
# 先終止現有的 dev server（如果有）
pkill -f "next dev" || true
# 等待程序結束
sleep 2
# 啟動 dev server
pnpm dev
```

- [ ] **Step 5: 手動測試清單**

在 dev server 上逐項驗證：

1. **購物車顯示**：
   - 普通商品顯示正常
   - 組合優惠顯示 amber 容器、🔥 圖示、已省金額、零售原價刪除線
   - 排列順序：普通商品 → 組合優惠

2. **價格摘要**：
   - 商品金額 = 零售價合計
   - 會員專屬折扣 = 藍色，正確金額
   - 優惠折扣 = 紅色加總，可展開明細（多折扣時）
   - 運費正確計算

3. **優惠券**：
   - 每張券卡片有「僅適用於一般商品」提示
   - 純組合優惠訂單：券按鈕反灰 + 提示
   - 混合訂單：券折扣僅計算普通商品

4. **結帳頁面**：
   - 金額顯示與購物車一致
   - 折扣明細顯示正確

5. **建立訂單**：
   - 純普通商品：正確
   - 純組合優惠：正確
   - 混合 + 優惠券：折扣金額正確

- [ ] **Step 6: 最終 Commit（如有微調）**

```bash
git add -A
git commit -m "fix: 修正整合測試發現的問題"
```
