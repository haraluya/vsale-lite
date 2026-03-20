/**
 * New Coupon Page
 * Feature: 009-coupon-system (US2)
 *
 * 新增優惠券頁面
 */

import { CouponForm } from '@/components/admin/coupons/CouponForm'
import { generatePageMetadata } from '@/lib/metadata'

export default function NewCouponPage() {
  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-3xl font-black md:text-4xl">新增優惠券</h1>
        <p className="mt-2 text-text-secondary">
          建立新的優惠券，設定折扣方式、使用限制與生效時間
        </p>
      </div>

      {/* 優惠券表單 */}
      <CouponForm mode="create" />
    </div>
  )
}

export async function generateMetadata() {
  return generatePageMetadata('新增優惠券', '建立新的優惠券')
}
