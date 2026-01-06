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

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CouponDetailPage({ params }: PageProps) {
  const { id } = await params

  // 並行查詢優惠券資料、統計與領取用戶
  const [couponResult, usersResult, statsResult] = await Promise.all([
    getCouponById(id),
    getCouponUsers(id),
    getCouponStats(id),
  ])

  if (!couponResult.success || !couponResult.data) {
    notFound()
  }

  const coupon = couponResult.data
  const users = usersResult.success && usersResult.data ? usersResult.data : []
  const stats = statsResult.success && statsResult.data ? statsResult.data : {
    claimCount: 0,
    usedCount: 0,
    totalDiscountAmount: 0,
  }

  // 計算統計數據
  const claimCount = users.length
  const usedCount = users.filter((u) => u.used_at).length

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
        <div className="border-3 border-black bg-blue-100 p-4 shadow-neo">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-blue-600" />
            <p className="text-sm font-bold text-blue-600">發放張數</p>
          </div>
          <p className="text-3xl font-black">{claimCount}</p>
          <p className="text-sm text-gray-600 mt-1">
            {claimCount} 位客戶領取 {claimCount} 張
          </p>
        </div>

        <div className="border-3 border-black bg-green-100 p-4 shadow-neo">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-5 w-5 text-green-600" />
            <p className="text-sm font-bold text-green-600">使用張數</p>
          </div>
          <p className="text-3xl font-black">{usedCount}</p>
          <p className="text-sm text-gray-600 mt-1">
            使用率 {claimCount > 0 ? Math.round((usedCount / claimCount) * 100) : 0}%
          </p>
        </div>

        <div className="border-3 border-black bg-orange-100 p-4 shadow-neo">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            <p className="text-sm font-bold text-orange-600">總折扣金額</p>
          </div>
          <p className="text-3xl font-black">NT$ {stats.totalDiscountAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* 優惠券表單 */}
      <div className="border-3 border-black bg-white p-6 shadow-neo">
        <h2 className="text-2xl font-black mb-4">編輯優惠券</h2>
        <CouponForm mode="edit" coupon={coupon} />
      </div>

      {/* 領取用戶列表 */}
      <div className="border-3 border-black bg-white shadow-neo">
        <div className="border-b-3 border-black bg-yellow-300 p-4">
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Users className="h-6 w-6" />
            領取用戶名單 ({users.length})
          </h2>
        </div>

        {users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">目前沒有客戶領取此優惠券</p>
          </div>
        ) : (
          <div className="divide-y-3 divide-black">
            {users.map((user, index) => (
              <div key={index} className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="font-bold">{user.user_name}</p>
                    <p className="text-sm text-gray-600">{user.user_phone}</p>
                  </div>

                  <div className="flex flex-col md:items-end gap-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      領取時間：{formatDate(user.claimed_at)}
                    </div>

                    {user.used_at ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded border-2 border-green-400 bg-green-100 px-2 py-1 text-xs font-bold text-green-600">
                          ✓ 已使用
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(user.used_at)}
                        </span>
                        {user.order_id && (
                          <Link
                            href={`/admin/orders/${user.order_id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            查看訂單
                          </Link>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded border-2 border-gray-400 bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">
                        未使用
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export const metadata = {
  title: '優惠券詳情 | Vsale 管理後台',
  description: '查看優惠券詳情與使用統計',
}
