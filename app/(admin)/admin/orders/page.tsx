import { Suspense } from 'react'
import { Package } from 'lucide-react'
import { OrderFilters } from '@/components/admin/orders/order-filters'
import { OrderList } from '@/components/admin/orders/order-list'
import { OrderListSkeleton } from '@/components/admin/orders/order-list-skeleton'
import { cn } from '@/lib/utils'
import { designTokens, getPageContainerClasses, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { generatePageMetadata } from '@/lib/metadata'
import type { OrderStatus } from '@/types'

/**
 * 管理員訂單列表頁面
 * Feature: 004-cart-and-orders / US3
 * Feature: Performance Optimization - Order List Streaming (Phase 2.2)
 * Route: /admin/orders
 *
 * 優化重點：
 * - 標題與篩選器立即顯示（不需等待訂單資料載入）
 * - 訂單列表使用 Suspense 邊界支援 Streaming
 * - Server 端篩選（不在客戶端載入全部訂單）
 * - 預期初始載入 -35%，記憶體使用 -50%
 */

// 🔧 保持動態渲染，避免快取問題
export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return generatePageMetadata('訂單管理', '查看所有訂單')
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    search?: string
    page?: string
    limit?: string
  }>
}) {
  const params = await searchParams
  const status = (params.status as OrderStatus) || undefined
  const search = params.search || undefined
  const page = parseInt(params.page || '1')
  const limit = parseInt(params.limit || '20')

  return (
    <div className={getPageContainerClasses('default')}>
      {/* 標題 - 立即顯示 */}
      <div
        className={cn(
          'flex items-center gap-3 md:gap-4 rounded-none bg-white',
          getNeoBrutalismClasses(),
          designTokens.spacing.card.padding
        )}
      >
        <div className="rounded-none border-2 border-black bg-blue-400 p-2 md:p-3">
          <Package className="h-6 w-6 md:h-8 md:w-8" />
        </div>
        <div>
          <h1 className={designTokens.typography.h1}>訂單管理</h1>
          <p className={cn(designTokens.typography.body.base, 'text-gray-600')}>管理所有客戶訂單</p>
        </div>
      </div>

      {/* 篩選器 - 立即顯示 */}
      <OrderFilters />

      {/* 訂單列表 - Suspense 邊界支援 Streaming */}
      <Suspense fallback={<OrderListSkeleton />}>
        <OrderList status={status} search={search} page={page} limit={limit} />
      </Suspense>
    </div>
  )
}
