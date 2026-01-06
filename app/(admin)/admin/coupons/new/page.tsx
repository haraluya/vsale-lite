/**
 * New Coupon Page
 * Feature: 009-coupon-system (US2)
 *
 * 新增優惠券頁面
 */

import { CouponForm } from '@/components/admin/coupons/CouponForm'

export default function NewCouponPage() {
  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-3xl font-black md:text-4xl">新增優惠券</h1>
        <p className="mt-2 text-gray-600">
          建立新的優惠券，設定折扣方式、使用限制與生效時間
        </p>
      </div>

      {/* 優惠券表單 */}
      <CouponForm mode="create" />
    </div>
  )
}

export const metadata = {
  title: '新增優惠券 | Vsale 管理後台',
  description: '建立新的優惠券',
}
