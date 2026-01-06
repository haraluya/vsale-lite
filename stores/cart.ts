import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Coupon } from '@/types'

/**
 * 購物車狀態管理
 * Feature: 004-cart-and-orders, 009-coupon-system
 *
 * 使用 Zustand persist middleware 將購物車資料儲存於 localStorage
 * 資料結構: { productId, quantity } - 最小化儲存,價格即時查詢
 *
 * 🆕 Feature 009: 新增優惠券支援
 * - appliedCoupon: 已套用的優惠券
 * - couponDiscount: 優惠券折扣金額
 * - 購物車商品變更時自動重新驗證優惠券 (T027)
 * - 不符合條件時自動移除優惠券 (T028)
 */

interface CartState {
  items: CartItem[]

  // 🆕 Feature 009: 優惠券相關狀態
  appliedCoupon: Coupon | null
  couponDiscount: number
  couponValidationCallback: ((valid: boolean, error?: string) => void) | null

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
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      // 🆕 Feature 009: 優惠券狀態初始化
      appliedCoupon: null,
      couponDiscount: 0,
      couponValidationCallback: null,

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

      // 🆕 Feature 009: 套用優惠券
      applyCoupon: (coupon, discountAmount) => {
        set({
          appliedCoupon: coupon,
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
      clearCartWithCoupon: () => {
        set({
          items: [],
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
    }),
    {
      name: 'vsale-cart-storage', // localStorage key
      version: 2, // 🆕 Feature 009: 版本升級（新增優惠券欄位）
      // couponValidationCallback 不持久化（函式無法序列化）
      partialize: (state) => ({
        items: state.items,
        appliedCoupon: state.appliedCoupon,
        couponDiscount: state.couponDiscount,
      }),
    }
  )
)
