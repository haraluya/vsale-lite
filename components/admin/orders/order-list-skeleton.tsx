import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'

/**
 * Order List Skeleton 組件
 * Feature: Performance Optimization - Order List Streaming
 */

export function OrderListSkeleton() {
  return (
    <div className={designTokens.spacing.page.gap}>
      {/* 篩選與搜尋區域骨架 */}
      <div
        className={cn(
          'flex flex-col gap-4 rounded-none bg-white sm:flex-row',
          designTokens.neoBrutalism.border.full,
          designTokens.neoBrutalism.shadow.full,
          designTokens.spacing.card.padding
        )}
      >
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-10 w-32 md:h-12 md:w-40" />
        </div>
        <div className="flex flex-1 items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-10 w-full md:h-12" />
        </div>
      </div>

      {/* 桌面版表格骨架 */}
      <div
        className={cn(
          'hidden lg:block rounded-none bg-white',
          designTokens.neoBrutalism.border.full,
          designTokens.neoBrutalism.shadow.full
        )}
      >
        <div className="p-4 border-b-2 md:border-b-3 border-black">
          <div className="grid grid-cols-6 gap-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 items-center py-3 border-b border-gray-200">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* 手機版卡片骨架 */}
      <div className="lg:hidden space-y-3 md:space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'rounded-none bg-white',
              designTokens.neoBrutalism.border.full,
              designTokens.neoBrutalism.shadow.full,
              designTokens.spacing.card.padding,
              designTokens.spacing.card.gap
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* 分頁骨架 */}
      <div className="flex justify-center">
        <Skeleton className="h-10 w-64" />
      </div>
    </div>
  )
}
