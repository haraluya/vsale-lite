'use client'

/**
 * CartSummary Component
 * Feature: 004-cart-and-orders (US1 - 客戶加入商品到購物車)
 * Feature: 009-coupon-system (優惠券折扣顯示)
 * Feature: 011-shipping-and-order-edit (US2 - 訂單建立時自動計算運費)
 * Feature: 021-combo-deals (Phase 7 - T061 - 組合優惠折扣顯示)
 *
 * 購物車摘要元件
 * - 顯示總金額、總數量
 * - 使用統一計算模組顯示折扣明細
 * - 會員專屬折扣（藍色）
 * - 優惠折扣加總 + 展開明細（紅色）
 * - 顯示運費預覽（自動計算）
 * - 提供結帳按鈕
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingCart, Ticket, Truck, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  getShippingFeeStatusText,
  getShippingFeeColorClass,
  calculateFreeShippingGap,
  formatFreeShippingMessage,
} from '@/lib/utils/shipping-calculator'
import { calculateGrandTotal } from '@/lib/pricing/order-calculator'
import type { OrderCalculationResult } from '@/lib/pricing/order-calculator'
import type { ComboDealCartItem } from '@/stores/cart'

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

  // 計算運費（優化：並行查詢）
  useEffect(() => {
    async function fetchShippingFee() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setShippingFee(0)
        setFreeShippingThreshold(null)
        setIsLoadingShipping(false)
        return
      }

      try {
        const [shippingResult, profileResult] = await Promise.all([
          supabase.rpc('calculate_shipping_fee', {
            p_user_id: user.id,
            p_subtotal: shippingSubtotal, // 修正：使用普通等級價 + 組合折後價
          }),
          supabase
            .from('profiles')
            .select(`tier_id, tiers!inner (free_shipping_threshold)`)
            .eq('id', user.id)
            .single(),
        ])

        if (shippingResult.error) {
          console.error('計算運費失敗:', shippingResult.error)
          setShippingFee(0)
        } else {
          setShippingFee(shippingResult.data ?? 0)
        }

        if (profileResult.data?.tiers) {
          setFreeShippingThreshold(
            (profileResult.data.tiers as any).free_shipping_threshold ?? null
          )
        } else {
          setFreeShippingThreshold(null)
        }
      } catch (error) {
        console.error('取得運費資訊失敗:', error)
        setShippingFee(0)
        setFreeShippingThreshold(null)
      } finally {
        setIsLoadingShipping(false)
      }
    }

    if (!isEmpty) {
      fetchShippingFee()
    } else {
      setShippingFee(0)
      setFreeShippingThreshold(null)
      setIsLoadingShipping(false)
    }
  }, [shippingSubtotal, isEmpty])

  const freeShippingGap = calculateFreeShippingGap(shippingSubtotal, freeShippingThreshold)
  const freeShippingMessage = formatFreeShippingMessage(freeShippingGap)

  return (
    <div className="sticky top-24 rounded-theme-sm border-theme bg-surface p-6 shadow-neo">
      <h2 className="mb-6 text-2xl font-bold">購物車摘要</h2>

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
            <span className="text-sm text-blue-600 font-bold">會員專屬折扣</span>
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

            {discountExpanded && discountDetails.length > 0 && (
              <div className="pl-3 mt-2 space-y-1 border-l-2 border-red-200">
                {discountDetails.map((d, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-xs text-text-secondary">{d.label}</span>
                    <span className="text-xs text-red-400">- NT$ {d.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {!canExpand && discountDetails.length === 1 && (
              <div className="pl-3 mt-1 border-l-2 border-red-200">
                <span className="text-xs text-text-secondary">{discountDetails[0].label}</span>
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
          <span className={`text-lg font-bold ${getShippingFeeColorClass(isLoadingShipping, shippingFee)}`}>
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

        {/* 結帳按鈕 */}
        {isEmpty ? (
          <button disabled className="w-full cursor-not-allowed rounded-theme-sm border-theme bg-gray-200 px-6 py-4 text-lg font-bold text-text-secondary opacity-50">
            購物車是空的
          </button>
        ) : (
          <Link
            href="/store/checkout"
            className="flex w-full items-center justify-center gap-2 rounded-theme-sm border-theme bg-green-400 dark:bg-green-600 px-6 py-4 text-lg font-bold shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover"
          >
            <ShoppingCart className="h-6 w-6" />
            前往結帳
          </Link>
        )}

        {/* 繼續購物按鈕 */}
        <Link
          href="/store"
          className="block w-full rounded-theme-sm border-theme bg-surface px-6 py-3 text-center font-bold shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover"
        >
          繼續購物
        </Link>
      </div>

      {/* 提示訊息 */}
      <div className="mt-6 rounded-theme-sm border bg-yellow-100 dark:bg-yellow-900 p-4">
        <p className="text-sm text-foreground">
          <strong>提示:</strong> 商品價格為您的會員等級專屬價格,結帳前請確認購物車內容。
        </p>
      </div>
    </div>
  )
}
