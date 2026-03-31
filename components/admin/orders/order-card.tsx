/**
 * Order Card Component (Memoized)
 * Feature: Performance Optimization - Phase 3.4
 *
 * 訂單卡片組件（手機版）- 使用 React.memo 優化重渲染性能
 * - 僅在關鍵 props 變更時重渲染
 * - 預期提升：重渲染 -50%
 */

import { memo } from 'react'
import { PrefetchLink } from '@/components/admin/prefetch-link'
import { OrderStatusBadge } from '@/components/shop/order-status-badge'
import { designTokens, getThemeClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import { formatDateTW, formatAmount } from '@/lib/date-utils'
import type { OrderWithUser } from '@/types'

interface OrderCardProps {
  order: OrderWithUser
}

/**
 * 訂單卡片組件（手機版）
 * 使用 React.memo 避免不必要的重渲染
 */
export const OrderCard = memo(
  function OrderCard({ order }: OrderCardProps) {
    return (
      <PrefetchLink
        href={`/admin/orders/${order.id}`}
        className={cn(
          'block rounded-theme-sm bg-surface',
          getThemeClasses({ active: true }),
          designTokens.spacing.card.padding,
          designTokens.spacing.card.gap
        )}
        prefetchDelay={150}
      >
        {/* 訂單編號與狀態 */}
        <div className="flex items-start justify-between gap-3">
          <div className={cn('font-mono font-bold text-blue-600', designTokens.typography.body.base)}>
            {order.order_number}
            {order.is_admin_order && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 ml-1.5 font-sans">
                代客下單
              </span>
            )}
          </div>
          <OrderStatusBadge status={order.status} size="sm" />
        </div>

        {/* 客戶資訊 */}
        <div className={designTokens.spacing.card.gap}>
          <div className={cn('font-bold', designTokens.typography.body.base)}>{order.user_name}</div>
          <div className={cn('text-text-secondary', designTokens.typography.caption)}>
            {order.user_phone} • {order.tier_name}
          </div>
        </div>

        {/* 金額與時間 */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className={cn('text-text-secondary', designTokens.typography.caption)} suppressHydrationWarning>{formatDateTW(order.created_at)}</div>
          <div className={cn('font-bold', designTokens.typography.body.base)}>{formatAmount(order.total_amount)}</div>
        </div>
      </PrefetchLink>
    )
  },
  // 自訂比較函數：僅比較關鍵欄位
  (prevProps, nextProps) => {
    const prev = prevProps.order
    const next = nextProps.order

    // 只要任一關鍵欄位變更，就重新渲染
    return (
      prev.id === next.id &&
      prev.order_number === next.order_number &&
      prev.status === next.status &&
      prev.total_amount === next.total_amount &&
      prev.user_name === next.user_name &&
      prev.user_phone === next.user_phone &&
      prev.tier_name === next.tier_name &&
      prev.created_at === next.created_at &&
      prev.is_admin_order === next.is_admin_order
    )
  }
)
