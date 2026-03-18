import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'

/**
 * Unified Table Skeleton Component
 * Feature: Performance Optimization - Phase 2.5 (Unified Skeleton Design)
 *
 * 統一表格骨架組件（參數化配置）
 * - 支援桌面版表格與手機版卡片視圖
 * - Neo-Brutalism 設計風格
 * - 可選篩選器與分頁骨架
 */

interface TableSkeletonProps {
  /** 桌面版表格列數 */
  columns?: number
  /** 顯示多少行 */
  rows?: number
  /** 手機版卡片數量 */
  mobileCards?: number
  /** 是否顯示篩選器骨架 */
  showFilters?: boolean
  /** 是否顯示分頁骨架 */
  showPagination?: boolean
  /** 自訂容器 className */
  className?: string
}

export function TableSkeleton({
  columns = 6,
  rows = 5,
  mobileCards = 3,
  showFilters = false,
  showPagination = true,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn(designTokens.spacing.page.gap, className)}>
      {/* 篩選器骨架（可選） */}
      {showFilters && (
        <div
          className={cn(
            'flex flex-col gap-4 rounded-theme-sm bg-surface sm:flex-row',
            designTokens.cleanCommerce.border.full,
            designTokens.cleanCommerce.shadow.full,
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
      )}

      {/* 桌面版表格骨架 */}
      <div
        className={cn(
          'hidden lg:block rounded-theme-sm bg-surface',
          designTokens.cleanCommerce.border.full,
          designTokens.cleanCommerce.shadow.full
        )}
      >
        {/* 表頭 */}
        <div className="p-4 border-b">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-20" />
            ))}
          </div>
        </div>

        {/* 表格內容 */}
        <div className="p-4 space-y-4">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid gap-4 items-center py-3 border-b border-gray-200"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton key={colIndex} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 手機版卡片骨架 */}
      <div className="lg:hidden space-y-3 md:space-y-4">
        {Array.from({ length: mobileCards }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'rounded-theme-sm bg-surface',
              designTokens.cleanCommerce.border.full,
              designTokens.cleanCommerce.shadow.full,
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

      {/* 分頁骨架（可選） */}
      {showPagination && (
        <div className="flex justify-center">
          <Skeleton className="h-10 w-64" />
        </div>
      )}

      {/* 統計資訊骨架 */}
      <div className="flex justify-center">
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  )
}
