/**
 * Edit Coupon Page
 * Feature: 009-coupon-system (US2)
 *
 * 編輯優惠券頁面
 */

import { notFound } from 'next/navigation'
import { getCouponById } from '@/lib/actions/coupons'
import { CouponForm } from '@/components/admin/coupons/CouponForm'

interface PageProps {
  params: {
    id: string
  }
}

export default async function EditCouponPage({ params }: PageProps) {
  const result = await getCouponById(params.id)

  if (!result.success || !result.data) {
    notFound()
  }

  const coupon = result.data

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-3xl font-black md:text-4xl">編輯優惠券</h1>
        <p className="mt-2 text-gray-600">
          編輯優惠券「<span className="font-mono font-bold">{coupon.code_normalized}</span>」
        </p>
      </div>

      {/* 優惠券表單 */}
      <CouponForm mode="edit" coupon={coupon} />
    </div>
  )
}

export const metadata = {
  title: '編輯優惠券 | Vsale 管理後台',
  description: '編輯優惠券資訊',
}
