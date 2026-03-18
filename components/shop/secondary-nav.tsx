/**
 * SecondaryNav Component
 * 次要導覽列元件 — Clean Commerce 風格
 */

'use client'

import Link from 'next/link'
import { Ticket } from 'lucide-react'
import { SegmentControl } from '@/components/shop/home-blocks/SegmentControl'
import { cn } from '@/lib/utils'

interface SecondaryNavProps {
  userPhone: string
  userName: string
  tierName: string
  unusedCouponCount: number
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
        'bg-info-bg',
        'border-b',
        'shadow-neo-sm'
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
          <p className="text-sm md:text-base font-semibold">
            {userPhone} {userName} 您好！
          </p>

          <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-text-secondary">
            <span>
              會員等級: <span className="font-semibold text-foreground">{tierName}</span>
            </span>

            <Link
              href="/store/coupons"
              className={cn(
                'flex items-center gap-1 min-h-[24px]',
                unusedCouponCount > 0
                  ? 'text-warning-border hover:opacity-80 font-medium transition-colors'
                  : 'text-muted'
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
