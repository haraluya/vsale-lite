# API Contract: Cart (購物車)

**Module**: `lib/actions/cart.ts` + `stores/cart.ts`
**Date**: 2026-01-03
**Status**: Phase 1 Design

## Overview

購物車採用 **前端狀態管理 (Zustand)** + **Server Actions 輔助驗證** 的混合架構。購物車資料儲存於瀏覽器 localStorage，商品資訊與價格透過 Server Actions 即時查詢。

---

## Frontend Store (Zustand)

**路徑**: `stores/cart.ts`

### 狀態定義

```typescript
interface CartItem {
  productId: string
  quantity: number
}

interface CartState {
  items: CartItem[]

  // Actions
  addItem: (productId: string, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void

  // Getters
  getItemCount: () => number
  hasItem: (productId: string) => boolean
}
```

### Zustand Store 實作

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (productId, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find(i => i.productId === productId)
          if (existingItem) {
            return {
              items: state.items.map(i =>
                i.productId === productId
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              )
            }
          }
          return { items: [...state.items, { productId, quantity }] }
        })
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter(i => i.productId !== productId)
        }))
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set((state) => ({
          items: state.items.map(i =>
            i.productId === productId ? { ...i, quantity } : i
          )
        }))
      },

      clearCart: () => {
        set({ items: [] })
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },

      hasItem: (productId) => {
        return get().items.some(i => i.productId === productId)
      }
    }),
    {
      name: 'vsale-cart-storage',
      version: 1
    }
  )
)
```

**說明**:
- `name`: 'vsale-cart-storage' - localStorage key
- `version`: 1 - 版本控制，未來資料結構變更時可遷移
- 僅儲存 `productId` 與 `quantity`，不儲存價格（價格即時查詢）

---

## Server Actions

### 1. validateCartItem

**用途**: 驗證商品是否可加入購物車（檢查商品狀態與價格設定）

**簽名**:
```typescript
export async function validateCartItem(
  productId: string
): Promise<ActionResult<{ canAdd: boolean; reason?: string }>>
```

**權限**: 客戶 (需登入)

**驗證邏輯**:
```typescript
const { user, tier_id } = await checkAuth()

// 查詢商品與價格
const { data: product } = await supabase
  .from('products')
  .select(`
    id,
    name,
    status,
    tier_prices!inner(price)
  `)
  .eq('id', productId)
  .eq('status', 'active')
  .eq('tier_prices.tier_id', tier_id)
  .single()

if (!product) {
  return {
    success: false,
    data: { canAdd: false, reason: '商品不存在或已停用' }
  }
}

if (!product.tier_prices || product.tier_prices.length === 0) {
  return {
    success: false,
    data: { canAdd: false, reason: '此商品未設定您的等級價格' }
  }
}

return {
  success: true,
  data: { canAdd: true }
}
```

**回傳範例**:
```typescript
// 可加入
{ success: true, data: { canAdd: true } }

// 無法加入
{
  success: false,
  data: {
    canAdd: false,
    reason: '此商品未設定您的等級價格'
  }
}
```

---

### 2. getCartItemsWithPrices

**用途**: 取得購物車商品的完整資訊（名稱、圖片、價格、小計）

**簽名**:
```typescript
export async function getCartItemsWithPrices(
  items: CartItem[]
): Promise<ActionResult<CartItemWithDetails[]>>
```

**權限**: 客戶

**類型定義**:
```typescript
interface CartItemWithDetails {
  productId: string
  name: string
  imageUrl: string | null
  price: number
  quantity: number
  subtotal: number
  stock: number
  status: 'active' | 'inactive'
}
```

**查詢邏輯**:
```typescript
const { user, tier_id } = await checkAuth()

if (items.length === 0) {
  return { success: true, data: [] }
}

const productIds = items.map(i => i.productId)

const { data: products } = await supabase
  .from('products')
  .select(`
    id,
    name,
    image_url,
    stock,
    status,
    tier_prices!inner(price)
  `)
  .in('id', productIds)
  .eq('tier_prices.tier_id', tier_id)

// 合併數量資訊與計算小計
const itemsWithDetails = products.map(p => {
  const cartItem = items.find(i => i.productId === p.id)
  const price = p.tier_prices[0]?.price || 0

  return {
    productId: p.id,
    name: p.name,
    imageUrl: p.image_url,
    price,
    quantity: cartItem?.quantity || 1,
    subtotal: price * (cartItem?.quantity || 1),
    stock: p.stock,
    status: p.status
  }
})

return { success: true, data: itemsWithDetails }
```

**回傳範例**:
```typescript
{
  success: true,
  data: [
    {
      productId: '...',
      name: '珍珠奶茶',
      imageUrl: 'https://...',
      price: 30,
      quantity: 50,
      subtotal: 1500,
      stock: 100,
      status: 'active'
    }
  ]
}
```

**錯誤處理**:
- 若某商品已被刪除或停用，回傳時標記 `status: 'inactive'`
- 若某商品未設定價格，`price: null`
- UI 應顯示警告並提示客戶移除該商品

---

### 3. validateCartBeforeCheckout

**用途**: 結帳前驗證購物車（確保所有商品可下單）

**簽名**:
```typescript
export async function validateCartBeforeCheckout(
  items: CartItem[]
): Promise<ActionResult<{
  valid: boolean
  invalidItems?: Array<{ productId: string; reason: string }>
}>>
```

**驗證項目**:
1. 購物車不為空
2. 所有商品狀態為 `active`
3. 所有商品有設定當前用戶等級的價格

**回傳範例**:
```typescript
// 全部有效
{
  success: true,
  data: { valid: true }
}

// 有無效商品
{
  success: false,
  data: {
    valid: false,
    invalidItems: [
      { productId: '...', reason: '商品已停用' },
      { productId: '...', reason: '未設定價格' }
    ]
  }
}
```

---

## Usage Flow

### 1. 加入商品到購物車

```typescript
// 1. UI: 用戶點擊「加入購物車」
async function handleAddToCart(productId: string) {
  // 2. 驗證商品是否可加入
  const result = await validateCartItem(productId)

  if (!result.success || !result.data.canAdd) {
    toast.error(result.data.reason || '無法加入購物車')
    return
  }

  // 3. 加入 Zustand store
  useCartStore.getState().addItem(productId, 1)
  toast.success('已加入購物車')
}
```

### 2. 購物車頁面顯示

```typescript
// 1. 從 Zustand 取得購物車項目
const items = useCartStore(state => state.items)

// 2. 透過 Server Action 取得完整資訊
const { data: itemsWithDetails } = await getCartItemsWithPrices(items)

// 3. 渲染購物車列表 (含價格、圖片、小計)
// 4. 計算總價
const total = itemsWithDetails.reduce((sum, item) => sum + item.subtotal, 0)
```

### 3. 結帳流程

```typescript
// 1. 驗證購物車
const validation = await validateCartBeforeCheckout(items)

if (!validation.data.valid) {
  toast.error('購物車有無效商品，請移除後再試')
  return
}

// 2. 導向訂單確認頁面
router.push('/store/checkout')

// 3. 送出訂單後清空購物車
await createOrder(items, notes)
useCartStore.getState().clearCart()
```

---

## Data Consistency

### 問題：購物車中商品價格過期

**情境**: 客戶將商品加入購物車後，管理員修改了價格

**解決方案**:
1. 購物車僅儲存 `productId` 與 `quantity`，不儲存價格
2. 每次顯示購物車時重新查詢最新價格
3. 下單時使用最新價格建立訂單（價格快照）

### 問題：購物車中商品已刪除或停用

**情境**: 客戶將商品加入購物車後，管理員刪除或停用該商品

**解決方案**:
1. `getCartItemsWithPrices` 回傳時標記 `status: 'inactive'`
2. UI 顯示警告：「此商品已停用」
3. 結帳時 `validateCartBeforeCheckout` 阻止下單並提示移除

---

## Testing Checklist

- [ ] 加入商品到購物車（Zustand state 更新）
- [ ] 購物車持久化（重新整理頁面後仍存在）
- [ ] 調整商品數量
- [ ] 移除商品
- [ ] 購物車數量徽章顯示正確
- [ ] 查詢購物車商品資訊與價格
- [ ] 商品價格變更後購物車顯示最新價格
- [ ] 商品停用後購物車顯示警告
- [ ] 商品未設定價格時無法加入購物車
- [ ] 結帳前驗證購物車

---

**Status**: ✅ Completed
**Related**: orders.md
**Date**: 2026-01-03
