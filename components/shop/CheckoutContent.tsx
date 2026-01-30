/**
 * Checkout Content (Client Component)
 * Feature: 004-cart-and-orders (US2 - 客戶送出訂單)
 *
 * 訂單確認頁面內容
 * - 顯示購物車商品列表與總金額
 * - 填寫訂單備註
 * - 送出訂單並清空購物車
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/stores/cart'
import { getCartItemsWithPrices, getComboDealProductDetails, validateCartBeforeCheckout } from '@/lib/actions/cart'
import { createOrder } from '@/lib/actions/orders'
import type { CartItemWithProduct, ProductDetailInfo } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'
import { designTokens } from '@/lib/design-tokens'
import { Package } from 'lucide-react'

export function CheckoutContent() {
  const router = useRouter()
  const { items, comboDeals, clearCartWithCoupon, getTotalItems, removeInvalidItems, appliedCoupon, couponDiscount } = useCartStore()

  const [cartItemsWithPrices, setCartItemsWithPrices] = useState<CartItemWithProduct[]>([])
  const [comboDealProductDetails, setComboDealProductDetails] = useState<Map<string, ProductDetailInfo>>(new Map())
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCartItems() {
      if (items.length === 0 && comboDeals.length === 0) {
        setCartItemsWithPrices([])
        setComboDealProductDetails(new Map())
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      // 並行查詢普通商品和組合優惠商品
      const [normalItemsResult, comboDealDetailsResult] = await Promise.all([
        items.length > 0 ? getCartItemsWithPrices(items) : Promise.resolve({ success: true as const, data: [] as CartItemWithProduct[] }),
        comboDeals.length > 0 ? getComboDealProductDetails(comboDeals) : Promise.resolve({ success: true as const, data: new Map<string, ProductDetailInfo>() })
      ])

      if (normalItemsResult.success && normalItemsResult.data) {
        setCartItemsWithPrices(normalItemsResult.data)

        // 檢查是否有無效商品（在 localStorage 中但未返回的商品）
        const validProductIds = normalItemsResult.data.map(item => item.productId)
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
      } else if (!normalItemsResult.success) {
        setError('message' in normalItemsResult ? normalItemsResult.message : '載入購物車商品時發生錯誤')
      }

      if (comboDealDetailsResult.success && comboDealDetailsResult.data) {
        setComboDealProductDetails(comboDealDetailsResult.data)
      }

      setIsLoading(false)
    }

    loadCartItems()
  }, [items, comboDeals, removeInvalidItems])

  // 計算總金額
  const normalItemsTotal = cartItemsWithPrices.reduce((sum, item) => sum + item.subtotal, 0)
  const comboDealOriginalTotal = comboDeals.reduce((sum, deal) => sum + deal.original_price, 0)
  const totalAmount = normalItemsTotal + comboDealOriginalTotal
  const comboDealTotalDiscount = comboDeals.reduce((sum, deal) => sum + deal.discount_amount, 0)
  const finalAmount = totalAmount - comboDealTotalDiscount - couponDiscount
  const totalItems = getTotalItems()
  const isEmpty = items.length === 0 && comboDeals.length === 0

  // 送出訂單
  async function handleSubmitOrder() {
    setError(null)
    setIsSubmitting(true)

    try {
      // 1. 驗證購物車
      const validation = await validateCartBeforeCheckout(items)

      if (!validation.success || !validation.data?.isValid) {
        const message = validation.success && validation.data?.message
          ? validation.data.message
          : validation.message || '購物車驗證失敗'
        setError(message)
        setIsSubmitting(false)
        return
      }

      // 2. 建立訂單（含優惠券資訊與組合優惠）
      const result = await createOrder({
        items,
        comboDealItems: comboDeals.map(deal => ({
          comboDealId: deal.combo_deal_id,
          comboDealName: deal.combo_deal_name,
          selectedProducts: deal.selected_products,
          originalPrice: deal.original_price,
          discountedPrice: deal.discounted_price,
          discountAmount: deal.discount_amount,
        })),
        notes: notes.trim() || null,
        userCouponId: appliedCoupon?.user_coupon_id || null,
      })

      if (!result.success) {
        setError(result.message || '建立訂單時發生錯誤')
        setIsSubmitting(false)
        return
      }

      // 3. 清空購物車（包含一般商品、組合優惠、優惠券）
      clearCartWithCoupon()

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
      <div className={cn(
        "min-h-screen bg-gray-50",
        designTokens.spacing.page.padding
      )}>
        <div className={designTokens.container.default}>
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mb-4 text-6xl">⏳</div>
              <p className={designTokens.typography.h3}>載入訂單資訊...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 空購物車狀態
  if (isEmpty) {
    return (
      <div className={cn(
        "min-h-screen bg-gray-50",
        designTokens.spacing.page.padding
      )}>
        <div className={designTokens.container.default}>
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-6 text-6xl md:text-8xl">🛒</div>
            <h2 className={cn(
              designTokens.typography.h1,
              "mb-4"
            )}>購物車是空的</h2>
            <p className={cn(
              designTokens.typography.body.large,
              "mb-8 text-gray-600"
            )}>請先將商品加入購物車</p>
            <Link
              href="/store"
              className={cn(
                "rounded-none bg-green-400 font-bold transition-all",
                designTokens.neoBrutalism.border.full,
                "border-black",
                designTokens.neoBrutalism.shadow.full,
                designTokens.neoBrutalism.hover,
                "px-6 py-3 md:px-8 md:py-4",
                "min-h-[44px]",
                designTokens.typography.body.large
              )}
            >
              開始購物
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "min-h-screen bg-gray-50",
      designTokens.spacing.page.padding
    )}>
      <div className={cn(
        designTokens.container.default,
        designTokens.spacing.page.gap
      )}>
        {/* 頁面標題 */}
        <div className={designTokens.spacing.section.marginBottom}>
          <h1 className={designTokens.typography.h1}>訂單確認</h1>
          <p className={cn(
            designTokens.typography.body.base,
            "mt-2 text-gray-600"
          )}>請確認訂單資訊後送出</p>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className={cn(
            "rounded-none bg-red-100",
            designTokens.neoBrutalism.border.full,
            "border-red-600",
            "p-3 md:p-4",
            designTokens.spacing.section.marginBottom
          )}>
            <p className="text-red-600 font-bold">❌ {error}</p>
          </div>
        )}

        {/* 訂單內容 */}
        <div className={designTokens.spacing.page.gap}>
          {/* 商品列表 */}
          <div className={cn(
            "rounded-none bg-white",
            designTokens.neoBrutalism.border.full,
            "border-black",
            designTokens.neoBrutalism.shadow.full,
            designTokens.spacing.card.padding
          )}>
            <h2 className={cn(
              designTokens.typography.h2,
              "mb-3 md:mb-4"
            )}>訂單商品</h2>
            <div className={designTokens.spacing.card.gap}>
              {/* 組合優惠項目（先渲染，在上方） */}
              {comboDeals.map((deal) => (
                <div
                  key={deal.id}
                  className={cn(
                    "rounded-none bg-yellow-50 border-2 border-yellow-400 p-3 md:p-4 mb-3 md:mb-4"
                  )}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-yellow-700 flex-shrink-0" />
                    <h3 className={cn("font-bold text-yellow-900", designTokens.typography.body.large)}>
                      📦 {deal.combo_deal_name}
                    </h3>
                  </div>

                  {/* 商品明細 */}
                  <div className="space-y-2 mb-3 ml-7">
                    {deal.selected_products.map((product, index) => {
                      const detail = comboDealProductDetails.get(product.product_id)
                      return (
                        <div
                          key={`${product.product_id}-${index}`}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm"
                        >
                          <div className="flex-1">
                            {detail?.series_name && (
                              <span className={cn(
                                "inline-block rounded-none bg-yellow-100 border border-yellow-400 px-2 py-0.5 mr-2",
                                "text-xs font-bold text-yellow-800"
                              )}>
                                【{detail.series_name}】
                              </span>
                            )}
                            <span className="text-gray-900">
                              {detail?.product_name || product.product_id}
                            </span>
                          </div>
                          <div className="text-gray-600 whitespace-nowrap sm:text-right">
                            {detail?.unit_price ? (
                              <>NT$ {detail.unit_price.toLocaleString()} × {product.quantity}</>
                            ) : (
                              <>× {product.quantity}</>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 價格資訊 */}
                  <div className="border-t-2 border-yellow-300 pt-2 ml-7 space-y-1 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>原價</span>
                      <span className="line-through">NT$ {deal.original_price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>組合優惠折扣</span>
                      <span>- NT$ {deal.discount_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t border-yellow-300">
                      <span>優惠價</span>
                      <span className="text-green-600 text-lg">NT$ {deal.discounted_price.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* 普通商品項目 */}
              {cartItemsWithPrices.map((item) => (
                <div
                  key={item.productId}
                  className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 border-b-2 border-gray-200 pb-3 md:pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex-1">
                    {/* 系列名稱標籤 */}
                    <div className={cn(
                      "inline-block rounded-none bg-yellow-100 border-2 border-yellow-400 px-2 py-1 mb-1",
                      "text-xs font-bold text-yellow-800"
                    )}>
                      【{item.seriesName}】
                    </div>
                    <h3 className={cn(
                      "font-bold",
                      designTokens.typography.body.large
                    )}>{item.productName}</h3>
                    <p className={cn(
                      designTokens.typography.caption,
                      "text-gray-600"
                    )}>
                      單價: {formatCurrency(item.price || 0)} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg md:text-xl font-bold text-green-600">
                      {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 總計 */}
            <div className={cn(
              "mt-4 md:mt-6 pt-3 md:pt-4",
              designTokens.neoBrutalism.border.mobile,
              "md:border-t-3",
              "border-t-black"
            )}>
              <div className="space-y-2">
                {/* 普通商品總額 */}
                {normalItemsTotal > 0 && (
                  <div className="flex items-center justify-between text-gray-700">
                    <p className={designTokens.typography.body.base}>普通商品總額</p>
                    <p className="text-base font-semibold">
                      {formatCurrency(normalItemsTotal)}
                    </p>
                  </div>
                )}

                {/* 組合優惠原價 */}
                {comboDeals.length > 0 && (
                  <div className="flex items-center justify-between text-gray-700">
                    <p className={designTokens.typography.body.base}>組合優惠原價</p>
                    <p className="text-base font-semibold">
                      {formatCurrency(comboDealOriginalTotal)}
                    </p>
                  </div>
                )}

                {/* 商品總額（小計） */}
                <div className={cn(
                  "flex items-center justify-between pt-2 border-t border-gray-300"
                )}>
                  <p className={cn(designTokens.typography.body.large, "font-semibold")}>商品總額</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>

                {/* 組合優惠折扣（分項顯示） */}
                {comboDeals.map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between text-green-600">
                    <p className={cn(designTokens.typography.body.base, "truncate mr-2")}>
                      組合優惠折扣 - {deal.combo_deal_name}
                    </p>
                    <p className="text-base font-bold whitespace-nowrap">
                      -{formatCurrency(deal.discount_amount)}
                    </p>
                  </div>
                ))}

                {/* 優惠券折扣 */}
                {appliedCoupon && couponDiscount > 0 && (
                  <div className="flex items-center justify-between text-orange-600">
                    <p className={designTokens.typography.body.base}>
                      優惠券折扣 ({appliedCoupon.code_normalized})
                    </p>
                    <p className="text-base font-bold">
                      -{formatCurrency(couponDiscount)}
                    </p>
                  </div>
                )}

                {/* 運費提示 */}
                <div className="flex items-center justify-between text-gray-600 text-sm pt-2 border-t border-gray-200">
                  <p>運費</p>
                  <p>（訂單送出後計算）</p>
                </div>

                {/* 最終總額 */}
                <div className={cn(
                  "flex items-center justify-between pt-2",
                  designTokens.neoBrutalism.border.mobile,
                  "md:border-t-2",
                  "border-t-gray-300"
                )}>
                  <p className={designTokens.typography.h3}>訂單總金額</p>
                  <p className="text-2xl md:text-3xl font-bold text-green-600">
                    {formatCurrency(finalAmount)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 訂單備註 */}
          <div className={cn(
            "rounded-none bg-white",
            designTokens.neoBrutalism.border.full,
            "border-black",
            designTokens.neoBrutalism.shadow.full,
            designTokens.spacing.card.padding
          )}>
            <h2 className={cn(
              designTokens.typography.h2,
              "mb-3 md:mb-4"
            )}>訂單備註 (選填)</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="例如: 請盡快出貨、包裝需求等..."
              className={cn(
                "w-full rounded-none",
                designTokens.neoBrutalism.border.full,
                "border-black",
                "p-3 md:p-4",
                designTokens.typography.body.base,
                "focus:outline-none focus:ring-2 focus:ring-green-400"
              )}
            />
            <p className={cn(
              "mt-2",
              designTokens.typography.caption,
              "text-gray-600"
            )}>
              {notes.length} / 500 字
            </p>
          </div>

          {/* 操作按鈕 */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <Link
              href="/store/cart"
              className={cn(
                "flex-1 rounded-none bg-gray-200 text-center font-bold transition-all",
                designTokens.neoBrutalism.border.full,
                "border-black",
                designTokens.neoBrutalism.shadow.full,
                designTokens.neoBrutalism.hover,
                "px-4 py-3 md:px-6 md:py-4",
                "min-h-[44px]",
                designTokens.typography.body.large
              )}
            >
              返回購物車
            </Link>
            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting || isEmpty}
              className={cn(
                "flex-1 rounded-none bg-green-400 font-bold transition-all",
                designTokens.neoBrutalism.border.full,
                "border-black",
                designTokens.neoBrutalism.shadow.full,
                designTokens.neoBrutalism.hover,
                "px-4 py-3 md:px-6 md:py-4",
                "min-h-[44px]",
                designTokens.typography.body.large,
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-neo"
              )}
            >
              {isSubmitting ? '送出中...' : '確認送出訂單'}
            </button>
          </div>

          {/* 提示訊息 */}
          <div className={cn(
            "rounded-none bg-gray-50",
            "border-2 border-gray-300",
            "p-3 md:p-4"
          )}>
            <p className={cn(
              designTokens.typography.caption,
              "text-gray-600"
            )}>
              📝 訂單送出後，我們將盡快為您處理。您可以在「我的訂單」查看訂單狀態。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
