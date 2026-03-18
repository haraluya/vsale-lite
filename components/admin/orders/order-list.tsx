import { getOrders } from '@/lib/actions/orders'
import { SmartOrderList } from '@/components/admin/orders/smart-order-list'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'
import type { OrderStatus } from '@/types'

/**
 * Order List Server Component
 * Feature: Performance Optimization - Order List Streaming + Virtual Scroll (Phase 3.1)
 *
 * 獨立的 Server Component，透過 Suspense 邊界支援 Streaming
 * - 訂單數量 > 100：自動啟用虛擬滾動
 */

interface OrderListProps {
  status?: OrderStatus | 'all'
  search?: string
  page: number
  limit: number
}

export async function OrderList({ status, search, page, limit }: OrderListProps) {
  // 呼叫 Server Action 查詢訂單（已支援 status 和 search 參數）
  const result = await getOrders({
    status: status && status !== 'all' ? status : undefined,
    search,
    page,
    limit,
  })

  // 錯誤處理
  if (!result.success || !result.data) {
    return (
      <div
        className={cn(
          'rounded-theme-sm bg-red-100 text-center',
          designTokens.cleanCommerce.border.full,
          designTokens.cleanCommerce.shadow.full,
          designTokens.spacing.card.padding
        )}
      >
        <h2 className={cn(designTokens.typography.h2, 'mb-2')}>載入失敗</h2>
        <p className={cn(designTokens.typography.body.base, 'text-gray-700')}>
          {result.message || '訂單資料不存在'}
        </p>
      </div>
    )
  }

  const { orders, total } = result.data

  return (
    <SmartOrderList
      orders={orders}
      total={total}
      currentPage={page}
      pageSize={limit}
    />
  )
}
