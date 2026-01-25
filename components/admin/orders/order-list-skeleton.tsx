import { TableSkeleton } from '@/components/admin/skeletons'

/**
 * Order List Skeleton 組件
 * Feature: Performance Optimization - Order List Streaming & Phase 2.5
 *
 * 使用統一的 TableSkeleton 組件
 * - 6 列（訂單表格）
 * - 5 行桌面版
 * - 3 張手機版卡片
 * - 顯示篩選器骨架
 */

export function OrderListSkeleton() {
  return (
    <TableSkeleton
      columns={6}
      rows={5}
      mobileCards={3}
      showFilters={true}
      showPagination={true}
    />
  )
}
