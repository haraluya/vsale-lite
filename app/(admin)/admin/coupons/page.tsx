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
import { generatePageMetadata } from '@/lib/metadata'

interface PageProps {
  searchParams: Promise<{
    status?: 'active' | 'inactive' | 'deleted'
    discountType?: 'fixed' | 'percentage'
    search?: string
    showArchived?: string // ✅ 新增：顯示彙整區（已刪除/已過期）
  }>
}

async function CouponsContent({ searchParams }: PageProps) {
  const params = await searchParams
  const showArchived = params.showArchived === 'true'

  // 根據 showArchived 決定查詢哪些優惠券
  const result = await getCoupons({
    status: showArchived ? 'deleted' : params.status, // 彙整區僅顯示已刪除
    discount_type: params.discountType,
    search: params.search,
  })

  const allCoupons = result.success && result.data ? result.data : []

  // 分類優惠券
  const now = new Date()
  const activeCoupons = allCoupons.filter((c) => {
    if (showArchived) return false // 彙整區不顯示
    const validFrom = new Date(c.valid_from)
    const validUntil = new Date(c.valid_until)
    return c.status === 'active' && now >= validFrom && now <= validUntil
  })

  const expiredCoupons = allCoupons.filter((c) => {
    const validUntil = new Date(c.valid_until)
    return c.status !== 'deleted' && now > validUntil
  })

  const deletedCoupons = allCoupons.filter((c) => c.status === 'deleted')

  return (
    <>
      {/* 統計資訊 */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="border-2 md:border-3 border-black bg-surface p-4 shadow-neo">
          <p className="text-sm text-text-secondary">總優惠券數</p>
          <p className="text-3xl font-black">{allCoupons.length}</p>
        </div>
        <div className="border-2 md:border-3 border-black bg-green-100 p-4 shadow-neo">
          <p className="text-sm text-text-secondary">有效中</p>
          <p className="text-3xl font-black">{activeCoupons.length}</p>
        </div>
        <div className="border-2 md:border-3 border-black bg-orange-100 p-4 shadow-neo">
          <p className="text-sm text-text-secondary">已過期</p>
          <p className="text-3xl font-black">{expiredCoupons.length}</p>
        </div>
        <div className="border-2 md:border-3 border-black bg-red-100 p-4 shadow-neo">
          <p className="text-sm text-text-secondary">已刪除</p>
          <p className="text-3xl font-black">{deletedCoupons.length}</p>
        </div>
      </div>

      {/* 篩選器與彙整區切換 */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <CouponFilters />

        {/* 彙整區切換按鈕 */}
        <Link
          href={`/admin/coupons${showArchived ? '' : '?showArchived=true'}`}
          className={cn(
            'inline-flex items-center gap-2 font-bold transition-all',
            showArchived
              ? 'bg-surface text-foreground'
              : 'bg-gray-400 text-white',
            designTokens.neoBrutalism.border.full,
            designTokens.neoBrutalism.shadow.mobile,
            designTokens.neoBrutalism.hover,
            designTokens.button.md
          )}
        >
          {showArchived ? '返回主列表' : '查看彙整區'}
        </Link>
      </div>

      {/* 優惠券列表 */}
      {showArchived ? (
        <div className="space-y-4">
          <h2 className="text-xl font-black">彙整區：已刪除/已過期優惠券</h2>
          <CouponList coupons={allCoupons} showArchived={true} />
        </div>
      ) : (
        <CouponList coupons={allCoupons} showArchived={false} />
      )}
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
          <p className="mt-2 text-text-secondary">
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
          <div className="border-2 md:border-3 border-black bg-surface p-12 text-center shadow-neo">
            <p className="text-text-secondary">載入中...</p>
          </div>
        }
      >
        <CouponsContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

export async function generateMetadata() {
  return generatePageMetadata('優惠券管理', '建立與管理優惠券')
}
