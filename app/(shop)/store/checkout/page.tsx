/**
 * Checkout Page
 * Feature: 004-cart-and-orders (US2 - 客戶送出訂單)
 * Route: /store/checkout
 *
 * 訂單確認頁面
 * - 顯示購物車商品列表與總金額
 * - 填寫訂單備註
 * - 送出訂單並清空購物車
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/stores/cart'
import { getCartItemsWithPrices, validateCartBeforeCheckout } from '@/lib/actions/cart'
import { createOrder } from '@/lib/actions/orders'
import type { CartItemWithProduct } from '@/types'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, clearCart, getTotalItems, removeInvalidItems } = useCartStore()

  const [cartItemsWithPrices, setCartItemsWithPrices] = useState<CartItemWithProduct[]>([])
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  // 送出訂單
  async function handleSubmitOrder() {
    setError(null)
    setIsSubmitting(true)

    try {
      // 1. 驗證購物車
      const validation = await validateCartBeforeCheckout(items)

      if (!validation.success || !validation.data?.isValid) {
        setError(validation.data?.message || '購物車驗證失敗')
        setIsSubmitting(false)
        return
      }

      // 2. 建立訂單
      const result = await createOrder({
        items,
        notes: notes.trim() || null,
      })

      if (!result.success) {
        setError(result.message || '建立訂單時發生錯誤')
        setIsSubmitting(false)
        return
      }

      // 3. 清空購物車
      clearCart()

      // 4. 導向訂單詳情頁面 (顯示成功訊息)
      router.push(`/store/orders/${result.data?.orderId}?success=true`)
    } catch (err) {
      console.error('送出訂單錯誤:', err)
      setError('送出訂單時發生未知錯誤')
      setIsSubmitting(false)
    }
  }

  // 載入中狀態
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mb-4 text-6xl">⏳</div>
              <p className="text-xl font-bold">載入訂單資訊...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 空購物車狀態
  if (isEmpty) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-6 text-8xl">🛒</div>
            <h2 className="mb-4 text-3xl font-bold">購物車是空的</h2>
            <p className="mb-8 text-gray-600">請先將商品加入購物車</p>
            <Link
              href="/store"
              className="rounded-none border-3 border-black bg-green-400 px-8 py-4 text-lg font-bold shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              開始購物
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold">訂單確認</h1>
          <p className="mt-2 text-gray-600">請確認訂單資訊後送出</p>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-6 rounded-none border-3 border-red-600 bg-red-100 p-4">
            <p className="text-red-600 font-bold">❌ {error}</p>
          </div>
        )}

        {/* 訂單內容 */}
        <div className="space-y-6">
          {/* 商品列表 */}
          <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
            <h2 className="mb-4 text-2xl font-bold">訂單商品</h2>
            <div className="space-y-4">
              {cartItemsWithPrices.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between border-b-2 border-gray-200 pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex-1">
                    <h3 className="font-bold">{item.productName}</h3>
                    <p className="text-sm text-gray-600">
                      單價: {formatCurrency(item.price || 0)} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 總計 */}
            <div className="mt-6 border-t-3 border-black pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xl font-bold">訂單總金額</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* 訂單備註 */}
          <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
            <h2 className="mb-4 text-2xl font-bold">訂單備註 (選填)</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="例如: 請盡快出貨、包裝需求等..."
              className="w-full rounded-none border-3 border-black p-4 text-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <p className="mt-2 text-sm text-gray-600">
              {notes.length} / 500 字
            </p>
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-4">
            <Link
              href="/store/cart"
              className="flex-1 rounded-none border-3 border-black bg-gray-200 px-6 py-4 text-center text-lg font-bold shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              返回購物車
            </Link>
            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting || isEmpty}
              className="flex-1 rounded-none border-3 border-black bg-green-400 px-6 py-4 text-lg font-bold shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '送出中...' : '確認送出訂單'}
            </button>
          </div>

          {/* 提示訊息 */}
          <div className="rounded-none border-2 border-gray-300 bg-gray-50 p-4">
            <p className="text-sm text-gray-600">
              📝 訂單送出後，我們將盡快為您處理。您可以在「我的訂單」查看訂單狀態。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
