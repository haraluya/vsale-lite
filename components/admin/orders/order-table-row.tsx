/**
 * Order Table Row Component (Memoized)
 * Feature: Performance Optimization - Phase 3.4
 *
 * 訂單列表行組件（桌面版）- 使用 React.memo 優化重渲染性能
 * - 僅在關鍵 props 變更時重渲染
 * - 預期提升：重渲染 -50%
 */

import { memo } from 'react'
import { PrefetchLink } from '@/components/admin/prefetch-link'
import { OrderStatusBadge } from '@/components/shop/order-status-badge'
import { formatDateTW, formatAmount } from '@/lib/date-utils'
import type { OrderWithUser } from '@/types'

interface OrderTableRowProps {
  order: OrderWithUser
}

/**
 * 訂單表格行組件（桌面版）
 * 使用 React.memo 避免不必要的重渲染
 */
export const OrderTableRow = memo(
  function OrderTableRow({ order }: OrderTableRowProps) {
    return (
      <PrefetchLink
        href={`/admin/orders/${order.id}`}
        className="grid grid-cols-6 gap-4 p-4 transition-colors hover:bg-yellow-100"
        prefetchDelay={150}
      >
        {/* 訂單編號 */}
        <div className="font-mono font-bold text-blue-600">
          {order.order_number}
          {order.is_admin_order && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 ml-1.5 font-sans">
              代客下單
            </span>
          )}
        </div>

        {/* 客戶資訊 */}
        <div>
          <div className="font-bold">{order.user_name}</div>
          <div className="text-sm text-text-secondary">{order.user_phone}</div>
        </div>

        {/* 等級 */}
        <div className="text-sm font-medium">{order.tier_name}</div>

        {/* 狀態 Badge */}
        <div>
          <OrderStatusBadge status={order.status} size="sm" />
        </div>

        {/* 金額 */}
        <div className="text-right font-bold">{formatAmount(order.total_amount)}</div>

        {/* 建立時間 */}
        <div className="text-sm text-text-secondary" suppressHydrationWarning>{formatDateTW(order.created_at)}</div>
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
