import { TableSkeleton } from '@/components/admin/skeletons'

/**
 * Product List Skeleton 組件
 * Feature: Performance Optimization - Product List Streaming & Phase 2.5
 *
 * 使用統一的 TableSkeleton 組件
 * - 7 列（商品表格）
 * - 5 行桌面版
 * - 3 張手機版卡片
 */

export function ProductListSkeleton() {
  return (
    <TableSkeleton
      columns={7}
      rows={5}
      mobileCards={3}
      showPagination={true}
    />
  )
}
