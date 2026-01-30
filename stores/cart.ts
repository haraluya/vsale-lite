import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Coupon } from '@/types'
import type { SelectedProduct } from '@/types/combo-deals'

/**
 * 購物車狀態管理
 * Feature: 004-cart-and-orders, 009-coupon-system, 021-combo-deals
 *
 * 使用 Zustand persist middleware 將購物車資料儲存於 localStorage
 * 資料結構: { productId, quantity } - 最小化儲存,價格即時查詢
 *
 * 🆕 Feature 009: 新增優惠券支援
 * - appliedCoupon: 已套用的優惠券
 * - couponDiscount: 優惠券折扣金額
 * - 購物車商品變更時自動重新驗證優惠券 (T027)
 * - 不符合條件時自動移除優惠券 (T028)
 *
 * 🆕 Feature 021: 新增組合優惠支援
 * - comboDeals: 組合優惠項目陣列
 * - addComboDeal: 加入組合優惠到購物車
 * - removeComboDeal: 移除組合優惠
 * - updateComboDeal: 更新組合優惠選擇
 */

// 組合優惠購物車項目型別
export type ComboDealCartItem = {
  id: string // 購物車項目唯一 ID
  combo_deal_id: string
  combo_deal_name: string
  selected_products: SelectedProduct[]
  original_price: number
  discounted_price: number
  discount_amount: number
}

interface CartState {
  items: CartItem[]

  // 🆕 Feature 009: 優惠券相關狀態
  appliedCoupon: Coupon | null
  couponDiscount: number
  couponValidationCallback: ((valid: boolean, error?: string) => void) | null

  // 🆕 Feature 021: 組合優惠項目
  comboDeals: ComboDealCartItem[]

  // 新增商品到購物車
  addItem: (productId: string, quantity: number) => void

  // 移除商品
  removeItem: (productId: string) => void

  // 更新商品數量
  updateQuantity: (productId: string, quantity: number) => void

  // 清空購物車
  clearCart: () => void

  // 批次移除無效商品
  removeInvalidItems: (invalidProductIds: string[]) => void

  // 取得購物車項目總數
  getTotalItems: () => number

  // 取得特定商品的數量
  getItemQuantity: (productId: string) => number

  // 🆕 Feature 009: 套用優惠券
  applyCoupon: (coupon: Coupon, discountAmount: number) => void

  // 🆕 Feature 009: 移除優惠券
  removeCoupon: () => void

  // 🆕 Feature 009: 清空購物車（含優惠券）
  clearCartWithCoupon: () => void

  // 🆕 T027: 設定優惠券驗證回調函式（購物車商品變更時觸發）
  setCouponValidationCallback: (callback: (valid: boolean, error?: string) => void) => void

  // 🆕 T027: 觸發優惠券重新驗證
  triggerCouponRevalidation: () => void

  // 🆕 Feature 021: 加入組合優惠到購物車
  addComboDeal: (
    comboDealId: string,
    comboDealName: string,
    selectedProducts: SelectedProduct[],
    originalPrice: number,
    discountedPrice: number,
    discountAmount: number
  ) => void

  // 🆕 Feature 021: 移除組合優惠
  removeComboDeal: (comboDealCartItemId: string) => void

  // 🆕 Feature 021: 更新組合優惠選擇
  updateComboDeal: (
    comboDealCartItemId: string,
    selectedProducts: SelectedProduct[],
    originalPrice: number,
    discountedPrice: number,
    discountAmount: number
  ) => void

  // 🆕 Feature 021: 取得組合優惠項目
  getComboDeal: (comboDealCartItemId: string) => ComboDealCartItem | undefined
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      // 🆕 Feature 009: 優惠券狀態初始化
      appliedCoupon: null,
      couponDiscount: 0,
      couponValidationCallback: null,

      // 🆕 Feature 021: 組合優惠項目初始化
      comboDeals: [],

      addItem: (productId, quantity) => {
        const items = get().items
        const existingItem = items.find(item => item.productId === productId)

        if (existingItem) {
          // 商品已存在,累加數量
          set({
            items: items.map(item =>
              item.productId === productId
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          })
        } else {
          // 新商品,加入購物車
          set({ items: [...items, { productId, quantity }] })
        }

        // T027: 購物車商品變更時觸發優惠券重新驗證
        get().triggerCouponRevalidation()
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter(item => item.productId !== productId),
        })

        // T027: 購物車商品變更時觸發優惠券重新驗證
        get().triggerCouponRevalidation()
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          // 數量 <= 0 則移除商品
          get().removeItem(productId)
        } else {
          set({
            items: get().items.map(item =>
              item.productId === productId
                ? { ...item, quantity }
                : item
            ),
          })

          // T027: 購物車商品變更時觸發優惠券重新驗證
          get().triggerCouponRevalidation()
        }
      },

      clearCart: () => {
        set({ items: [] })
      },

      removeInvalidItems: (invalidProductIds) => {
        const validItems = get().items.filter(
          item => !invalidProductIds.includes(item.productId)
        )
        set({ items: validItems })
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },

      getItemQuantity: (productId) => {
        const item = get().items.find(item => item.productId === productId)
        return item?.quantity || 0
      },

      // 🆕 Feature 009: 套用優惠券（追蹤特定領取記錄 ID）
      applyCoupon: (coupon, discountAmount) => {
        set({
          appliedCoupon: coupon,  // coupon 物件包含 user_coupon_id
          couponDiscount: discountAmount,
        })
      },

      // 🆕 Feature 009: 移除優惠券
      removeCoupon: () => {
        set({
          appliedCoupon: null,
          couponDiscount: 0,
        })
      },

      // 🆕 Feature 009: 清空購物車（含優惠券）
      // 🔧 Feature 021: 同時清空組合優惠項目
      clearCartWithCoupon: () => {
        set({
          items: [],
          comboDeals: [],
          appliedCoupon: null,
          couponDiscount: 0,
        })
      },

      // 🆕 T027: 設定優惠券驗證回調函式
      setCouponValidationCallback: (callback) => {
        set({ couponValidationCallback: callback })
      },

      // 🆕 T027-T028: 觸發優惠券重新驗證
      triggerCouponRevalidation: () => {
        const { appliedCoupon, couponValidationCallback } = get()

        // 若沒有已套用的優惠券或沒有設定回調函式，則跳過
        if (!appliedCoupon || !couponValidationCallback) {
          return
        }

        // 觸發回調函式（由購物車頁面實作驗證邏輯）
        // 回調函式會呼叫 Server Action 驗證優惠券
        // 若驗證失敗，回調函式會呼叫 removeCoupon() 移除優惠券
        couponValidationCallback(true) // 觸發驗證，結果由回調函式處理
      },

      // 🆕 Feature 021: 加入組合優惠到購物車
      addComboDeal: (
        comboDealId,
        comboDealName,
        selectedProducts,
        originalPrice,
        discountedPrice,
        discountAmount
      ) => {
        const newItem: ComboDealCartItem = {
          id: `combo_${comboDealId}_${Date.now()}`, // 唯一 ID
          combo_deal_id: comboDealId,
          combo_deal_name: comboDealName,
          selected_products: selectedProducts,
          original_price: originalPrice,
          discounted_price: discountedPrice,
          discount_amount: discountAmount,
        }

        set({ comboDeals: [...get().comboDeals, newItem] })

        // 觸發優惠券重新驗證
        get().triggerCouponRevalidation()
      },

      // 🆕 Feature 021: 移除組合優惠
      removeComboDeal: (comboDealCartItemId) => {
        set({
          comboDeals: get().comboDeals.filter(item => item.id !== comboDealCartItemId),
        })

        // 觸發優惠券重新驗證
        get().triggerCouponRevalidation()
      },

      // 🆕 Feature 021: 更新組合優惠選擇
      updateComboDeal: (
        comboDealCartItemId,
        selectedProducts,
        originalPrice,
        discountedPrice,
        discountAmount
      ) => {
        set({
          comboDeals: get().comboDeals.map(item =>
            item.id === comboDealCartItemId
              ? {
                  ...item,
                  selected_products: selectedProducts,
                  original_price: originalPrice,
                  discounted_price: discountedPrice,
                  discount_amount: discountAmount,
                }
              : item
          ),
        })

        // 觸發優惠券重新驗證
        get().triggerCouponRevalidation()
      },

      // 🆕 Feature 021: 取得組合優惠項目
      getComboDeal: (comboDealCartItemId) => {
        return get().comboDeals.find(item => item.id === comboDealCartItemId)
      },
    }),
    {
      name: 'vsale-cart-storage', // localStorage key
      version: 3, // 🆕 Feature 021: 版本升級（新增組合優惠欄位）
      // couponValidationCallback 不持久化（函式無法序列化）
      partialize: (state) => ({
        items: state.items,
        appliedCoupon: state.appliedCoupon,
        couponDiscount: state.couponDiscount,
        comboDeals: state.comboDeals, // 🆕 Feature 021
      }),
      // 🔧 Migrate 函式：版本升級
      migrate: (persistedState: any, version: number) => {
        if (version === 1) {
          // v1 → v2: 新增優惠券相關欄位
          return {
            ...persistedState,
            appliedCoupon: null,
            couponDiscount: 0,
            comboDeals: [], // v1 → v3 直接升級
          }
        }
        if (version === 2) {
          // v2 → v3: 新增組合優惠欄位
          return {
            ...persistedState,
            comboDeals: [],
          }
        }
        return persistedState
      },
    }
  )
)
