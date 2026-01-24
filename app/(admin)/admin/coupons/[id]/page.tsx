/**
 * Coupon Detail Page
 * Feature: 009-coupon-system (US2 + 補充需求)
 *
 * 優惠券詳情頁（編輯 + 統計 + 領取用戶列表）
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, TrendingUp, Calendar, Tag } from 'lucide-react'
import { getCouponById, getCouponUsers, getCouponStats } from '@/lib/actions/coupons'
import { CouponForm } from '@/components/admin/coupons/CouponForm'
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import { generatePageMetadata } from '@/lib/metadata'

interface PageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    page?: string
  }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const result = await getCouponById(id)

  if (!result.success || !result.data) {
    return generatePageMetadata('優惠券詳情', '查看優惠券詳情與使用統計')
  }

  return generatePageMetadata(
    `優惠券：${result.data.code_normalized}`,
    `查看優惠券 ${result.data.code_normalized} 的詳情與使用統計`
  )
}

export default async function CouponDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const search = await searchParams
  const page = Number(search.page) || 1

  // 並行查詢優惠券資料、統計與領取用戶
  const [couponResult, usersResult, statsResult] = await Promise.all([
    getCouponById(id),
    getCouponUsers(id, page, 50),
    getCouponStats(id),
  ])

  if (!couponResult.success || !couponResult.data) {
    notFound()
  }

  const coupon = couponResult.data
  const usersData = usersResult.success && usersResult.data ? usersResult.data : {
    users: [],
    total: 0,
    page: 1,
    limit: 50,
  }
  const stats = statsResult.success && statsResult.data ? statsResult.data : {
    claimCount: 0,
    usedCount: 0,
    totalDiscountAmount: 0,
  }

  // 計算分頁資訊
  const { users, total, limit } = usersData
  const totalPages = Math.ceil(total / limit)
  const claimCount = stats.claimCount
  const usedCount = stats.usedCount

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* 返回按鈕 */}
      <Link
        href="/admin/coupons"
        className={cn(
          'inline-flex items-center gap-2 bg-white font-bold transition-all',
          designTokens.neoBrutalism.border.full,
          designTokens.neoBrutalism.shadow.mobile,
          designTokens.neoBrutalism.hover,
          designTokens.button.md
        )}
      >
        <ArrowLeft className="h-5 w-5" />
        返回優惠券列表
      </Link>

      {/* 頁面標題 */}
      <div>
        <h1 className="text-3xl font-black md:text-4xl">優惠券詳情</h1>
        <p className="mt-2 text-gray-600">
          優惠券代碼「<span className="font-mono font-bold text-xl">{coupon.code_normalized}</span>」
        </p>
      </div>

      {/* 統計資訊卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="border-2 md:border-3 border-black bg-blue-100 p-4 shadow-neo">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-blue-600" />
            <p className="text-sm font-bold text-blue-600">發放張數</p>
          </div>
          <p className="text-3xl font-black">{claimCount}</p>
          <p className="text-sm text-gray-600 mt-1">
            {claimCount} 位客戶領取 {claimCount} 張
          </p>
        </div>

        <div className="border-2 md:border-3 border-black bg-green-100 p-4 shadow-neo">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-5 w-5 text-green-600" />
            <p className="text-sm font-bold text-green-600">使用張數</p>
          </div>
          <p className="text-3xl font-black">{usedCount}</p>
          <p className="text-sm text-gray-600 mt-1">
            使用率 {claimCount > 0 ? Math.round((usedCount / claimCount) * 100) : 0}%
          </p>
        </div>

        <div className="border-2 md:border-3 border-black bg-orange-100 p-4 shadow-neo">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            <p className="text-sm font-bold text-orange-600">總折扣金額</p>
          </div>
          <p className="text-3xl font-black">NT$ {stats.totalDiscountAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* 優惠券表單 */}
      <div className="border-2 md:border-3 border-black bg-white p-6 shadow-neo">
        <h2 className="text-2xl font-black mb-4">編輯優惠券</h2>
        <CouponForm mode="edit" coupon={coupon} />
      </div>

      {/* 領取用戶列表 */}
      <div className="border-2 md:border-3 border-black bg-white shadow-neo">
        <div className="border-b-2 md:border-b-3 border-black bg-yellow-300 p-4">
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Users className="h-6 w-6" />
            領取用戶名單 ({total} 位用戶)
          </h2>
          {total > 0 && (
            <p className="mt-1 text-sm text-gray-600">
              第 {(page - 1) * limit + 1}-{Math.min(page * limit, total)} 筆，共 {total} 筆
            </p>
          )}
        </div>

        {users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">目前沒有客戶領取此優惠券</p>
          </div>
        ) : (
          <>
            <div className="divide-y-3 divide-black">
              {users.map((user, index) => (
                <div key={user.user_id} className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-bold text-lg">{user.user_name}</p>
                      <p className="text-sm text-gray-600">{user.user_phone}</p>
                    </div>

                    <div className="flex flex-col md:items-end gap-2">
                      {/* 領取統計 */}
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded border-2 border-green-400 bg-green-100 px-2 py-1 text-xs font-bold text-green-600">
                          已使用 {user.total_used} 張
                        </span>
                        <span className="inline-flex items-center gap-1 rounded border-2 border-gray-400 bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">
                          未使用 {user.total_unused} 張
                        </span>
                      </div>

                      {/* 領取時間 */}
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {user.total_claimed > 1
                            ? `首次：${formatDate(user.first_claimed_at)} / 最後：${formatDate(user.last_claimed_at)}`
                            : `領取：${formatDate(user.first_claimed_at)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 分頁控制 */}
            {totalPages > 1 && (
              <div className="border-t-2 md:border-t-3 border-black p-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  共 {totalPages} 頁
                </div>
                <div className="flex items-center gap-2">
                  {page > 1 && (
                    <Link
                      href={`/admin/coupons/${id}?page=${page - 1}`}
                      className={cn(
                        'px-4 py-2 bg-white font-bold transition-all',
                        designTokens.neoBrutalism.border.full,
                        designTokens.neoBrutalism.shadow.mobile,
                        designTokens.neoBrutalism.hover
                      )}
                    >
                      上一頁
                    </Link>
                  )}
                  <span className="px-3 py-1 font-bold">
                    {page} / {totalPages}
                  </span>
                  {page < totalPages && (
                    <Link
                      href={`/admin/coupons/${id}?page=${page + 1}`}
                      className={cn(
                        'px-4 py-2 bg-white font-bold transition-all',
                        designTokens.neoBrutalism.border.full,
                        designTokens.neoBrutalism.shadow.mobile,
                        designTokens.neoBrutalism.hover
                      )}
                    >
                      下一頁
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
