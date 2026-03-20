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
 * - 顯示組合優惠折扣（分項顯示）
 * - 顯示優惠券折扣（如果有）
 * - 顯示運費預覽（自動計算）
 * - 提供結帳按鈕
 * - Neo-Brutalism 設計風格
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, Ticket, Truck, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  getShippingFeeStatusText,
  getShippingFeeColorClass,
  calculateFreeShippingGap,
  formatFreeShippingMessage,
} from '@/lib/utils/shipping-calculator'
import type { ComboDealCartItem } from '@/stores/cart'
import type { ProductDetailInfo } from '@/types'

interface CartSummaryProps {
  totalAmount: number
  totalItems: number
  isEmpty: boolean
  couponDiscount?: number
  couponCode?: string
  comboDeals?: ComboDealCartItem[] // 🆕 Feature 021: 組合優惠項目
  comboDealProductDetails?: Map<string, ProductDetailInfo> // 🆕 組合優惠商品詳情（計算會員折扣）
  onOpenCouponSelector?: () => void
}

export function CartSummary({
  totalAmount,
  totalItems,
  isEmpty,
  couponDiscount = 0,
  couponCode,
  comboDeals = [], // 🆕 Feature 021
  comboDealProductDetails, // 🆕 組合優惠商品詳情
  onOpenCouponSelector,
}: CartSummaryProps) {
  const [shippingFee, setShippingFee] = useState<number | null>(null)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | null>(null)
  const [isLoadingShipping, setIsLoadingShipping] = useState(true)

  // 🔧 計算組合優惠的會員折扣（零售價 - 等級價格）
  const comboMemberDiscount = comboDeals.reduce((sum, item) => {
    const retailTotal = item.selected_products.reduce((productSum, product) => {
      const detail = comboDealProductDetails?.get(product.product_id)
      const retailPrice = detail?.retail_price || detail?.unit_price || 0
      return productSum + retailPrice * product.quantity
    }, 0)
    const tierTotal = item.original_price
    return sum + (retailTotal - tierTotal)
  }, 0)

  // 🔧 計算組合優惠總折扣
  const totalComboDiscount = comboDeals.reduce(
    (sum, item) => sum + item.discount_amount,
    0
  )

  // 🔧 計算零售價總計（用於顯示）
  const retailPriceTotal = totalAmount + comboMemberDiscount

  // 計算運費（優化：並行查詢）
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

      try {
        // 🚀 優化：並行執行 RPC 和查詢，減少總等待時間
        const [shippingResult, profileResult] = await Promise.all([
          // 查詢 1: 呼叫 calculate_shipping_fee RPC
          supabase.rpc('calculate_shipping_fee', {
            p_user_id: user.id,
            p_subtotal: totalAmount, // 依原始商品金額計算（不含優惠券折扣）
          }),
          // 查詢 2: 同時取得用戶等級資訊（含免運門檻）
          supabase
            .from('profiles')
            .select(`
              tier_id,
              tiers!inner (
                free_shipping_threshold
              )
            `)
            .eq('id', user.id)
            .single(),
        ])

        // 處理運費結果
        if (shippingResult.error) {
          console.error('計算運費失敗:', shippingResult.error)
          setShippingFee(0)
        } else {
          setShippingFee(shippingResult.data ?? 0)
        }

        // 處理免運門檻結果
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
  }, [totalAmount, isEmpty])

  // 計算距離免運門檻的差額
  const freeShippingGap = calculateFreeShippingGap(totalAmount, freeShippingThreshold)
  const freeShippingMessage = formatFreeShippingMessage(freeShippingGap)

  // 🔧 計算最終總金額（零售價 - 會員折扣 - 組合折扣 - 優惠券折扣 + 運費）
  const finalAmount = retailPriceTotal - comboMemberDiscount - totalComboDiscount - couponDiscount + (shippingFee ?? 0)

  return (
    <div className="sticky top-24 rounded-theme-sm border-theme bg-surface p-6 shadow-neo">
      <h2 className="mb-6 text-2xl font-bold">購物車摘要</h2>

      <div className="space-y-4">
        {/* 總數量 */}
        <div className="flex items-center justify-between border-b pb-4">
          <span className="text-text-secondary">商品總數</span>
          <span className="text-xl font-bold">{totalItems} 件</span>
        </div>

        {/* 🔧 商品金額（零售價總計） */}
        <div className="flex items-center justify-between pb-2">
          <span className="text-text-secondary">商品金額</span>
          <span className="text-lg font-bold">
            NT$ {retailPriceTotal.toLocaleString()}
          </span>
        </div>

        {/* 🆕 會員專屬折扣（若有） */}
        {comboMemberDiscount > 0 && (
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm text-blue-600 font-bold">
              會員專屬折扣
            </span>
            <span className="text-lg font-bold text-blue-600">
              - NT$ {comboMemberDiscount.toLocaleString()}
            </span>
          </div>
        )}

        {/* 🔧 組合優惠折扣（若有） */}
        {comboDeals.length > 0 && comboDeals.map((item) => (
          <div key={item.id} className="flex items-center justify-between pb-2">
            <span className="text-sm text-success font-bold flex items-center gap-1">
              <Package className="inline w-4 h-4" />
              組合優惠 ({item.combo_deal_name})
            </span>
            <span className="text-lg font-bold text-success">
              - NT$ {item.discount_amount.toLocaleString()}
            </span>
          </div>
        ))}

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
          <span className="text-text-secondary flex items-center gap-1">
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
          <div className="rounded-theme-sm border border-orange-500 bg-orange-50 dark:bg-orange-950 px-3 py-2">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              💡 <strong>{freeShippingMessage}</strong>
            </p>
          </div>
        )}

        {/* 優惠券按鈕 */}
        {!isEmpty && onOpenCouponSelector && (
          <button
            onClick={onOpenCouponSelector}
            className="w-full rounded-theme-sm border bg-orange-50 dark:bg-orange-950
                       hover:bg-orange-100 dark:hover:bg-orange-900 px-4 py-3 text-sm font-bold
                       transition-colors flex items-center justify-center gap-2"
          >
            <Ticket className="w-4 h-4" />
            {couponDiscount > 0 ? '更換優惠券' : '選擇優惠券'}
          </button>
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
          <button
            disabled
            className="w-full cursor-not-allowed rounded-theme-sm border-theme bg-gray-200 px-6 py-4 text-lg font-bold text-text-secondary opacity-50"
          >
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
          💡 <strong>提示:</strong> 商品價格為您的會員等級專屬價格,結帳前請確認購物車內容。
        </p>
      </div>
    </div>
  )
}
