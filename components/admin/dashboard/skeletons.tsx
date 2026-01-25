import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'

/**
 * Dashboard Skeleton 組件
 * Feature: Performance Optimization - Dashboard Streaming
 */

export function TodayStatsSkeleton() {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="h-4 w-4 md:h-5 md:w-5" />
        <Skeleton className="h-6 w-24 md:h-7 md:w-28" />
      </div>
      <div className={cn("grid grid-cols-1 md:grid-cols-2", designTokens.spacing.grid.gap)}>
        {/* 卡片骨架 1 */}
        <div className={cn("card-neo", designTokens.spacing.card.padding)}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-12 w-12 rounded-md" />
          </div>
        </div>

        {/* 卡片骨架 2 */}
        <div className={cn("card-neo", designTokens.spacing.card.padding)}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-12 w-12 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function AlertsSkeleton() {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="h-4 w-4 md:h-5 md:w-5" />
        <Skeleton className="h-6 w-24 md:h-7 md:w-28" />
      </div>
      <div className={cn("grid grid-cols-1 md:grid-cols-2", designTokens.spacing.grid.gap)}>
        {/* 卡片骨架 1 */}
        <div className={cn("card-neo", designTokens.spacing.card.padding)}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12 mb-2" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-12 w-12 rounded-md" />
          </div>
        </div>

        {/* 卡片骨架 2 */}
        <div className={cn("card-neo", designTokens.spacing.card.padding)}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-12 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-12 w-12 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function TrendChartSkeleton() {
  return (
    <div className={cn("card-neo", designTokens.spacing.card.padding)}>
      <div className="mb-4">
        <Skeleton className="h-6 w-32 mb-1" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="h-64 flex items-end justify-around gap-2">
        {Array.from({ length: 7 }).map((_, i) => {
          const heights = ['h-32', 'h-40', 'h-48', 'h-52', 'h-56', 'h-44', 'h-36']
          return (
            <Skeleton
              key={i}
              className={`w-full ${heights[i]}`}
            />
          )
        })}
      </div>
    </div>
  )
}
