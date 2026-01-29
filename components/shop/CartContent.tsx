/**
 * Cart Content (Client Component)
 * Feature: 004-cart-and-orders (US1 - 客戶加入商品到購物車)
 * Feature: 009-coupon-system (優惠券整合)
 * Feature: 021-combo-deals (Phase 7 - T063 - 購物車組合優惠整合)
 *
 * 購物車頁面內容
 * - 顯示購物車商品列表
 * - 顯示組合優惠項目（黃色背景標示）
 * - 支援數量調整、移除商品
 * - 顯示總金額與結帳按鈕
 * - 支援優惠券選擇與折扣計算
 * - 支援購物車持久化 (Zustand persist)
 */

'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@/stores/cart'
import { getCartItemsWithPrices } from '@/lib/actions/cart'
import { validateCoupon } from '@/lib/actions/coupons'
import { CartItem } from '@/components/shop/cart-item'
import { CartSummary } from '@/components/shop/cart-summary'
import { CouponSelector } from '@/components/shop/coupons/CouponSelector'
import { ComboDealCartItem } from '@/components/shop/combo-deals/ComboDealCartItem' // 🆕 Feature 021
import type { CartItemWithProduct } from '@/types'
import Link from 'next/link'
import { toast } from 'sonner'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export function CartContent() {
  const {
    items,
    getTotalItems,
    removeInvalidItems,
    appliedCoupon,
    couponDiscount,
    removeCoupon,
    applyCoupon,
    comboDeals, // 🆕 Feature 021: 組合優惠項目
  } = useCartStore()
  const [cartItemsWithPrices, setCartItemsWithPrices] = useState<CartItemWithProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCouponSelector, setShowCouponSelector] = useState(false)

  // 載入購物車商品
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

  // 自動驗證已套用的優惠券（頁面載入時 + 購物車商品變更時）
  useEffect(() => {
    async function validateAppliedCoupon() {
      // 若沒有已套用的優惠券，跳過驗證
      if (!appliedCoupon) {
        return
      }

      // 若購物車沒有商品，移除優惠券
      if (cartItemsWithPrices.length === 0) {
        removeCoupon()
        return
      }

      try {
        // 驗證優惠券
        const validationResult = await validateCoupon({
          couponCode: appliedCoupon.code_normalized,
          cartItems: cartItemsWithPrices.map(item => ({
            product_id: item.productId,
            series_id: item.series_id || '',
            price: item.price || 0,
            quantity: item.quantity,
          })),
        })

        if (validationResult.success && validationResult.data) {
          const { valid, error, discountAmount } = validationResult.data

          if (!valid) {
            // 優惠券無效（過期、已使用、已刪除、不符合條件等）
            removeCoupon()
            toast.error(`優惠券已失效：${error || '無法使用此優惠券'}`, {
              duration: 5000,
            })
          } else if (discountAmount !== couponDiscount) {
            // 優惠券有效，但折扣金額改變（購物車商品變更）
            applyCoupon(appliedCoupon, discountAmount || 0)
          }
        } else {
          // 驗證失敗，移除優惠券
          removeCoupon()
          toast.error('優惠券驗證失敗，已自動移除', { duration: 5000 })
        }
      } catch (error) {
        console.error('驗證優惠券錯誤:', error)
        // 發生錯誤時移除優惠券（安全起見）
        removeCoupon()
        toast.error('優惠券驗證失敗，已自動移除', { duration: 5000 })
      }
    }

    validateAppliedCoupon()
  }, [cartItemsWithPrices, appliedCoupon, couponDiscount, removeCoupon, applyCoupon])

  // 🆕 Feature 021: 計算總金額（含組合優惠）
  const normalItemsTotal = cartItemsWithPrices.reduce((sum, item) => sum + item.subtotal, 0)
  const comboDealOriginalTotal = comboDeals.reduce((sum, item) => sum + item.original_price, 0)
  const totalAmount = normalItemsTotal + comboDealOriginalTotal // 使用原價計算，折扣在 CartSummary 中分項顯示

  // 🆕 Feature 021: 計算總商品數（含組合優惠商品）
  const normalItemsCount = getTotalItems()
  const comboDealItemsCount = comboDeals.reduce(
    (sum, item) => sum + item.selected_products.reduce((s, p) => s + p.quantity, 0),
    0
  )
  const totalItems = normalItemsCount + comboDealItemsCount

  // 🆕 Feature 021: 更新 isEmpty 檢查（包含組合優惠）
  const isEmpty = items.length === 0 && comboDeals.length === 0

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
          <h1 className={designTokens.typography.h1}>購物車</h1>
          <p className={cn(
            designTokens.typography.body.base,
            "mt-2 text-gray-600"
          )}>
            {isEmpty ? '您的購物車目前是空的' : `您有 ${totalItems} 件商品在購物車中`}
          </p>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className={cn(
            "rounded-none bg-red-100",
            designTokens.neoBrutalism.border.full,
            "border-red-600",
            "p-4",
            designTokens.spacing.section.marginBottom
          )}>
            <p className="text-red-600 font-bold">❌ {error}</p>
          </div>
        )}

        {/* 載入中 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mb-4 text-6xl">⏳</div>
              <p className={cn(
                designTokens.typography.h3
              )}>載入購物車...</p>
            </div>
          </div>
        ) : isEmpty ? (
          /* 空購物車 */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-6 text-6xl md:text-8xl">🛒</div>
            <h2 className={cn(
              designTokens.typography.h2,
              "mb-4"
            )}>購物車是空的</h2>
            <p className={cn(
              designTokens.typography.body.large,
              "mb-8 text-gray-600"
            )}>趕快去挑選喜歡的商品吧!</p>
            <Link
              href="/store"
              className={cn(
                "rounded-none bg-green-400 font-bold transition-all",
                designTokens.neoBrutalism.border.full,
                "border-black",
                designTokens.neoBrutalism.shadow.full,
                designTokens.neoBrutalism.hover,
                "px-6 py-3 md:px-8 md:py-4",
                designTokens.typography.body.large
              )}
            >
              開始購物
            </Link>
          </div>
        ) : (
          /* 購物車內容 */
          <div className={cn(
            "grid grid-cols-1 lg:grid-cols-3",
            "gap-6 md:gap-8"
          )}>
            {/* 商品列表 */}
            <div className={cn(
              "lg:col-span-2",
              "space-y-3 md:space-y-4"
            )}>
              {/* 🆕 Feature 021: 組合優惠項目 */}
              {comboDeals.map((item) => (
                <ComboDealCartItem key={item.id} item={item} />
              ))}

              {/* 一般商品項目 */}
              {cartItemsWithPrices.map((item) => (
                <CartItem key={item.productId} item={item} />
              ))}
            </div>

            {/* 購物車摘要 */}
            <div className="lg:col-span-1">
              <CartSummary
                totalAmount={totalAmount} // 🆕 包含一般商品 + 組合優惠原價
                totalItems={totalItems}
                isEmpty={isEmpty}
                couponDiscount={couponDiscount}
                couponCode={appliedCoupon?.code_normalized}
                comboDeals={comboDeals} // 🆕 Feature 021: 傳入組合優惠項目
                onOpenCouponSelector={() => setShowCouponSelector(true)}
              />
            </div>
          </div>
        )}
      </div>

      {/* 優惠券選擇器 Modal */}
      {showCouponSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CouponSelector
              cartItems={cartItemsWithPrices.map(item => ({
                productId: item.productId,
                price: item.price ?? 0,
                quantity: item.quantity,
                series_id: item.series_id,
              }))}
              onClose={() => setShowCouponSelector(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
