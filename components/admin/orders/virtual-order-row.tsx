/**
 * Virtual Order Row Component (Memoized)
 * Feature: Performance Optimization - Phase 3.4
 *
 * 虛擬滾動訂單行組件 - 使用 React.memo 優化重渲染性能
 * - 僅在關鍵 props 變更時重渲染
 * - 預期提升：虛擬滾動重渲染 -50%
 */

import { memo, forwardRef } from 'react'
import Link from 'next/link'
import { OrderStatusBadge } from '@/components/shop/order-status-badge'
import { formatDateTW, formatAmount } from '@/lib/date-utils'
import type { OrderWithUser } from '@/types'

interface VirtualOrderRowProps {
  order: OrderWithUser
  index: number
  start: number
}

/**
 * 虛擬滾動訂單行組件
 * 使用 React.memo 避免不必要的重渲染
 * 使用 forwardRef 讓 virtualizer.measureElement 可以量測高度
 */
export const VirtualOrderRow = memo(
  forwardRef<HTMLAnchorElement, VirtualOrderRowProps>(
    function VirtualOrderRow({ order, index, start }, ref) {
      return (
        <Link
          ref={ref}
          href={`/admin/orders/${order.id}`}
          data-index={index}
          className="absolute top-0 left-0 w-full grid grid-cols-6 gap-4 p-4 border-b border-border items-center hover:bg-yellow-50 transition-colors"
          style={{
            transform: `translateY(${start}px)`,
          }}
        >
          {/* 訂單編號 */}
          <div className="font-mono font-bold text-blue-600">
            {order.order_number}
          </div>

          {/* 客戶 */}
          <div>
            <div className="font-bold">{order.user_name}</div>
            <div className="text-sm text-text-secondary">{order.user_phone}</div>
          </div>

          {/* 等級 */}
          <div className="text-sm font-medium">{order.tier_name}</div>

          {/* 狀態 */}
          <div>
            <OrderStatusBadge status={order.status} size="sm" />
          </div>

          {/* 金額 */}
          <div className="text-right font-bold">
            {formatAmount(order.total_amount)}
          </div>

          {/* 建立時間 */}
          <div className="text-sm text-text-secondary">
            {formatDateTW(order.created_at)}
          </div>
        </Link>
      )
    }
  ),
  // 自訂比較函數：僅比較關鍵欄位
  (prevProps, nextProps) => {
    const prevOrder = prevProps.order
    const nextOrder = nextProps.order

    // 只要任一關鍵欄位變更，就重新渲染
    return (
      prevOrder.id === nextOrder.id &&
      prevOrder.order_number === nextOrder.order_number &&
      prevOrder.status === nextOrder.status &&
      prevOrder.total_amount === nextOrder.total_amount &&
      prevOrder.user_name === nextOrder.user_name &&
      prevOrder.user_phone === nextOrder.user_phone &&
      prevOrder.tier_name === nextOrder.tier_name &&
      prevOrder.created_at === nextOrder.created_at &&
      prevProps.index === nextProps.index &&
      prevProps.start === nextProps.start
    )
  }
)
