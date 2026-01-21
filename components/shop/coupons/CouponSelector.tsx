'use client'

/**
 * 優惠券選擇器元件（購物車使用）
 *
 * @feature 009-coupon-system
 * @date 2026-01-07
 */

import { useState, useEffect, useCallback } from 'react'
import { getUserCoupons, validateCoupon } from '@/lib/actions/coupons'
import { useCartStore } from '@/stores/cart'
import type { UserCoupon, CartItem as BaseCartItem, CouponDiscountResult } from '@/types'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface CouponSelectorProps {
  cartItems: (BaseCartItem & { price: number; series_id?: string })[]
  onClose?: () => void
}

/**
 * 優惠券選擇器
 *
 * 特色：
 * - 顯示客戶已領取且未使用的優惠券
 * - 即時驗證優惠券使用條件
 * - 顯示可用 / 不可用狀態與原因
 * - 支援應用 / 移除優惠券
 */
export function CouponSelector({ cartItems, onClose }: CouponSelectorProps) {
  const { appliedCoupon, applyCoupon, removeCoupon } = useCartStore()
  const [availableCoupons, setAvailableCoupons] = useState<UserCoupon[]>([])
  const [validationResults, setValidationResults] = useState<Record<string, CouponDiscountResult>>({})
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)

  /**
   * 驗證所有優惠券
   */
  const validateAllCoupons = useCallback(async (coupons: UserCoupon[]) => {
    const results: Record<string, CouponDiscountResult> = {}

    for (const userCoupon of coupons) {
      if (!userCoupon.coupon) continue

      const validationResult = await validateCoupon({
        couponCode: userCoupon.coupon.code_normalized,
        cartItems: cartItems.map(item => ({
          product_id: item.productId,
          series_id: item.series_id || '', // 確保 series_id 存在
          price: item.price || 0,
          quantity: item.quantity,
        })),
      })

      if (validationResult.success && validationResult.data) {
        results[userCoupon.coupon.id] = validationResult.data
      }
    }

    setValidationResults(results)
  }, [cartItems])

  /**
   * 載入優惠券並驗證
   */
  const loadCoupons = useCallback(async () => {
    setLoading(true)

    try {
      const result = await getUserCoupons({ used: false })

      if (result.success && result.data) {
        setAvailableCoupons(result.data)

        // 驗證所有優惠券
        await validateAllCoupons(result.data)
      }
    } catch (error) {
      console.error('載入優惠券錯誤:', error)
      toast.error('載入優惠券失敗')
    } finally {
      setLoading(false)
    }
  }, [validateAllCoupons])

  /**
   * 載入客戶已領取的優惠券
   */
  useEffect(() => {
    loadCoupons()
  }, [loadCoupons])

  /**
   * 應用優惠券（追蹤特定領取記錄 ID）
   */
  const handleApplyCoupon = async (userCoupon: UserCoupon) => {
    if (!userCoupon.coupon) return

    const validation = validationResults[userCoupon.coupon.id]

    if (!validation || !validation.valid) {
      toast.error(validation?.error || '此優惠券無法使用')
      return
    }

    setApplying(userCoupon.id)

    try {
      // 將 user_coupon_id 傳遞給 coupon 物件
      const couponWithUserCouponId = {
        ...userCoupon.coupon,
        user_coupon_id: userCoupon.id,
      }
      applyCoupon(couponWithUserCouponId, validation.discountAmount || 0)
      toast.success('優惠券已套用！')
      onClose?.()
    } catch (error) {
      console.error('套用優惠券錯誤:', error)
      toast.error('套用優惠券失敗')
    } finally {
      setApplying(null)
    }
  }

  /**
   * 移除優惠券
   */
  const handleRemoveCoupon = () => {
    removeCoupon()
    toast.success('優惠券已移除')
    onClose?.()
  }

  if (loading) {
    return (
      <div className={cn(
        "bg-white p-6",
        designTokens.neoBrutalism.border.mobile,
        "border-black",
        designTokens.neoBrutalism.shadow.mobile
      )}>
        <div className="text-center text-gray-600">載入中...</div>
      </div>
    )
  }

  if (availableCoupons.length === 0) {
    return (
      <div className={cn(
        "bg-white p-6",
        designTokens.neoBrutalism.border.mobile,
        "border-black",
        designTokens.neoBrutalism.shadow.mobile
      )}>
        <div className="text-center">
          <p className="text-gray-600 mb-4">您目前沒有可用的優惠券</p>
          <button
            onClick={onClose}
            className={cn(
              "px-4 py-2 bg-black text-white font-bold transition-all",
              designTokens.neoBrutalism.border.mobile,
              "border-black",
              designTokens.neoBrutalism.shadow.mobile,
              "hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            )}
          >
            關閉
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border-2 md:border-3 border-black shadow-neo-sm md:shadow-neo bg-white">
      {/* 標題列 */}
      <div className="flex items-center justify-between border-b-2 border-black p-4">
        <h3 className="text-lg font-black">選擇優惠券</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 transition-colors"
            aria-label="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 優惠券列表（每張獨立顯示） */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {availableCoupons.map((userCoupon) => {
          const coupon = userCoupon.coupon
          if (!coupon) return null

          const validation = validationResults[coupon.id]
          const isValid = validation?.valid || false
          const isApplied = appliedCoupon?.id === coupon.id && appliedCoupon?.user_coupon_id === userCoupon.id

          const discountDisplay =
            coupon.discount_type === 'fixed'
              ? `$${coupon.discount_value}`
              : `${coupon.discount_value}%`

          return (
            <div
              key={userCoupon.id}
              className={`border-2 border-black p-3 ${
                isApplied ? 'bg-green-50' : isValid ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold">{coupon.code_normalized}</span>
                    <span className="text-orange-600 font-black">{discountDisplay}</span>
                  </div>

                  {validation && validation.valid && validation.discountAmount && (
                    <div className="text-sm text-green-600 font-bold mb-1">
                      可折抵 ${validation.discountAmount}
                    </div>
                  )}

                  {validation && !validation.valid && (
                    <div className="text-sm text-red-600 mb-1">
                      {validation.error}
                    </div>
                  )}

                  {coupon.min_order_amount && (
                    <div className="text-xs text-gray-600">
                      滿 ${coupon.min_order_amount} 可用
                    </div>
                  )}
                </div>

                <div>
                  {isApplied ? (
                    <button
                      onClick={handleRemoveCoupon}
                      className="px-3 py-1 bg-gray-200 text-black font-bold
                                 border-2 border-black text-sm hover:bg-gray-300
                                 transition-colors"
                    >
                      移除
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApplyCoupon(userCoupon)}
                      disabled={!isValid || applying === userCoupon.id}
                      className="px-3 py-1 bg-orange-400 text-black font-bold
                                 border-2 border-black text-sm
                                 shadow-neo-sm hover:translate-x-[1px]
                                 hover:translate-y-[1px] hover:shadow-none
                                 transition-all disabled:opacity-50
                                 disabled:cursor-not-allowed
                                 disabled:hover:translate-x-0
                                 disabled:hover:translate-y-0
                                 disabled:hover:shadow-neo-sm"
                    >
                      {applying === userCoupon.id ? '套用中...' : '使用'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 已套用優惠券提示 */}
      {appliedCoupon && (
        <div className="border-t-2 border-black bg-green-50 p-4">
          <div className="text-sm text-green-700 font-bold">
            ✓ 已套用優惠券：{appliedCoupon.code_normalized}
          </div>
        </div>
      )}
    </div>
  )
}
