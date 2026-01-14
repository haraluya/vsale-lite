'use client'

/**
 * CartSummary Component
 * Feature: 004-cart-and-orders (US1 - 客戶加入商品到購物車)
 * Feature: 009-coupon-system (優惠券折扣顯示)
 * Feature: 011-shipping-and-order-edit (US2 - 訂單建立時自動計算運費)
 *
 * 購物車摘要元件
 * - 顯示總金額、總數量
 * - 顯示優惠券折扣（如果有）
 * - 顯示運費預覽（自動計算）
 * - 提供結帳按鈕
 * - Neo-Brutalism 設計風格
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, Ticket, Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  getShippingFeeStatusText,
  getShippingFeeColorClass,
  calculateFreeShippingGap,
  formatFreeShippingMessage,
} from '@/lib/utils/shipping-calculator'

interface CartSummaryProps {
  totalAmount: number
  totalItems: number
  isEmpty: boolean
  couponDiscount?: number
  couponCode?: string
  onOpenCouponSelector?: () => void
}

export function CartSummary({
  totalAmount,
  totalItems,
  isEmpty,
  couponDiscount = 0,
  couponCode,
  onOpenCouponSelector,
}: CartSummaryProps) {
  const [shippingFee, setShippingFee] = useState<number | null>(null)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | null>(null)
  const [isLoadingShipping, setIsLoadingShipping] = useState(true)

  // 計算運費
  useEffect(() => {
    async function fetchShippingFee() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setShippingFee(0)
        setFreeShippingThreshold(null)
        setIsLoadingShipping(false)
        return
      }

      // 呼叫 calculate_shipping_fee RPC
      const { data, error } = await supabase.rpc('calculate_shipping_fee', {
        p_user_id: user.id,
        p_subtotal: totalAmount, // 依原始商品金額計算（不含優惠券折扣）
      })

      if (error) {
        console.error('計算運費失敗:', error)
        setShippingFee(0)
      } else {
        setShippingFee(data ?? 0)
      }

      // 取得用戶等級的免運門檻（用於顯示「再購 XX 即可免運」提示）
      const { data: profileData } = await supabase
        .from('profiles')
        .select('tier_id')
        .eq('id', user.id)
        .single()

      if (profileData?.tier_id) {
        const { data: tierData } = await supabase
          .from('tiers')
          .select('free_shipping_threshold')
          .eq('id', profileData.tier_id)
          .single()

        setFreeShippingThreshold(tierData?.free_shipping_threshold ?? null)
      }

      setIsLoadingShipping(false)
    }

    if (!isEmpty) {
      fetchShippingFee()
    } else {
      setShippingFee(0)
      setFreeShippingThreshold(null)
      setIsLoadingShipping(false)
    }
  }, [totalAmount, isEmpty])

  // 計算距離免運門檻的差額
  const freeShippingGap = calculateFreeShippingGap(totalAmount, freeShippingThreshold)
  const freeShippingMessage = formatFreeShippingMessage(freeShippingGap)

  // 計算最終總金額
  const finalAmount = totalAmount - couponDiscount + (shippingFee ?? 0)

  return (
    <div className="sticky top-24 rounded-none border-2 md:border-3 border-black bg-white p-6 shadow-neo">
      <h2 className="mb-6 text-2xl font-bold">購物車摘要</h2>

      <div className="space-y-4">
        {/* 總數量 */}
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <span className="text-gray-600">商品總數</span>
          <span className="text-xl font-bold">{totalItems} 件</span>
        </div>

        {/* 商品總金額 */}
        <div className="flex items-center justify-between pb-2">
          <span className="text-gray-600">商品金額</span>
          <span className="text-lg font-bold">
            NT$ {totalAmount.toLocaleString()}
          </span>
        </div>

        {/* 優惠券折扣 */}
        {couponDiscount > 0 && couponCode && (
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm text-orange-600 font-bold">
              <Ticket className="inline w-4 h-4 mr-1" />
              優惠券折扣 ({couponCode})
            </span>
            <span className="text-lg font-bold text-orange-600">
              - NT$ {couponDiscount.toLocaleString()}
            </span>
          </div>
        )}

        {/* 運費 */}
        <div className="flex items-center justify-between pb-2">
          <span className="text-gray-600 flex items-center gap-1">
            <Truck className="w-4 h-4" />
            運費
          </span>
          <span
            className={`text-lg font-bold ${getShippingFeeColorClass(
              isLoadingShipping,
              shippingFee
            )}`}
          >
            {getShippingFeeStatusText(isLoadingShipping, shippingFee)}
          </span>
        </div>

        {/* 免運提示 */}
        {freeShippingMessage && shippingFee !== null && shippingFee > 0 && (
          <div className="rounded-none border-2 border-orange-500 bg-orange-50 px-3 py-2">
            <p className="text-sm text-orange-700">
              💡 <strong>{freeShippingMessage}</strong>
            </p>
          </div>
        )}

        {/* 優惠券按鈕 */}
        {!isEmpty && onOpenCouponSelector && (
          <button
            onClick={onOpenCouponSelector}
            className="w-full rounded-none border-2 border-black bg-orange-50
                       hover:bg-orange-100 px-4 py-3 text-sm font-bold
                       transition-colors flex items-center justify-center gap-2"
          >
            <Ticket className="w-4 h-4" />
            {couponDiscount > 0 ? '更換優惠券' : '選擇優惠券'}
          </button>
        )}

        {/* 最終總金額 */}
        <div className="flex items-center justify-between border-t-2 border-black pt-4">
          <span className="text-gray-600 font-bold">總金額</span>
          <span className="text-2xl font-bold text-green-600">
            NT$ {finalAmount.toLocaleString()}
          </span>
        </div>

        {/* 結帳按鈕 */}
        {isEmpty ? (
          <button
            disabled
            className="w-full cursor-not-allowed rounded-none border-2 md:border-3 border-black bg-gray-200 px-6 py-4 text-lg font-bold text-gray-500 opacity-50"
          >
            購物車是空的
          </button>
        ) : (
          <Link
            href="/store/checkout"
            className="flex w-full items-center justify-center gap-2 rounded-none border-2 md:border-3 border-black bg-green-400 px-6 py-4 text-lg font-bold shadow-neo-sm md:shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            <ShoppingCart className="h-6 w-6" />
            前往結帳
          </Link>
        )}

        {/* 繼續購物按鈕 */}
        <Link
          href="/store"
          className="block w-full rounded-none border-2 md:border-3 border-black bg-white px-6 py-3 text-center font-bold shadow-neo-sm md:shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          繼續購物
        </Link>
      </div>

      {/* 提示訊息 */}
      <div className="mt-6 rounded-none border-2 border-black bg-yellow-100 p-4">
        <p className="text-sm text-gray-700">
          💡 <strong>提示:</strong> 商品價格為您的會員等級專屬價格,結帳前請確認購物車內容。
        </p>
      </div>
    </div>
  )
}
