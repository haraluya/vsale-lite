# 代客下單功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在管理後台訂單管理頁面新增「代客下單」功能，透過右側 Sheet 面板讓管理員幫客戶建立訂單，帶入客戶等級價格與優惠。

**Architecture:** 獨立的 `useAdminOrderDraft` hook 管理草稿狀態（React useState），計算邏輯完全複用 `order-calculator`、`coupon-helpers`、`combo-deals` 計算模組。`createOrder` action 加入 `onBehalfOfUserId` 參數，timeline 記錄代客操作。不新增任何 DB 欄位或表。

**Tech Stack:** Next.js 15 App Router, Supabase, Tailwind v4, Radix Sheet, Zod

---

## File Structure

### 新增檔案
- `hooks/use-admin-order-draft.ts` — 代客下單草稿狀態 hook
- `components/admin/orders/admin-order-sheet.tsx` — Sheet 容器 + 步驟控制
- `components/admin/orders/step-customer-select.tsx` — Step 1: 客戶搜尋選擇
- `components/admin/orders/step-product-select.tsx` — Step 2: 商品選擇主容器
- `components/admin/orders/regular-product-picker.tsx` — 普通商品搜尋+系列篩選+加入
- `components/admin/orders/combo-deal-picker.tsx` — 組合優惠選購
- `components/admin/orders/draft-items-summary.tsx` — 已選商品浮動摘要條
- `components/admin/orders/step-checkout.tsx` — Step 3: 確認結帳頁

### 修改檔案
- `lib/validations/order.schema.ts` — createOrderSchema 加入 `onBehalfOfUserId`
- `lib/actions/orders.ts` — `createOrder` 支援代客下單 + `getOrders` 回傳代客標籤
- `lib/actions/clients.ts` — 新增 `searchCustomersForOrder`
- `lib/actions/products.ts` — 新增 `getProductsWithTierPrices`
- `lib/actions/coupons.ts` — 新增 `getCustomerCoupons`
- `app/(admin)/admin/orders/page.tsx` — 加入代客下單按鈕 + Sheet
- `components/admin/orders/smart-order-list.tsx` — 顯示「代客下單」標籤

---

### Task 1: 擴展 createOrder Schema 與 Action

**Files:**
- Modify: `lib/validations/order.schema.ts:19-67`
- Modify: `lib/actions/orders.ts:45-577`

- [ ] **Step 1: 修改 createOrderSchema 加入 onBehalfOfUserId**

在 `lib/validations/order.schema.ts` 的 `createOrderSchema` 中，在 `userCouponId` 之後加入：

```typescript
// 代客下單：目標客戶 ID（管理員專用）
onBehalfOfUserId: z.string().uuid('無效的客戶 ID')
  .optional()
  .nullable(),
```

在檔案底部的型別推導區域，`CreateOrderInput` 已自動從 schema 推導，無需額外改動。

- [ ] **Step 2: 修改 createOrder action 支援代客下單**

在 `lib/actions/orders.ts` 的 `createOrder` function 中，替換目前的權限檢查邏輯（第 49-58 行）：

將：
```typescript
const supabase = await createClient()
const { userId, role, tierId } = await checkAuth()

// 管理員無法建立訂單
if (role === 'admin') {
  return {
    success: false,
    message: '管理員帳號無法建立訂單',
  }
}
```

替換為：
```typescript
const supabase = await createClient()
const { userId: authUserId, role, tierId: authTierId } = await checkAuth()

// 判斷是否為代客下單
const isOnBehalf = !!validated.data.onBehalfOfUserId

if (isOnBehalf) {
  // 代客下單：必須是管理員
  if (role !== 'admin') {
    return {
      success: false,
      message: '只有管理員可以代客下單',
    }
  }
} else {
  // 一般下單：管理員不可下單
  if (role === 'admin') {
    return {
      success: false,
      message: '管理員帳號無法建立訂單',
    }
  }
}

// 決定訂單歸屬的客戶
let userId: string
let tierId: string | undefined

if (isOnBehalf) {
  // 代客下單：查詢目標客戶的等級
  const { data: targetProfile, error: targetError } = await supabase
    .from('profiles')
    .select('id, role, tier_id')
    .eq('id', validated.data.onBehalfOfUserId!)
    .single()

  if (targetError || !targetProfile) {
    return {
      success: false,
      message: '目標客戶不存在',
    }
  }

  if (targetProfile.role !== 'client') {
    return {
      success: false,
      message: '只能為客戶身份的使用者代客下單',
    }
  }

  userId = targetProfile.id
  tierId = targetProfile.tier_id || undefined
} else {
  userId = authUserId
  tierId = authTierId
}
```

注意：將 validated 的位置提前，移到權限檢查之前（因為需要讀取 `onBehalfOfUserId`）。原本第 61-70 行的驗證邏輯移到 `checkAuth()` 之後、權限判斷之前：

```typescript
const supabase = await createClient()
const { userId: authUserId, role, tierId: authTierId } = await checkAuth()

// 驗證輸入（提前，因為需要讀取 onBehalfOfUserId）
const validated = createOrderSchema.safeParse(input)
if (!validated.success) {
  return {
    success: false,
    message: '訂單資料驗證失敗',
    errors: validated.error.flatten().fieldErrors,
  }
}

// 判斷是否為代客下單（上方的完整邏輯）
// ...
```

刪除原本第 61-70 行的重複驗證區塊。

- [ ] **Step 3: 修改 timeline 記錄支援代客下單**

在 `lib/actions/orders.ts` 中，找到建立 order_timelines 的程式碼（約第 533-541 行）：

將：
```typescript
const { error: timelineError } = await supabase
  .from('order_timelines')
  .insert({
    order_id: order.id,
    action_type: 'created',
    actor_id: userId,
    actor_role: 'client',
    new_status: 'pending',
  })
```

替換為：
```typescript
const { error: timelineError } = await supabase
  .from('order_timelines')
  .insert({
    order_id: order.id,
    action_type: 'created',
    actor_id: isOnBehalf ? authUserId : userId,
    actor_role: isOnBehalf ? 'admin' : 'client',
    content: isOnBehalf ? '管理員代客建立訂單' : null,
    new_status: 'pending',
  })
```

- [ ] **Step 4: 修改優惠券查詢支援代客下單**

在 `createOrder` 中，找到優惠券查詢（約第 85-93 行），將 `.eq('user_id', userId)` 確認使用的是上面定義的 `userId` 變數（代客下單時為目標客戶 ID）。因為我們已經將 `userId` 設為目標客戶的 ID，所以此處不需要改動。

確認 `tierId` 在後續的 `tier_prices` 查詢中也使用正確的變數。搜尋所有 `authTierId` 的使用，確保商品價格查詢使用的是 `tierId`（不是 `authTierId`）。

- [ ] **Step 5: 執行型別檢查確認無錯誤**

Run: `cd /home/haraluya/APP/vsale-lite && pnpm type-check`
Expected: 無型別錯誤

- [ ] **Step 6: Commit**

```bash
git add lib/validations/order.schema.ts lib/actions/orders.ts
git commit -m "feat: createOrder 支援代客下單（onBehalfOfUserId 參數 + timeline 記錄）"
```

---

### Task 2: 新增 Server Actions（客戶搜尋、商品查詢、優惠券查詢）

**Files:**
- Modify: `lib/actions/clients.ts`
- Modify: `lib/actions/products.ts`
- Modify: `lib/actions/coupons.ts`

- [ ] **Step 1: 在 clients.ts 新增 searchCustomersForOrder**

在 `lib/actions/clients.ts` 檔案底部新增：

```typescript
/**
 * 代客下單：搜尋客戶（管理員專用）
 * 回傳精簡客戶資訊，含等級名稱，用於代客下單選擇
 */
export async function searchCustomersForOrder(query: string): Promise<ActionResult<Array<{
  id: string
  phone: string
  display_name: string | null
  tier_id: string | null
  tier_name: string | null
}>>> {
  try {
    await checkAuth('admin')

    if (!query || query.trim().length < 1) {
      return { success: true, data: [] }
    }

    const adminClient = createAdminClient()
    const trimmed = query.trim()

    const { data, error } = await adminClient
      .from('profiles')
      .select('id, phone, display_name, tier_id, tiers(name)')
      .eq('role', 'client')
      .or(`phone.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`)
      .order('display_name', { ascending: true })
      .limit(20)

    if (error) {
      return { success: false, message: '搜尋客戶失敗' }
    }

    const clients = (data || []).map((p: any) => ({
      id: p.id,
      phone: p.phone,
      display_name: p.display_name,
      tier_id: p.tier_id,
      tier_name: p.tiers?.name || null,
    }))

    return { success: true, data: clients }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '搜尋客戶時發生錯誤',
    }
  }
}
```

- [ ] **Step 2: 在 products.ts 新增 getProductsWithTierPrices**

在 `lib/actions/products.ts` 檔案底部新增：

```typescript
/**
 * 代客下單：查詢商品含指定等級價格（管理員專用）
 * 帶入客戶等級的價格，未設定等級價格時使用零售價
 */
export async function getProductsWithTierPrices(
  tierId: string,
  options?: {
    search?: string
    seriesId?: string
    limit?: number
  }
): Promise<ActionResult<Array<{
  id: string
  name: string
  code: string
  series_id: string
  series_name: string
  retail_price: number
  tier_price: number
  stock: number
  image_url: string | null
}>>> {
  try {
    await checkAuth('admin')

    const adminClient = createAdminClient()
    const { search, seriesId, limit: queryLimit = 50 } = options || {}

    let query = adminClient
      .from('products')
      .select(`
        id,
        name,
        code,
        series_id,
        retail_price,
        stock,
        image_url,
        series:series_id(name),
        tier_prices(price, tier_id)
      `)
      .eq('status', 'active')
      .order('code', { ascending: true })
      .limit(queryLimit)

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
    }

    if (seriesId) {
      query = query.eq('series_id', seriesId)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, message: '查詢商品失敗' }
    }

    const products = (data || []).map((p: any) => {
      const tierPriceData = p.tier_prices?.find((tp: any) => tp.tier_id === tierId)
      const tierPrice = tierPriceData?.price ?? p.retail_price

      return {
        id: p.id,
        name: p.name,
        code: p.code || '',
        series_id: p.series_id,
        series_name: p.series?.name || '',
        retail_price: p.retail_price,
        tier_price: tierPrice,
        stock: p.stock ?? 0,
        image_url: p.image_url || null,
      }
    })

    return { success: true, data: products }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢商品時發生錯誤',
    }
  }
}
```

- [ ] **Step 3: 在 coupons.ts 新增 getCustomerCoupons**

在 `lib/actions/coupons.ts` 檔案底部新增：

```typescript
/**
 * 代客下單：查詢指定客戶的可用優惠券（管理員專用）
 * 回傳該客戶已領取、未使用、仍有效的優惠券
 */
export async function getCustomerCoupons(
  customerId: string
): Promise<ActionResult<UserCoupon[]>> {
  try {
    await checkAuth('admin')

    const supabase = await createClient()

    const { data: userCoupons, error } = await supabase
      .from('user_coupons')
      .select(`
        *,
        coupon:coupons!inner(*)
      `)
      .eq('user_id', customerId)
      .is('used_at', null)
      .eq('coupon.status', 'active')
      .order('claimed_at', { ascending: false })

    if (error) {
      return { success: false, message: '查詢客戶優惠券失敗' }
    }

    const now = new Date()
    const validCoupons = (userCoupons || [])
      .map((uc: any) => {
        const coupon = uc.coupon
        if (!coupon) return null

        // 過濾過期優惠券
        if (coupon.valid_until && new Date(coupon.valid_until) < now) return null
        if (coupon.valid_from && new Date(coupon.valid_from) > now) return null

        return {
          id: uc.id,
          user_id: uc.user_id,
          coupon_id: uc.coupon_id,
          claimed_at: uc.claimed_at,
          used_at: uc.used_at,
          order_id: uc.order_id,
          coupon: {
            id: coupon.id,
            code: coupon.code,
            code_normalized: coupon.code_normalized,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            min_order_amount: coupon.min_order_amount,
            valid_from: coupon.valid_from,
            valid_until: coupon.valid_until,
            status: coupon.status,
          },
        } as UserCoupon
      })
      .filter(Boolean) as UserCoupon[]

    return { success: true, data: validCoupons }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢優惠券時發生錯誤',
    }
  }
}
```

- [ ] **Step 4: 執行型別檢查**

Run: `cd /home/haraluya/APP/vsale-lite && pnpm type-check`
Expected: 無型別錯誤

- [ ] **Step 5: Commit**

```bash
git add lib/actions/clients.ts lib/actions/products.ts lib/actions/coupons.ts
git commit -m "feat: 新增代客下單所需 Server Actions（客戶搜尋、商品查詢、優惠券查詢）"
```

---

### Task 3: 建立 useAdminOrderDraft Hook

**Files:**
- Create: `hooks/use-admin-order-draft.ts`

- [ ] **Step 1: 建立 hook 檔案**

建立 `hooks/use-admin-order-draft.ts`：

```typescript
'use client'

import { useState, useCallback, useMemo } from 'react'
import { calculateOrderAmounts, calculateGrandTotal } from '@/lib/pricing/order-calculator'
import type { RegularItemInput, ComboDealInput, CouponInput, OrderCalculationResult } from '@/lib/pricing/order-calculator'
import type { Coupon } from '@/types'
import type { ComboDealCartItem } from '@/types/combo-deals'

// ===== 型別定義 =====

export interface SelectedCustomer {
  id: string
  phone: string
  displayName: string | null
  tierId: string
  tierName: string | null
}

export interface DraftRegularItem {
  productId: string
  productName: string
  code: string
  seriesId: string
  seriesName: string
  quantity: number
  retailPrice: number
  tierPrice: number
}

export interface DraftAppliedCoupon {
  userCouponId: string
  coupon: Coupon
  discountAmount: number
}

export type AdminOrderStep = 1 | 2 | 3

// ===== Hook =====

export function useAdminOrderDraft() {
  // Step 1: 客戶
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null)

  // Step 2: 商品
  const [regularItems, setRegularItems] = useState<DraftRegularItem[]>([])
  const [comboDeals, setComboDeals] = useState<ComboDealCartItem[]>([])

  // Step 3: 優惠券 & 備註
  const [appliedCoupon, setAppliedCoupon] = useState<DraftAppliedCoupon | null>(null)
  const [notes, setNotes] = useState('')

  // 步驟控制
  const [currentStep, setCurrentStep] = useState<AdminOrderStep>(1)

  // ===== 計算結果（自動更新） =====
  const calculation = useMemo((): OrderCalculationResult | null => {
    if (regularItems.length === 0 && comboDeals.length === 0) return null

    const regularInputs: RegularItemInput[] = regularItems.map(item => ({
      retailPrice: item.retailPrice,
      tierPrice: item.tierPrice,
      quantity: item.quantity,
      seriesId: item.seriesId,
    }))

    const comboDealInputs: ComboDealInput[] = comboDeals.map(deal => ({
      name: deal.combo_deal_name,
      retailTotal: deal.retail_total ?? deal.original_price,
      originalPrice: deal.original_price,
      discountedPrice: deal.discounted_price,
      discountAmount: deal.discount_amount,
    }))

    const couponInput: CouponInput | undefined = appliedCoupon
      ? {
          code: appliedCoupon.coupon.code_normalized || appliedCoupon.coupon.code,
          discountType: appliedCoupon.coupon.discount_type as 'fixed' | 'percentage',
          discountValue: appliedCoupon.coupon.discount_value,
          minOrderAmount: appliedCoupon.coupon.min_order_amount,
          seriesRestrictions: [], // 從 coupon 的 series restrictions 取得，會在 Step 3 套用時帶入
        }
      : undefined

    return calculateOrderAmounts({
      regularItems: regularInputs,
      comboDeals: comboDealInputs,
      coupon: couponInput,
    })
  }, [regularItems, comboDeals, appliedCoupon])

  // ===== 普通商品操作 =====
  const addRegularItem = useCallback((item: DraftRegularItem) => {
    setRegularItems(prev => {
      const existing = prev.find(i => i.productId === item.productId)
      if (existing) {
        return prev.map(i =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        )
      }
      return [...prev, item]
    })
  }, [])

  const removeRegularItem = useCallback((productId: string) => {
    setRegularItems(prev => prev.filter(i => i.productId !== productId))
  }, [])

  const updateRegularItemQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setRegularItems(prev => prev.filter(i => i.productId !== productId))
      return
    }
    setRegularItems(prev =>
      prev.map(i => i.productId === productId ? { ...i, quantity } : i)
    )
  }, [])

  // ===== 組合優惠操作 =====
  const addComboDeal = useCallback((deal: ComboDealCartItem) => {
    setComboDeals(prev => [...prev, deal])
  }, [])

  const removeComboDeal = useCallback((dealId: string) => {
    setComboDeals(prev => prev.filter(d => d.id !== dealId))
  }, [])

  // ===== 優惠券操作 =====
  const applyCoupon = useCallback((couponData: DraftAppliedCoupon) => {
    setAppliedCoupon(couponData)
  }, [])

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null)
  }, [])

  // ===== 重置 =====
  const resetDraft = useCallback(() => {
    setSelectedCustomer(null)
    setRegularItems([])
    setComboDeals([])
    setAppliedCoupon(null)
    setNotes('')
    setCurrentStep(1)
  }, [])

  const resetItemsAndCoupon = useCallback(() => {
    setRegularItems([])
    setComboDeals([])
    setAppliedCoupon(null)
    setNotes('')
  }, [])

  // ===== 統計 =====
  const totalItemCount = regularItems.reduce((sum, i) => sum + i.quantity, 0) + comboDeals.length
  const hasItems = regularItems.length > 0 || comboDeals.length > 0

  return {
    // State
    selectedCustomer,
    regularItems,
    comboDeals,
    appliedCoupon,
    notes,
    currentStep,
    calculation,
    totalItemCount,
    hasItems,

    // Setters
    setSelectedCustomer,
    setNotes,
    setCurrentStep,

    // Actions
    addRegularItem,
    removeRegularItem,
    updateRegularItemQuantity,
    addComboDeal,
    removeComboDeal,
    applyCoupon,
    removeCoupon,
    resetDraft,
    resetItemsAndCoupon,
  }
}

export type AdminOrderDraftReturn = ReturnType<typeof useAdminOrderDraft>
```

- [ ] **Step 2: 執行型別檢查**

Run: `cd /home/haraluya/APP/vsale-lite && pnpm type-check`
Expected: 無型別錯誤（可能有 `ComboDealCartItem` 的 `retail_total` 欄位問題需要確認 types/combo-deals.ts 定義，如有問題則調整為符合實際型別的欄位名稱）

- [ ] **Step 3: Commit**

```bash
git add hooks/use-admin-order-draft.ts
git commit -m "feat: 新增 useAdminOrderDraft hook 管理代客下單草稿狀態"
```

---

### Task 4: 建立 AdminOrderSheet 容器元件

**Files:**
- Create: `components/admin/orders/admin-order-sheet.tsx`

- [ ] **Step 1: 建立 Sheet 容器元件**

建立 `components/admin/orders/admin-order-sheet.tsx`：

```typescript
'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { UserPlus, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConfirm } from '@/lib/contexts/dialog-context'
import { useAdminOrderDraft, type AdminOrderStep } from '@/hooks/use-admin-order-draft'
import { StepCustomerSelect } from './step-customer-select'
import { StepProductSelect } from './step-product-select'
import { StepCheckout } from './step-checkout'

const STEPS: { step: AdminOrderStep; label: string }[] = [
  { step: 1, label: '選擇客戶' },
  { step: 2, label: '選擇商品' },
  { step: 3, label: '確認結帳' },
]

export function AdminOrderSheet() {
  const [open, setOpen] = useState(false)
  const confirm = useConfirm()
  const draft = useAdminOrderDraft()

  const handleOpenChange = async (newOpen: boolean) => {
    if (!newOpen && draft.hasItems) {
      const confirmed = await confirm({
        title: '放棄代客下單？',
        message: '已選擇的商品和設定將會清除。',
        confirmText: '確認放棄',
        cancelText: '繼續編輯',
      })
      if (!confirmed) return
    }

    if (!newOpen) {
      draft.resetDraft()
    }
    setOpen(newOpen)
  }

  const handleBack = () => {
    if (draft.currentStep > 1) {
      draft.setCurrentStep((draft.currentStep - 1) as AdminOrderStep)
    }
  }

  const handleOrderCreated = () => {
    draft.resetDraft()
    setOpen(false)
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <UserPlus className="h-4 w-4" />
        代客下單
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl overflow-y-auto p-0"
        >
          {/* Header */}
          <SheetHeader className="sticky top-0 z-10 bg-surface border-b px-4 py-3">
            <div className="flex items-center gap-3">
              {draft.currentStep > 1 && (
                <button
                  onClick={handleBack}
                  className="p-1 rounded-theme-sm hover:bg-gray-100"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <SheetTitle className="flex-1">代客下單</SheetTitle>
              {draft.selectedCustomer && (
                <span className="text-sm text-text-secondary">
                  {draft.selectedCustomer.displayName || draft.selectedCustomer.phone}
                </span>
              )}
            </div>

            {/* Step Indicator */}
            <div className="flex gap-2 mt-2">
              {STEPS.map(({ step, label }) => (
                <div key={step} className="flex-1">
                  <div
                    className={cn(
                      'h-1 rounded-full transition-colors',
                      step <= draft.currentStep ? 'bg-blue-500' : 'bg-gray-200'
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs mt-1 block',
                      step === draft.currentStep
                        ? 'text-blue-600 font-medium'
                        : 'text-text-secondary'
                    )}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </SheetHeader>

          {/* Step Content */}
          <div className="p-4">
            {draft.currentStep === 1 && (
              <StepCustomerSelect draft={draft} />
            )}
            {draft.currentStep === 2 && (
              <StepProductSelect draft={draft} />
            )}
            {draft.currentStep === 3 && (
              <StepCheckout draft={draft} onOrderCreated={handleOrderCreated} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
```

- [ ] **Step 2: 執行型別檢查**

Run: `cd /home/haraluya/APP/vsale-lite && pnpm type-check`
Expected: 會有 import 錯誤（StepCustomerSelect 等元件尚未建立），這是預期中的，後續 Task 會建立

- [ ] **Step 3: Commit**

```bash
git add components/admin/orders/admin-order-sheet.tsx
git commit -m "feat: 新增 AdminOrderSheet 容器元件（步驟控制 + Sheet）"
```

---

### Task 5: 建立 StepCustomerSelect 元件

**Files:**
- Create: `components/admin/orders/step-customer-select.tsx`

- [ ] **Step 1: 建立客戶搜尋選擇元件**

建立 `components/admin/orders/step-customer-select.tsx`：

```typescript
'use client'

import { useState, useCallback } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConfirm } from '@/lib/contexts/dialog-context'
import { searchCustomersForOrder } from '@/lib/actions/clients'
import type { AdminOrderDraftReturn, SelectedCustomer } from '@/hooks/use-admin-order-draft'

interface StepCustomerSelectProps {
  draft: AdminOrderDraftReturn
}

export function StepCustomerSelect({ draft }: StepCustomerSelectProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{
    id: string
    phone: string
    display_name: string | null
    tier_id: string | null
    tier_name: string | null
  }>>([])
  const [loading, setLoading] = useState(false)
  const confirm = useConfirm()

  const handleSearch = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery)
    if (searchQuery.trim().length < 1) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const result = await searchCustomersForOrder(searchQuery.trim())
      if (result.success && result.data) {
        setResults(result.data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSelect = useCallback(async (customer: typeof results[number]) => {
    // 如果已有選擇的客戶且有商品，需要確認
    if (draft.selectedCustomer && draft.hasItems && draft.selectedCustomer.id !== customer.id) {
      const confirmed = await confirm({
        title: '切換客戶？',
        message: '切換客戶後，已選擇的商品和優惠券將會清除。',
        confirmText: '確認切換',
        cancelText: '取消',
      })
      if (!confirmed) return
      draft.resetItemsAndCoupon()
    }

    if (!customer.tier_id) {
      // 客戶沒有設定等級，無法下單
      return
    }

    const selected: SelectedCustomer = {
      id: customer.id,
      phone: customer.phone,
      displayName: customer.display_name,
      tierId: customer.tier_id,
      tierName: customer.tier_name,
    }

    draft.setSelectedCustomer(selected)
    draft.setCurrentStep(2)
  }, [draft, confirm])

  return (
    <div className="space-y-4">
      {/* 搜尋輸入 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="搜尋客戶手機號碼或名稱..."
          className="w-full pl-10 pr-4 py-3 border rounded-theme-sm bg-surface focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      </div>

      {/* 搜尋結果 */}
      {loading && (
        <div className="text-center text-text-secondary py-8">搜尋中...</div>
      )}

      {!loading && results.length > 0 && (
        <div className="border rounded-theme-sm overflow-hidden divide-y">
          {results.map((customer) => (
            <button
              key={customer.id}
              onClick={() => handleSelect(customer)}
              className={cn(
                'w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left',
                draft.selectedCustomer?.id === customer.id && 'bg-blue-50'
              )}
            >
              <div>
                <div className="font-medium">
                  {customer.display_name || customer.phone}
                </div>
                <div className="text-sm text-text-secondary">
                  {customer.phone}
                </div>
              </div>
              {customer.tier_name ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {customer.tier_name}
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  未設定等級
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {!loading && query.length >= 1 && results.length === 0 && (
        <div className="text-center text-text-secondary py-8">
          找不到符合的客戶
        </div>
      )}

      {/* 已選客戶提示 */}
      {draft.selectedCustomer && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-theme-sm text-sm text-green-700">
          已選擇：{draft.selectedCustomer.displayName || draft.selectedCustomer.phone}
          （{draft.selectedCustomer.tierName}）
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/orders/step-customer-select.tsx
git commit -m "feat: 新增 StepCustomerSelect 客戶搜尋選擇元件"
```

---

### Task 6: 建立 StepProductSelect 及子元件

**Files:**
- Create: `components/admin/orders/step-product-select.tsx`
- Create: `components/admin/orders/regular-product-picker.tsx`
- Create: `components/admin/orders/combo-deal-picker.tsx`
- Create: `components/admin/orders/draft-items-summary.tsx`

- [ ] **Step 1: 建立 DraftItemsSummary 浮動摘要條**

建立 `components/admin/orders/draft-items-summary.tsx`：

```typescript
'use client'

import { Button } from '@/components/ui/button'
import { ShoppingCart } from 'lucide-react'
import type { AdminOrderDraftReturn } from '@/hooks/use-admin-order-draft'

interface DraftItemsSummaryProps {
  draft: AdminOrderDraftReturn
  onNext: () => void
}

export function DraftItemsSummary({ draft, onNext }: DraftItemsSummaryProps) {
  if (!draft.hasItems) return null

  const regularTotal = draft.regularItems.reduce(
    (sum, item) => sum + item.tierPrice * item.quantity, 0
  )
  const comboTotal = draft.comboDeals.reduce(
    (sum, deal) => sum + deal.discounted_price, 0
  )
  const total = regularTotal + comboTotal

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-surface border-t px-4 py-3 flex items-center justify-between shadow-neo-sm">
      <div className="flex items-center gap-2 text-sm">
        <ShoppingCart className="h-4 w-4 text-blue-500" />
        <span>
          已選 <strong>{draft.totalItemCount}</strong> 件
        </span>
        <span className="text-text-secondary">·</span>
        <span className="font-semibold text-blue-600">
          ${Math.round(total).toLocaleString()}
        </span>
      </div>
      <Button size="sm" onClick={onNext}>
        下一步
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: 建立 RegularProductPicker**

建立 `components/admin/orders/regular-product-picker.tsx`：

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Minus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getProductsWithTierPrices } from '@/lib/actions/products'
import { getSeries } from '@/lib/actions/series'
import type { AdminOrderDraftReturn } from '@/hooks/use-admin-order-draft'

interface ProductItem {
  id: string
  name: string
  code: string
  series_id: string
  series_name: string
  retail_price: number
  tier_price: number
  stock: number
  image_url: string | null
}

interface SeriesItem {
  id: string
  name: string
}

interface RegularProductPickerProps {
  draft: AdminOrderDraftReturn
}

export function RegularProductPicker({ draft }: RegularProductPickerProps) {
  const [search, setSearch] = useState('')
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null)
  const [products, setProducts] = useState<ProductItem[]>([])
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([])
  const [loading, setLoading] = useState(false)

  const tierId = draft.selectedCustomer?.tierId

  // 載入系列列表
  useEffect(() => {
    async function loadSeries() {
      const result = await getSeries()
      if (result.success && result.data) {
        setSeriesList(result.data.map((s: any) => ({ id: s.id, name: s.name })))
      }
    }
    loadSeries()
  }, [])

  // 載入商品
  const loadProducts = useCallback(async () => {
    if (!tierId) return
    setLoading(true)
    try {
      const result = await getProductsWithTierPrices(tierId, {
        search: search || undefined,
        seriesId: selectedSeriesId || undefined,
      })
      if (result.success && result.data) {
        setProducts(result.data)
      }
    } finally {
      setLoading(false)
    }
  }, [tierId, search, selectedSeriesId])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleAdd = (product: ProductItem) => {
    draft.addRegularItem({
      productId: product.id,
      productName: product.name,
      code: product.code,
      seriesId: product.series_id,
      seriesName: product.series_name,
      quantity: 1,
      retailPrice: product.retail_price,
      tierPrice: product.tier_price,
    })
  }

  const getItemQuantity = (productId: string) => {
    return draft.regularItems.find(i => i.productId === productId)?.quantity || 0
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded bg-blue-500 text-white font-medium">商品</span>
        <span className="font-semibold text-sm">普通商品</span>
      </div>

      {/* 搜尋 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋商品名稱或編號..."
          className="w-full pl-10 pr-4 py-2 text-sm border rounded-theme-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 系列篩選 */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setSelectedSeriesId(null)}
          className={cn(
            'text-xs px-2.5 py-1 rounded-full transition-colors',
            !selectedSeriesId ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
          )}
        >
          全部
        </button>
        {seriesList.map((series) => (
          <button
            key={series.id}
            onClick={() => setSelectedSeriesId(series.id)}
            className={cn(
              'text-xs px-2.5 py-1 rounded-full transition-colors',
              selectedSeriesId === series.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            )}
          >
            {series.name}
          </button>
        ))}
      </div>

      {/* 商品列表 */}
      {loading ? (
        <div className="text-center text-text-secondary py-6 text-sm">載入中...</div>
      ) : (
        <div className="border rounded-theme-sm divide-y max-h-[300px] overflow-y-auto">
          {products.length === 0 ? (
            <div className="text-center text-text-secondary py-6 text-sm">沒有商品</div>
          ) : (
            products.map((product) => {
              const qty = getItemQuantity(product.id)
              return (
                <div key={product.id} className="px-3 py-2 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{product.name}</div>
                    <div className="text-xs text-text-secondary">{product.series_name}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-sm font-semibold text-blue-600">
                      ${product.tier_price}
                    </span>
                    {qty > 0 ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => draft.updateRegularItemQuantity(product.id, qty - 1)}
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          {qty === 1 ? <X className="h-3.5 w-3.5 text-red-500" /> : <Minus className="h-3.5 w-3.5" />}
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{qty}</span>
                        <button
                          onClick={() => draft.updateRegularItemQuantity(product.id, qty + 1)}
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAdd(product)}
                        className="p-1.5 rounded-theme-sm bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 建立 ComboDealPicker**

建立 `components/admin/orders/combo-deal-picker.tsx`：

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tag, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getActiveComboDealsByTier } from '@/lib/actions/combo-deals'
import { getProductsWithTierPrices } from '@/lib/actions/products'
import { calculateComboDealPrice, formatDiscountLabel } from '@/lib/pricing/combo-deals'
import { Button } from '@/components/ui/button'
import type { AdminOrderDraftReturn } from '@/hooks/use-admin-order-draft'
import type { ComboDealCartItem } from '@/types/combo-deals'

interface ComboDealSummary {
  id: string
  name: string
  combo_mode: 'each' | 'mix_match'
  discount_type: 'fixed' | 'percentage'
  discount_value: number
  series_count: number
}

interface ComboDealPickerProps {
  draft: AdminOrderDraftReturn
}

export function ComboDealPicker({ draft }: ComboDealPickerProps) {
  const [deals, setDeals] = useState<ComboDealSummary[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadDeals() {
      setLoading(true)
      try {
        const result = await getActiveComboDealsByTier()
        if (result.success && result.data) {
          setDeals(result.data)
        }
      } finally {
        setLoading(false)
      }
    }
    loadDeals()
  }, [])

  const addedDealIds = draft.comboDeals.map(d => d.combo_deal_id)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded bg-amber-500 text-white font-medium">優惠</span>
        <span className="font-semibold text-sm">組合優惠</span>
      </div>

      {loading ? (
        <div className="text-center text-text-secondary py-6 text-sm">載入中...</div>
      ) : deals.length === 0 ? (
        <div className="text-center text-text-secondary py-6 text-sm border rounded-theme-sm bg-amber-50">
          該客戶等級目前無可用組合優惠
        </div>
      ) : (
        <div className="border border-amber-200 rounded-theme-sm bg-amber-50/50 divide-y divide-amber-200">
          {deals.map((deal) => {
            const isAdded = addedDealIds.includes(deal.id)
            return (
              <div key={deal.id} className="px-3 py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{deal.name}</div>
                  <div className="text-xs text-amber-800">
                    {deal.combo_mode === 'each' ? '各選' : '任選'}
                    {' · '}
                    {formatDiscountLabel(deal.discount_type, deal.discount_value)}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={isAdded ? 'outline' : 'default'}
                  className={cn(
                    'text-xs',
                    !isAdded && 'bg-amber-500 hover:bg-amber-600 text-white'
                  )}
                  disabled={isAdded}
                >
                  {isAdded ? '已加入' : '選購'}
                  {!isAdded && <ChevronRight className="h-3 w-3 ml-1" />}
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* 已加入的組合優惠 */}
      {draft.comboDeals.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-text-secondary font-medium">已加入的組合優惠</div>
          {draft.comboDeals.map((deal) => (
            <div key={deal.id} className="flex items-center justify-between px-3 py-2 border rounded-theme-sm bg-surface">
              <div>
                <div className="text-sm font-medium">{deal.combo_deal_name}</div>
                <div className="text-xs text-text-secondary">
                  省 ${deal.discount_amount}
                </div>
              </div>
              <button
                onClick={() => draft.removeComboDeal(deal.id)}
                className="text-xs text-red-500 hover:text-red-700"
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

注意：組合優惠的「選購」流程需要展開組合優惠的商品選擇（各選/任選模式）。這個互動比較複雜，初版可以先用簡化版本——點擊「選購」後跳轉到組合優惠選擇流程。完整的組合優惠商品選擇器可以在後續迭代中完善。如果現有系統已有可複用的組合優惠選擇元件，請直接複用。

- [ ] **Step 4: 建立 StepProductSelect 主容器**

建立 `components/admin/orders/step-product-select.tsx`：

```typescript
'use client'

import { RegularProductPicker } from './regular-product-picker'
import { ComboDealPicker } from './combo-deal-picker'
import { DraftItemsSummary } from './draft-items-summary'
import type { AdminOrderDraftReturn } from '@/hooks/use-admin-order-draft'

interface StepProductSelectProps {
  draft: AdminOrderDraftReturn
}

export function StepProductSelect({ draft }: StepProductSelectProps) {
  const handleNext = () => {
    draft.setCurrentStep(3)
  }

  return (
    <div className="space-y-6 pb-20">
      {/* 普通商品區 */}
      <RegularProductPicker draft={draft} />

      {/* 分隔線 */}
      <div className="border-t" />

      {/* 組合優惠區 */}
      <ComboDealPicker draft={draft} />

      {/* 底部浮動摘要條 */}
      <DraftItemsSummary draft={draft} onNext={handleNext} />
    </div>
  )
}
```

- [ ] **Step 5: 執行型別檢查**

Run: `cd /home/haraluya/APP/vsale-lite && pnpm type-check`
Expected: 可能有型別問題需要修正

- [ ] **Step 6: Commit**

```bash
git add components/admin/orders/step-product-select.tsx components/admin/orders/regular-product-picker.tsx components/admin/orders/combo-deal-picker.tsx components/admin/orders/draft-items-summary.tsx
git commit -m "feat: 新增商品選擇步驟元件（普通商品 + 組合優惠 + 摘要條）"
```

---

### Task 7: 建立 StepCheckout 結帳確認元件

**Files:**
- Create: `components/admin/orders/step-checkout.tsx`

- [ ] **Step 1: 建立結帳確認元件**

建立 `components/admin/orders/step-checkout.tsx`：

```typescript
'use client'

import { useState } from 'react'
import { Loader2, Ticket, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAlert } from '@/lib/contexts/dialog-context'
import { createOrder } from '@/lib/actions/orders'
import { getCustomerCoupons } from '@/lib/actions/coupons'
import { calculateCouponDiscount, type CartItemForCoupon } from '@/lib/utils/coupon-helpers'
import { calculateGrandTotal } from '@/lib/pricing/order-calculator'
import type { AdminOrderDraftReturn, DraftAppliedCoupon } from '@/hooks/use-admin-order-draft'
import type { UserCoupon } from '@/types'

interface StepCheckoutProps {
  draft: AdminOrderDraftReturn
  onOrderCreated: () => void
}

export function StepCheckout({ draft, onOrderCreated }: StepCheckoutProps) {
  const [submitting, setSubmitting] = useState(false)
  const [couponLoading, setCouponLoading] = useState(false)
  const [availableCoupons, setAvailableCoupons] = useState<UserCoupon[] | null>(null)
  const [showCouponPicker, setShowCouponPicker] = useState(false)
  const alert = useAlert()

  const { calculation, selectedCustomer, regularItems, comboDeals, appliedCoupon, notes } = draft

  if (!calculation || !selectedCustomer) return null

  const grandTotal = calculateGrandTotal(calculation, 0) // 運費由 server 計算

  // 載入可用優惠券
  const handleLoadCoupons = async () => {
    setCouponLoading(true)
    try {
      const result = await getCustomerCoupons(selectedCustomer.id)
      if (result.success && result.data) {
        setAvailableCoupons(result.data)
        setShowCouponPicker(true)
      }
    } finally {
      setCouponLoading(false)
    }
  }

  // 套用優惠券
  const handleApplyCoupon = (userCoupon: UserCoupon) => {
    const cartItems: CartItemForCoupon[] = regularItems.map(item => ({
      productId: item.productId,
      seriesId: item.seriesId,
      quantity: item.quantity,
      tierPrice: item.tierPrice,
    }))

    const discountResult = calculateCouponDiscount({
      coupon: userCoupon.coupon,
      cartItems,
      userTierId: selectedCustomer.tierId,
    })

    if (!discountResult.valid) {
      alert({ title: '無法套用', message: discountResult.reason || '此優惠券不適用' })
      return
    }

    draft.applyCoupon({
      userCouponId: userCoupon.id,
      coupon: userCoupon.coupon,
      discountAmount: discountResult.discountAmount,
    })
    setShowCouponPicker(false)
  }

  // 送出訂單
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const result = await createOrder({
        items: regularItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        comboDealItems: comboDeals.map(deal => ({
          comboDealId: deal.combo_deal_id,
          comboDealName: deal.combo_deal_name,
          selectedProducts: deal.selected_products.map(sp => ({
            product_id: sp.product_id,
            series_id: sp.series_id,
            quantity: sp.quantity,
          })),
          originalPrice: deal.original_price,
          discountedPrice: deal.discounted_price,
          discountAmount: deal.discount_amount,
        })),
        notes: notes || undefined,
        userCouponId: appliedCoupon?.userCouponId || undefined,
        onBehalfOfUserId: selectedCustomer.id,
      })

      if (result.success) {
        await alert({
          title: '訂單建立成功',
          message: result.message || '代客下單完成',
        })
        onOrderCreated()
      } else {
        await alert({
          title: '建立失敗',
          message: result.message || '請稍後再試',
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 客戶資訊 */}
      <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-theme-sm text-sm">
        客戶：<strong>{selectedCustomer.displayName || selectedCustomer.phone}</strong>
        （{selectedCustomer.tierName}）
      </div>

      {/* 訂單明細 - 普通商品 */}
      {regularItems.length > 0 && (
        <div className="border rounded-theme-sm overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-text-secondary border-b">
            普通商品
          </div>
          <div className="divide-y">
            {regularItems.map((item) => (
              <div key={item.productId} className="px-3 py-2 flex justify-between text-sm">
                <span>{item.productName} × {item.quantity}</span>
                <span className="font-medium">${(item.tierPrice * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 訂單明細 - 組合優惠 */}
      {comboDeals.length > 0 && (
        <div className="border border-amber-200 rounded-theme-sm overflow-hidden">
          <div className="px-3 py-2 bg-amber-50 text-xs font-semibold text-amber-800 border-b border-amber-200">
            組合優惠
          </div>
          <div className="divide-y divide-amber-100">
            {comboDeals.map((deal) => (
              <div key={deal.id} className="px-3 py-2 flex justify-between text-sm">
                <span>{deal.combo_deal_name}</span>
                <span className="font-medium">${deal.discounted_price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 金額摘要 */}
      <div className="border rounded-theme-sm p-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">零售價總計</span>
          <span className="line-through text-text-secondary">${calculation.retailTotal.toLocaleString()}</span>
        </div>
        {calculation.memberDiscount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>會員折扣</span>
            <span>-${calculation.memberDiscount.toLocaleString()}</span>
          </div>
        )}
        {calculation.comboDiscount > 0 && (
          <div className="flex justify-between text-amber-600">
            <span>組合優惠折扣</span>
            <span>-${calculation.comboDiscount.toLocaleString()}</span>
          </div>
        )}
        {appliedCoupon && (
          <div className="flex justify-between text-purple-600">
            <span>優惠券折扣</span>
            <span>-${appliedCoupon.discountAmount.toLocaleString()}</span>
          </div>
        )}

        {/* 優惠券操作 */}
        <div className="border-t pt-2">
          {appliedCoupon ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-600">
                🎫 {appliedCoupon.coupon.code}
              </span>
              <button
                onClick={() => draft.removeCoupon()}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                移除
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-purple-600 border-purple-200"
              onClick={handleLoadCoupons}
              disabled={couponLoading}
            >
              {couponLoading ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Ticket className="h-3 w-3 mr-1" />
              )}
              套用優惠券
            </Button>
          )}
        </div>

        {/* 優惠券選擇器 */}
        {showCouponPicker && availableCoupons && (
          <div className="border rounded-theme-sm mt-2 max-h-[200px] overflow-y-auto divide-y">
            {availableCoupons.length === 0 ? (
              <div className="px-3 py-4 text-center text-text-secondary text-xs">
                該客戶目前無可用優惠券
              </div>
            ) : (
              availableCoupons.map((uc) => (
                <button
                  key={uc.id}
                  onClick={() => handleApplyCoupon(uc)}
                  className="w-full px-3 py-2 text-left hover:bg-purple-50 transition-colors"
                >
                  <div className="text-sm font-medium">{uc.coupon.code}</div>
                  <div className="text-xs text-text-secondary">
                    {uc.coupon.discount_type === 'fixed'
                      ? `折 $${uc.coupon.discount_value}`
                      : `${uc.coupon.discount_value}% off`
                    }
                    {uc.coupon.min_order_amount ? ` · 滿 $${uc.coupon.min_order_amount}` : ''}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* 訂單合計 */}
        <div className="border-t-2 border-gray-800 pt-2 flex justify-between font-bold text-base">
          <span>訂單合計</span>
          <span className="text-red-600">${grandTotal.toLocaleString()}</span>
        </div>
        <div className="text-xs text-text-secondary">
          運費將於送出後由系統自動計算
        </div>
      </div>

      {/* 備註 */}
      <div>
        <label className="text-xs text-text-secondary block mb-1">訂單備註（選填）</label>
        <textarea
          value={notes}
          onChange={(e) => draft.setNotes(e.target.value)}
          placeholder="輸入備註..."
          rows={2}
          maxLength={500}
          className="w-full px-3 py-2 text-sm border rounded-theme-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 送出按鈕 */}
      <Button
        className="w-full py-3 text-base font-bold"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            送出中...
          </>
        ) : (
          '確認送出訂單'
        )}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: 執行型別檢查**

Run: `cd /home/haraluya/APP/vsale-lite && pnpm type-check`
Expected: 確認無錯誤。注意 `CartItemForCoupon` 和 `calculateCouponDiscount` 的參數格式可能需要根據實際型別定義微調。

- [ ] **Step 3: Commit**

```bash
git add components/admin/orders/step-checkout.tsx
git commit -m "feat: 新增 StepCheckout 結帳確認元件（金額摘要 + 優惠券 + 送出）"
```

---

### Task 8: 整合到訂單管理頁面

**Files:**
- Modify: `app/(admin)/admin/orders/page.tsx`

- [ ] **Step 1: 在訂單管理頁面加入代客下單按鈕**

修改 `app/(admin)/admin/orders/page.tsx`，在標題區域的右上角加入 `AdminOrderSheet`。

因為 `AdminOrderSheet` 是 Client Component，而頁面是 Server Component，直接 import 即可（Next.js 自動處理）。

在檔案頂部加入 import：
```typescript
import { AdminOrderSheet } from '@/components/admin/orders/admin-order-sheet'
```

修改標題區域，在 `<div>` 標題文字後面加入按鈕：

將標題區域：
```tsx
<div
  className={cn(
    'flex items-center gap-3 md:gap-4 rounded-theme-sm bg-surface',
    getThemeClasses(),
    designTokens.spacing.card.padding
  )}
>
  <div className="rounded-theme-sm border bg-blue-400 dark:bg-blue-600 p-2 md:p-3">
    <Package className="h-6 w-6 md:h-8 md:w-8" />
  </div>
  <div>
    <h1 className={designTokens.typography.h1}>訂單管理</h1>
    <p className={cn(designTokens.typography.body.base, 'text-text-secondary')}>管理所有客戶訂單</p>
  </div>
</div>
```

替換為：
```tsx
<div
  className={cn(
    'flex items-center gap-3 md:gap-4 rounded-theme-sm bg-surface',
    getThemeClasses(),
    designTokens.spacing.card.padding
  )}
>
  <div className="rounded-theme-sm border bg-blue-400 dark:bg-blue-600 p-2 md:p-3">
    <Package className="h-6 w-6 md:h-8 md:w-8" />
  </div>
  <div className="flex-1">
    <h1 className={designTokens.typography.h1}>訂單管理</h1>
    <p className={cn(designTokens.typography.body.base, 'text-text-secondary')}>管理所有客戶訂單</p>
  </div>
  <AdminOrderSheet />
</div>
```

- [ ] **Step 2: 執行 build 確認通過**

Run: `cd /home/haraluya/APP/vsale-lite && pnpm build`
Expected: Build 成功

- [ ] **Step 3: Commit**

```bash
git add app/(admin)/admin/orders/page.tsx
git commit -m "feat: 訂單管理頁面整合代客下單按鈕"
```

---

### Task 9: 訂單列表顯示「代客下單」標籤

**Files:**
- Modify: `lib/actions/orders.ts` (getOrders 回傳代客標記)
- Modify: `components/admin/orders/smart-order-list.tsx` 或相關訂單卡片元件

- [ ] **Step 1: 修改 getOrders 回傳代客下單標記**

在 `lib/actions/orders.ts` 的 `getOrders` function 中，在批次查詢用戶資料之後（約第 640-648 行），新增查詢 order_timelines 以判斷代客下單。

在 `const profileMap = ...` 之後加入：

```typescript
// 查詢代客下單標記（order_timelines 中 action_type='created' AND actor_role='admin'）
const orderIds = orders.map((order: any) => order.id)
const { data: adminCreatedTimelines } = await supabase
  .from('order_timelines')
  .select('order_id')
  .in('order_id', orderIds)
  .eq('action_type', 'created')
  .eq('actor_role', 'admin')

const adminCreatedOrderIds = new Set(
  (adminCreatedTimelines || []).map((t: any) => t.order_id)
)
```

然後修改 `formattedOrders` 的 map，在每個訂單物件中加入 `is_admin_order` 屬性：

在 return 物件中加入：
```typescript
is_admin_order: adminCreatedOrderIds.has(order.id),
```

- [ ] **Step 2: 更新 OrderWithUser 型別**

在 `types/index.ts` 中找到 `OrderWithUser` 型別，加入：

```typescript
is_admin_order?: boolean
```

- [ ] **Step 3: 在訂單列表元件中顯示標籤**

找到訂單列表中顯示訂單資訊的元件（`components/admin/order-table.tsx` 或相關元件），在訂單編號旁邊加入代客下單標籤：

```tsx
{order.is_admin_order && (
  <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 ml-1.5">
    代客下單
  </span>
)}
```

同樣的標籤也需要在前端客戶訂單列表中顯示（如果訂單是代客建立的）。找到 `components/shop/` 下的訂單相關元件，加入相同的判斷和標籤。

- [ ] **Step 4: 在訂單詳情頁顯示標籤**

在 `app/(admin)/admin/orders/[id]/page.tsx` 或其引用的元件中，查詢 timeline 判斷是否為代客下單，並顯示標籤。

- [ ] **Step 5: 執行型別檢查與 build**

Run: `cd /home/haraluya/APP/vsale-lite && pnpm type-check && pnpm build`
Expected: 通過

- [ ] **Step 6: Commit**

```bash
git add lib/actions/orders.ts types/index.ts components/admin/order-table.tsx
git commit -m "feat: 訂單列表與詳情頁顯示「代客下單」標籤"
```

---

### Task 10: 最終整合測試與收尾

**Files:**
- All modified files

- [ ] **Step 1: 執行完整 build**

Run: `cd /home/haraluya/APP/vsale-lite && pnpm build`
Expected: Build 成功，無錯誤

- [ ] **Step 2: 重啟 dev server**

```bash
# 終止現有 dev server
pkill -f "next dev" || true
# 啟動新的 dev server
cd /home/haraluya/APP/vsale-lite && pnpm dev
```

- [ ] **Step 3: 手動測試清單**

1. 進入 `/admin/orders`，確認右上角有「代客下單」按鈕
2. 點擊按鈕，確認 Sheet 從右側滑出
3. Step 1：搜尋客戶，確認搜尋結果顯示正確、等級標籤顯示
4. Step 2：選擇商品，確認等級價格正確帶入、數量可調整
5. Step 2：組合優惠區域正確顯示該客戶可用的組合優惠
6. Step 3：確認金額摘要正確（會員折扣、組合優惠折扣）
7. Step 3：套用優惠券，確認折扣計算正確
8. Step 3：送出訂單，確認成功
9. 確認訂單列表中新訂單顯示「代客下單」標籤
10. 確認 order_timelines 中記錄 `actor_role='admin'`
11. 關閉 Sheet 時若有商品，確認出現確認對話框
12. 切換客戶時若有商品，確認出現確認對話框

- [ ] **Step 4: 確認無未追蹤檔案遺漏**

Run: `cd /home/haraluya/APP/vsale-lite && git status`
Expected: 所有改動已 commit
