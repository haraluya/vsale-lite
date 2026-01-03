import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@/types'

/**
 * 購物車狀態管理
 * Feature: 004-cart-and-orders
 *
 * 使用 Zustand persist middleware 將購物車資料儲存於 localStorage
 * 資料結構: { productId, quantity } - 最小化儲存,價格即時查詢
 */

interface CartState {
  items: CartItem[]

  // 新增商品到購物車
  addItem: (productId: string, quantity: number) => void

  // 移除商品
  removeItem: (productId: string) => void

  // 更新商品數量
  updateQuantity: (productId: string, quantity: number) => void

  // 清空購物車
  clearCart: () => void

  // 取得購物車項目總數
  getTotalItems: () => number

  // 取得特定商品的數量
  getItemQuantity: (productId: string) => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

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
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter(item => item.productId !== productId),
        })
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
        }
      },

      clearCart: () => {
        set({ items: [] })
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },

      getItemQuantity: (productId) => {
        const item = get().items.find(item => item.productId === productId)
        return item?.quantity || 0
      },
    }),
    {
      name: 'vsale-cart-storage', // localStorage key
      version: 1, // 版本控制,未來可用於資料遷移
    }
  )
)
