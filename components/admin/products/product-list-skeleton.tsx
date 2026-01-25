import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'

/**
 * Product List Skeleton 組件
 * Feature: Performance Optimization - Product List Streaming
 */

export function ProductListSkeleton() {
  return (
    <div
      className={cn(
        'rounded-none bg-white',
        designTokens.neoBrutalism.border.full,
        designTokens.neoBrutalism.shadow.full,
        designTokens.spacing.card.padding,
        designTokens.spacing.page.gap
      )}
    >
      {/* Search & Filter 骨架 */}
      <div className="flex flex-col gap-3 md:flex-row md:gap-4">
        <div className="flex-1">
          <Skeleton className="h-10 w-full md:h-12" />
        </div>
        <Skeleton className="h-10 w-32 md:h-12 md:w-40" />
        <Skeleton className="h-10 w-20 md:h-12 md:w-24" />
      </div>

      {/* 桌面版表格骨架 */}
      <div className="hidden lg:block">
        <div className="border-b-2 md:border-b-3 border-black pb-3">
          <div className="grid grid-cols-7 gap-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
        <div className="space-y-3 mt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-7 gap-4 items-center py-3 border-b border-gray-200">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-6 w-16" />
              <div className="flex justify-end gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
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
              'rounded-none bg-gray-50',
              'border-2 border-black',
              'shadow-neo-sm',
              designTokens.spacing.card.padding,
              designTokens.spacing.card.gap
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className={designTokens.spacing.card.gap}>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-300">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        ))}
      </div>

      {/* 分頁骨架 */}
      <div className="mt-6 flex justify-center">
        <Skeleton className="h-10 w-64" />
      </div>
    </div>
  )
}
