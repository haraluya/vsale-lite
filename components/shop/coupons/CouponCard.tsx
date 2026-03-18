'use client'

/**
 * 優惠券卡片元件 (Coupang 風格 + Neo-Brutalism)
 *
 * @feature 009-coupon-system
 * @date 2026-01-07
 */

import { formatDate } from '@/lib/utils'
import type { Coupon, UserCoupon } from '@/types'

interface CouponCardProps {
  coupon: Coupon | UserCoupon
  onClaim?: () => void
  isClaimed?: boolean
  isUsed?: boolean
  showClaimButton?: boolean
}

/**
 * 優惠券卡片元件
 *
 * 特色：
 * - Coupang 風格設計（左側折扣金額、右側優惠券資訊）
 * - Neo-Brutalism 樣式（黑邊框、硬邊陰影、點擊位移效果）
 * - 鋸齒狀切口效果（模擬實體優惠券撕邊）
 * - 色彩區分狀態（可用：橙色、已使用：灰色）
 */
export function CouponCard({
  coupon: rawCoupon,
  onClaim,
  isClaimed = false,
  isUsed = false,
  showClaimButton = false,
}: CouponCardProps) {
  // 處理 UserCoupon 與 Coupon 型別差異
  // 如果是 UserCoupon，提取其 coupon 屬性；否則直接使用（型別斷言）
  const coupon: Coupon | undefined = ('coupon' in rawCoupon && rawCoupon.coupon)
    ? rawCoupon.coupon
    : (rawCoupon as Coupon)

  if (!coupon) {
    return null
  }

  // 判斷優惠券是否過期
  const now = new Date()
  const validUntil = new Date(coupon.valid_until)
  const isExpired = now > validUntil

  // 顯示文字
  const discountDisplay =
    coupon.discount_type === 'fixed'
      ? `$${coupon.discount_value}`
      : `${coupon.discount_value}%`

  const minAmountText = coupon.min_order_amount
    ? `滿 $${coupon.min_order_amount} 可用`
    : '無金額限制'

  // 狀態顯示
  let statusText = ''
  let statusColor = ''

  if (isUsed) {
    statusText = '已使用'
    statusColor = 'text-text-secondary'
  } else if (isExpired) {
    statusText = '已過期'
    statusColor = 'text-error'
  } else if (isClaimed) {
    statusText = '已領取'
    statusColor = 'text-success'
  }

  // 決定背景色
  const leftBgColor = isUsed || isExpired ? 'bg-gray-300' : 'bg-orange-400'
  const cardBgColor = isUsed || isExpired ? 'bg-surface-secondary' : 'bg-surface'

  return (
    <div className={`relative border-theme shadow-neo-sm ${cardBgColor} overflow-hidden`}>
      {/* 鋸齒狀切口（虛線分隔） */}
      <div className="absolute top-0 right-24 md:right-32 bottom-0 w-px bg-black opacity-30"
           style={{
             backgroundImage: 'linear-gradient(to bottom, black 50%, transparent 50%)',
             backgroundSize: '2px 8px',
             backgroundRepeat: 'repeat-y',
           }}
      />

      <div className="flex">
        {/* 左側：折扣金額 */}
        <div className={`w-24 md:w-32 ${leftBgColor} flex items-center justify-center p-4 md:p-6`}>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-black">{discountDisplay}</div>
            <div className="text-xs md:text-sm font-bold mt-1">
              {coupon.discount_type === 'fixed' ? '折扣' : 'OFF'}
            </div>
          </div>
        </div>

        {/* 右側：優惠券資訊 */}
        <div className="flex-1 p-3 md:p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-bold text-base md:text-lg mb-1">
                {coupon.code_normalized || coupon.code}
              </div>
              <div className="text-xs md:text-sm text-text-secondary mb-1">
                {minAmountText}
              </div>
              <div className="text-xs text-text-secondary">
                有效期限: {formatDate(coupon.valid_until)}
              </div>
            </div>

            {/* 狀態標籤 */}
            {statusText && (
              <div className={`text-xs md:text-sm font-bold ${statusColor} ml-2`}>
                {statusText}
              </div>
            )}
          </div>

          {/* 領取按鈕 */}
          {showClaimButton && !isClaimed && !isExpired && onClaim && (
            <button
              onClick={onClaim}
              className="mt-3 w-full md:w-auto px-4 py-2 bg-black text-white font-bold
                         border shadow-neo-sm hover:-translate-y-0.5
                         hover:shadow-theme-hover hover:shadow-none transition-all
                         text-sm md:text-base"
            >
              立即領取
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
