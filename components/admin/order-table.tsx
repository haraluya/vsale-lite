'use client'

import { OrderTableRow } from '@/components/admin/orders/order-table-row'
import { OrderCard } from '@/components/admin/orders/order-card'
import { Pagination } from '@/components/admin/pagination'
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import type { OrderWithUser } from '@/types'

/**
 * 管理員訂單列表元件（純顯示元件）
 * Feature: 004-cart-and-orders / US3
 * Feature: Performance Optimization - Order List Streaming (Phase 2.2) + Prefetch (Phase 3.2) + Memoization (Phase 3.4)
 *
 * - 顯示訂單列表（不含篩選邏輯，僅顯示）
 * - Neo-Brutalism 設計風格
 * - 支援點擊進入訂單詳情
 * - Hover 預載訂單詳情（Phase 3.2）
 * - 使用 React.memo 優化重渲染（Phase 3.4）
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
          'hidden lg:block rounded-none bg-surface overflow-x-auto',
          designTokens.neoBrutalism.border.full,
          designTokens.neoBrutalism.shadow.full
        )}
      >
        {/* 標題列 */}
        <div className="grid grid-cols-6 gap-4 border-b-2 md:border-b-3 border-black bg-surface-secondary p-4 font-bold">
          <div>訂單編號</div>
          <div>客戶</div>
          <div>等級</div>
          <div>狀態</div>
          <div className="text-right">金額</div>
          <div>建立時間</div>
        </div>

        {/* 訂單列表 - 🚀 Phase 3.4: 使用 Memoized Row 組件 */}
        {orders.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">找不到符合條件的訂單</div>
        ) : (
          <div className="divide-y-2 divide-black">
            {orders.map((order) => (
              <OrderTableRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>

      {/* 手機版: 卡片視圖 - 🚀 Phase 3.4: 使用 Memoized Card 組件 */}
      <div className="lg:hidden space-y-3 md:space-y-4">
        {orders.length === 0 ? (
          <div
            className={cn(
              'rounded-none bg-surface p-8 text-center text-text-secondary',
              designTokens.neoBrutalism.border.full,
              designTokens.neoBrutalism.shadow.full
            )}
          >
            找不到符合條件的訂單
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard key={order.id} order={order} />
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
      <div className={cn('text-text-secondary', designTokens.typography.caption)}>顯示 {orders.length} / 共 {total} 筆訂單</div>
    </div>
  )
}
