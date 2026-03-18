'use client'

/**
 * Smart Order List - 智能切換組件
 * Feature: Performance Optimization - Phase 3.1
 *
 * 根據訂單數量智能切換渲染模式：
 * - <= 100 筆：使用標準表格
 * - > 100 筆：使用虛擬滾動（優化渲染性能）
 */

import { OrderTable } from '@/components/admin/order-table'
import { VirtualOrderList } from '@/components/admin/orders/virtual-order-list'
import type { OrderWithUser } from '@/types'

interface SmartOrderListProps {
  orders: OrderWithUser[]
  total: number
  currentPage: number
  pageSize: number
  useVirtualScroll?: boolean // 強制使用虛擬滾動
}

export function SmartOrderList({
  orders,
  total,
  currentPage,
  pageSize,
  useVirtualScroll = false,
}: SmartOrderListProps) {
  // 智能切換：訂單數量 > 100 或強制啟用虛擬滾動
  const shouldUseVirtualScroll = useVirtualScroll || orders.length > 100

  if (shouldUseVirtualScroll) {
    return (
      <div>
        {/* 提示訊息 */}
        <div className="mb-4 text-sm text-gray-600 bg-blue-50 border p-3">
          ⚡ 虛擬滾動模式已啟用（{orders.length} 筆訂單）- 提升大列表渲染性能
        </div>

        <VirtualOrderList orders={orders} />
      </div>
    )
  }

  // 標準模式：使用 OrderTable（含分頁）
  return (
    <OrderTable
      orders={orders}
      total={total}
      currentPage={currentPage}
      pageSize={pageSize}
    />
  )
}
