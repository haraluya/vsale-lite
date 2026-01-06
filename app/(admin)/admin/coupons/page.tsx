/**
 * Admin Coupons Page
 * Feature: 009-coupon-system (US2)
 *
 * 後台優惠券管理頁面
 * - 顯示優惠券列表
 * - 篩選器（狀態、折扣方式、代碼搜尋）
 * - 新增優惠券按鈕
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getCoupons } from '@/lib/actions/coupons'
import { CouponList } from '@/components/admin/coupons/CouponList'
import { CouponFilters } from '@/components/admin/coupons/CouponFilters'
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface PageProps {
  searchParams: Promise<{
    status?: 'active' | 'inactive'
    discountType?: 'fixed' | 'percentage'
    search?: string
  }>
}

async function CouponsContent({ searchParams }: PageProps) {
  const params = await searchParams
  const result = await getCoupons({
    status: params.status,
    discount_type: params.discountType,
    search: params.search,
  })

  const coupons = result.success && result.data ? result.data : []

  return (
    <>
      {/* 統計資訊 */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="border-3 border-black bg-white p-4 shadow-neo">
          <p className="text-sm text-gray-600">總優惠券數</p>
          <p className="text-3xl font-black">{coupons.length}</p>
        </div>
        <div className="border-3 border-black bg-green-100 p-4 shadow-neo">
          <p className="text-sm text-gray-600">啟用中</p>
          <p className="text-3xl font-black">
            {coupons.filter((c) => c.status === 'active').length}
          </p>
        </div>
        <div className="border-3 border-black bg-gray-100 p-4 shadow-neo">
          <p className="text-sm text-gray-600">已停用</p>
          <p className="text-3xl font-black">
            {coupons.filter((c) => c.status === 'inactive').length}
          </p>
        </div>
      </div>

      {/* 篩選器 */}
      <div className="mb-6">
        <CouponFilters />
      </div>

      {/* 優惠券列表 */}
      <CouponList coupons={coupons} />
    </>
  )
}

export default function CouponsPage({ searchParams }: PageProps) {
  return (
    <div className="space-y-6">
      {/* 頁面標題與新增按鈕 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black md:text-4xl">優惠券管理</h1>
          <p className="mt-2 text-gray-600">
            建立與管理優惠券，設定折扣方式、等級限制與系列限制
          </p>
        </div>

        <Link
          href="/admin/coupons/new"
          className={cn(
            'inline-flex items-center gap-2 bg-green-400 font-black text-black transition-all',
            designTokens.neoBrutalism.border.full,
            designTokens.neoBrutalism.shadow.full,
            designTokens.neoBrutalism.hover,
            designTokens.button.md
          )}
        >
          <Plus className="h-5 w-5" />
          新增優惠券
        </Link>
      </div>

      {/* 優惠券內容（使用 Suspense） */}
      <Suspense
        fallback={
          <div className="border-3 border-black bg-white p-12 text-center shadow-neo">
            <p className="text-gray-500">載入中...</p>
          </div>
        }
      >
        <CouponsContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

export const metadata = {
  title: '優惠券管理 | Vsale 管理後台',
  description: '建立與管理優惠券',
}
