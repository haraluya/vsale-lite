/**
 * SecondaryNav Component
 * Feature: 客戶端次導覽列
 *
 * 次要導覽列元件
 * - 顯示用戶資訊（手機號碼、歡迎語、會員等級）
 * - 顯示優惠券數量（可點擊跳轉）
 * - 整合頁面切換（SegmentControl）
 * - 淡藍色背景（bg-blue-50）
 * - 響應式設計（手機版兩行緊湊排列，桌面版左右分佈）
 */

'use client'

import Link from 'next/link'
import { Ticket } from 'lucide-react'
import { SegmentControl } from '@/components/shop/home-blocks/SegmentControl'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface SecondaryNavProps {
  userPhone: string         // 使用者手機號碼或 Email
  userName: string          // 使用者名稱（display_name 或 phone）
  tierName: string          // 會員等級名稱
  unusedCouponCount: number // 未使用優惠券數量
}

export function SecondaryNav({
  userPhone,
  userName,
  tierName,
  unusedCouponCount,
}: SecondaryNavProps) {
  return (
    <nav
      aria-label="次要導覽"
      className={cn(
        'bg-blue-50',
        'border-b-2 md:border-b-3 border-black',
        'shadow-neo-sm md:shadow-neo'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3',
          'p-3 md:p-4',
          'max-w-7xl mx-auto'
        )}
      >
        {/* 左側區域 - 使用者資訊 */}
        <div role="region" aria-label="使用者資訊" className="flex-shrink">
          {/* 手機號碼 + 歡迎語 */}
          <p className={cn('text-sm md:text-base font-bold text-gray-900')}>
            {userPhone} {userName} 您好！
          </p>

          {/* 會員等級 + 優惠券數量（並排）*/}
          <div
            className={cn(
              'flex items-center gap-3 md:gap-4',
              'text-xs md:text-sm text-gray-600'
            )}
          >
            {/* 會員等級 */}
            <span>
              會員等級: <span className="font-bold text-gray-900">{tierName}</span>
            </span>

            {/* 優惠券數量（可點擊）*/}
            <Link
              href="/store/coupons"
              className={cn(
                'flex items-center gap-1 min-h-[24px]',
                unusedCouponCount > 0
                  ? 'text-orange-600 hover:text-orange-700 font-medium transition-colors'
                  : 'text-gray-400'
              )}
            >
              <Ticket className="h-3 w-3 md:h-4 md:w-4" />
              <span>優惠券 ({unusedCouponCount})</span>
            </Link>
          </div>
        </div>

        {/* 右側區域 - SegmentControl */}
        <div role="navigation" aria-label="頁面切換" className="flex-shrink-0">
          <SegmentControl />
        </div>
      </div>
    </nav>
  )
}
