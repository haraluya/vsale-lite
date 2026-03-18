/**
 * 前台優惠券頁面
 *
 * @feature 009-coupon-system
 * @date 2026-01-07
 */

import { Suspense } from 'react'
import { getUserCoupons } from '@/lib/actions/coupons'
import { CouponCard } from '@/components/shop/coupons/CouponCard'
import { CouponCodeInputWrapper } from '@/components/shop/coupons/CouponCodeInputWrapper'
import { Ticket } from 'lucide-react'

/**
 * 優惠券頁面內容（Server Component）
 */
async function CouponsPageContent() {
  const result = await getUserCoupons()

  const userCoupons = result.success && result.data ? result.data : []
  const unusedCoupons = userCoupons.filter((uc) => !uc.used_at)
  const usedCoupons = userCoupons.filter((uc) => uc.used_at)

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-orange-400 border-theme shadow-neo-sm">
          <Ticket className="w-6 h-6 md:w-8 md:h-8" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black">我的優惠券</h1>
          <p className="text-sm md:text-base text-text-secondary">管理您的優惠券，享受更多折扣</p>
        </div>
      </div>

      {/* 輸入口令入口 */}
      <CouponCodeInputWrapper />

      {/* 未使用的優惠券 */}
      <section>
        <h2 className="text-lg md:text-xl font-black mb-4">
          可使用的優惠券 ({unusedCoupons.length})
        </h2>

        {unusedCoupons.length === 0 ? (
          <div className="border-theme shadow-neo-sm bg-surface p-8 text-center">
            <p className="text-text-secondary mb-2">您目前沒有可使用的優惠券</p>
            <p className="text-sm text-text-secondary">試試輸入優惠券代碼來領取優惠券！</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {unusedCoupons.map((userCoupon) => (
              <CouponCard
                key={userCoupon.id}
                coupon={userCoupon}
                isClaimed={true}
                isUsed={false}
              />
            ))}
          </div>
        )}
      </section>

      {/* 已使用的優惠券 */}
      {usedCoupons.length > 0 && (
        <section>
          <h2 className="text-lg md:text-xl font-black mb-4">
            已使用的優惠券 ({usedCoupons.length})
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            {usedCoupons.map((userCoupon) => (
              <CouponCard
                key={userCoupon.id}
                coupon={userCoupon}
                isClaimed={true}
                isUsed={true}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/**
 * 優惠券頁面（Export）
 */
export default function CouponsPage() {
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
      <Suspense
        fallback={
          <div className="text-center py-12">
            <div className="text-text-secondary">載入中...</div>
          </div>
        }
      >
        <CouponsPageContent />
      </Suspense>
    </div>
  )
}

/**
 * 頁面 Metadata
 */
export const metadata = {
  title: '我的優惠券 | Vsale',
  description: '管理您的優惠券，享受更多折扣優惠',
}
