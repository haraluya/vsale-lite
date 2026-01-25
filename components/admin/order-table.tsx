'use client'

import Link from 'next/link'
import { OrderStatusBadge } from '@/components/shop/order-status-badge'
import { Pagination } from '@/components/admin/pagination'
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import { formatDateTW, formatAmount } from '@/lib/date-utils'
import type { OrderWithUser } from '@/types'

/**
 * 管理員訂單列表元件（純顯示元件）
 * Feature: 004-cart-and-orders / US3
 * Feature: Performance Optimization - Order List Streaming (Phase 2.2)
 *
 * - 顯示訂單列表（不含篩選邏輯，僅顯示）
 * - Neo-Brutalism 設計風格
 * - 支援點擊進入訂單詳情
 * - 分頁功能
 */

interface OrderTableProps {
  orders: OrderWithUser[]
  total: number
  currentPage: number
  pageSize: number
}

export function OrderTable({ orders, total, currentPage, pageSize }: OrderTableProps) {
  return (
    <div className={designTokens.spacing.page.gap}>
      {/* 桌面版: 完整表格 */}
      <div
        className={cn(
          'hidden lg:block rounded-none bg-white overflow-x-auto',
          designTokens.neoBrutalism.border.full,
          designTokens.neoBrutalism.shadow.full
        )}
      >
        {/* 標題列 */}
        <div className="grid grid-cols-6 gap-4 border-b-2 md:border-b-3 border-black bg-gray-100 p-4 font-bold">
          <div>訂單編號</div>
          <div>客戶</div>
          <div>等級</div>
          <div>狀態</div>
          <div className="text-right">金額</div>
          <div>建立時間</div>
        </div>

        {/* 訂單列表 */}
        {orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">找不到符合條件的訂單</div>
        ) : (
          <div className="divide-y-2 divide-black">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="grid grid-cols-6 gap-4 p-4 transition-colors hover:bg-yellow-100"
              >
                <div className="font-mono font-bold text-blue-600">{order.order_number}</div>
                <div>
                  <div className="font-bold">{order.user_name}</div>
                  <div className="text-sm text-gray-600">{order.user_phone}</div>
                </div>
                <div className="text-sm font-medium">{order.tier_name}</div>
                <div>
                  <OrderStatusBadge status={order.status} size="sm" />
                </div>
                <div className="text-right font-bold">{formatAmount(order.total_amount)}</div>
                <div className="text-sm text-gray-600">{formatDateTW(order.created_at)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 手機版: 卡片視圖 */}
      <div className="lg:hidden space-y-3 md:space-y-4">
        {orders.length === 0 ? (
          <div
            className={cn(
              'rounded-none bg-white p-8 text-center text-gray-500',
              designTokens.neoBrutalism.border.full,
              designTokens.neoBrutalism.shadow.full
            )}
          >
            找不到符合條件的訂單
          </div>
        ) : (
          orders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/orders/${order.id}`}
              className={cn(
                'block rounded-none bg-white',
                getNeoBrutalismClasses({ active: true }),
                designTokens.spacing.card.padding,
                designTokens.spacing.card.gap
              )}
            >
              {/* 訂單編號與狀態 */}
              <div className="flex items-start justify-between gap-3">
                <div className={cn('font-mono font-bold text-blue-600', designTokens.typography.body.base)}>
                  {order.order_number}
                </div>
                <OrderStatusBadge status={order.status} size="sm" />
              </div>

              {/* 客戶資訊 */}
              <div className={designTokens.spacing.card.gap}>
                <div className={cn('font-bold', designTokens.typography.body.base)}>{order.user_name}</div>
                <div className={cn('text-gray-600', designTokens.typography.caption)}>
                  {order.user_phone} • {order.tier_name}
                </div>
              </div>

              {/* 金額與時間 */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <div className={cn('text-gray-600', designTokens.typography.caption)}>{formatDateTW(order.created_at)}</div>
                <div className={cn('font-bold', designTokens.typography.body.base)}>{formatAmount(order.total_amount)}</div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* 分頁 */}
      {total > 0 && (
        <div className="mt-6">
          <Pagination total={total} currentPage={currentPage} pageSize={pageSize} />
        </div>
      )}

      {/* 統計資訊 */}
      <div className={cn('text-gray-600', designTokens.typography.caption)}>顯示 {orders.length} / 共 {total} 筆訂單</div>
    </div>
  )
}
