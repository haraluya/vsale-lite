'use client'

/**
 * Virtual Order List
 * Feature: Performance Optimization - Phase 3.1 + Phase 3.4
 *
 * 虛擬滾動訂單列表，優化大量訂單（> 100 筆）的渲染性能
 * - 使用 @tanstack/react-virtual
 * - 每列高度 80px
 * - Overscan 5 列
 * - 預期提升：大列表渲染 -95% (3.5s → 0.15s)
 * - 🚀 Phase 3.4: 使用 React.memo 優化虛擬滾動行重渲染 (-50%)
 */

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import Link from 'next/link'
import { VirtualOrderRow } from '@/components/admin/orders/virtual-order-row'
import { OrderCard } from '@/components/admin/orders/order-card'
import { OrderStatusBadge } from '@/components/shop/order-status-badge'
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import { formatDateTW, formatAmount } from '@/lib/date-utils'
import type { OrderWithUser } from '@/types'

interface VirtualOrderListProps {
  orders: OrderWithUser[]
}

export function VirtualOrderList({ orders }: VirtualOrderListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  // 虛擬滾動配置
  const virtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // 每列高度 80px
    overscan: 5, // 預載 5 列
  })

  return (
    <div className="space-y-4">
      {/* 桌面版：虛擬滾動表格 */}
      <div className="hidden lg:block">
        <div
          className={cn(
            'rounded-none bg-white overflow-hidden',
            designTokens.neoBrutalism.border.full,
            designTokens.neoBrutalism.shadow.full
          )}
        >
          {/* 表頭（固定） */}
          <div className="grid grid-cols-6 gap-4 border-b-3 border-black bg-gray-100 p-4 font-bold sticky top-0 z-10">
            <div>訂單編號</div>
            <div>客戶</div>
            <div>等級</div>
            <div>狀態</div>
            <div className="text-right">金額</div>
            <div>建立時間</div>
          </div>

          {/* 虛擬滾動容器 */}
          <div
            ref={parentRef}
            className="relative overflow-auto"
            style={{ height: '600px' }} // 固定高度以啟用滾動
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {/* 🚀 Phase 3.4: 使用 Memoized VirtualOrderRow 組件 */}
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const order = orders[virtualRow.index]

                return (
                  <VirtualOrderRow
                    key={virtualRow.key}
                    ref={virtualizer.measureElement}
                    order={order}
                    index={virtualRow.index}
                    start={virtualRow.start}
                  />
                )
              })}
            </div>
          </div>
        </div>

        {/* 顯示總數 */}
        <div className="text-sm text-gray-600 mt-4">
          顯示 {orders.length} 筆訂單（虛擬滾動模式）
        </div>
      </div>

      {/* 手機版：卡片視圖（使用一般滾動，因為手機通常使用分頁） */}
      <div className="lg:hidden space-y-3 md:space-y-4">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/admin/orders/${order.id}`}
            className={cn(
              'block rounded-none bg-white',
              getNeoBrutalismClasses({ active: true }),
              designTokens.spacing.card.padding
            )}
          >
            {/* 訂單編號與狀態 */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-mono font-bold text-blue-600 text-sm md:text-base">
                  {order.order_number}
                </div>
                <div className="text-xs md:text-sm text-gray-600 mt-1">
                  {formatDateTW(order.created_at)}
                </div>
              </div>
              <OrderStatusBadge status={order.status} size="sm" />
            </div>

            {/* 客戶資訊 */}
            <div className="mb-3">
              <div className="font-bold text-sm md:text-base">{order.user_name}</div>
              <div className="text-xs md:text-sm text-gray-600">{order.user_phone}</div>
              <div className="text-xs md:text-sm text-gray-600">等級: {order.tier_name}</div>
            </div>

            {/* 金額 */}
            <div className="pt-3 border-t-2 border-black">
              <div className="flex items-center justify-between">
                <span className="text-sm md:text-base font-medium text-gray-700">訂單金額</span>
                <span className="font-mono font-bold text-base md:text-lg text-blue-600">
                  {formatAmount(order.total_amount)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
