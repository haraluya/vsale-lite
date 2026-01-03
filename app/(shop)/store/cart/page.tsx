/**
 * Cart Page
 * Feature: 004-cart-and-orders (US1 - 客戶加入商品到購物車)
 * Route: /store/cart
 *
 * 購物車頁面
 * - 顯示購物車商品列表
 * - 支援數量調整、移除商品
 * - 顯示總金額與結帳按鈕
 * - 支援購物車持久化 (Zustand persist)
 */

'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@/stores/cart'
import { getCartItemsWithPrices } from '@/lib/actions/cart'
import { CartItem } from '@/components/shop/cart-item'
import { CartSummary } from '@/components/shop/cart-summary'
import type { CartItemWithProduct } from '@/types'
import { ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function CartPage() {
  const { items, getTotalItems, removeInvalidItems } = useCartStore()
  const [cartItemsWithPrices, setCartItemsWithPrices] = useState<CartItemWithProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCartItems() {
      if (items.length === 0) {
        setCartItemsWithPrices([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      const result = await getCartItemsWithPrices(items)

      if (result.success && result.data) {
        setCartItemsWithPrices(result.data)

        // 檢查是否有無效商品（在 localStorage 中但未返回的商品）
        const validProductIds = result.data.map(item => item.productId)
        const invalidProductIds = items
          .map(item => item.productId)
          .filter(id => !validProductIds.includes(id))

        // 自動移除無效商品
        if (invalidProductIds.length > 0) {
          removeInvalidItems(invalidProductIds)
          toast.warning(
            `已自動移除 ${invalidProductIds.length} 個無效商品（商品已刪除或停用）`,
            { duration: 5000 }
          )
        }
      } else {
        setError(result.message || '載入購物車商品時發生錯誤')
      }
      setIsLoading(false)
    }

    loadCartItems()
  }, [items, removeInvalidItems])

  // 計算總金額
  const totalAmount = cartItemsWithPrices.reduce((sum, item) => sum + item.subtotal, 0)
  const totalItems = getTotalItems()
  const isEmpty = items.length === 0

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold">購物車</h1>
          <p className="mt-2 text-gray-600">
            {isEmpty ? '您的購物車目前是空的' : `您有 ${totalItems} 件商品在購物車中`}
          </p>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-6 rounded-none border-3 border-red-600 bg-red-100 p-4">
            <p className="text-red-600 font-bold">❌ {error}</p>
          </div>
        )}

        {/* 載入中 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mb-4 text-6xl">⏳</div>
              <p className="text-xl font-bold">載入購物車...</p>
            </div>
          </div>
        ) : isEmpty ? (
          /* 空購物車 */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-6 text-8xl">🛒</div>
            <h2 className="mb-4 text-3xl font-bold">購物車是空的</h2>
            <p className="mb-8 text-gray-600">趕快去挑選喜歡的商品吧!</p>
            <Link
              href="/store"
              className="rounded-none border-3 border-black bg-green-400 px-8 py-4 text-lg font-bold shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              開始購物
            </Link>
          </div>
        ) : (
          /* 購物車內容 */
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* 商品列表 */}
            <div className="lg:col-span-2 space-y-4">
              {cartItemsWithPrices.map((item) => (
                <CartItem key={item.productId} item={item} />
              ))}
            </div>

            {/* 購物車摘要 */}
            <div className="lg:col-span-1">
              <CartSummary
                totalAmount={totalAmount}
                totalItems={totalItems}
                isEmpty={isEmpty}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
