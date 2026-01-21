'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Filter } from 'lucide-react'
import { OrderStatusBadge } from '@/components/shop/order-status-badge'
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import { formatDateTW, formatAmount } from '@/lib/date-utils'
import type { OrderStatus, OrderWithUser } from '@/types'

/**
 * 管理員訂單列表元件
 * Feature: 004-cart-and-orders / US3
 *
 * - 顯示訂單列表（含篩選與搜尋）
 * - Neo-Brutalism 設計風格
 * - 支援點擊進入訂單詳情
 */

interface OrderTableProps {
  initialOrders: OrderWithUser[]
  initialTotal: number
}

const STATUS_OPTIONS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部狀態' },
  { value: 'pending', label: '待確認' },
  { value: 'shipping', label: '出貨中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

export function OrderTable({ initialOrders, initialTotal }: OrderTableProps) {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // 客戶端篩選（實際專案中應使用 Server Actions 重新查詢）
  const filteredOrders = initialOrders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    const matchesSearch =
      searchTerm === '' ||
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.user_phone || '').includes(searchTerm)

    return matchesStatus && matchesSearch
  })

  return (
    <div className={designTokens.spacing.page.gap}>
      {/* 篩選與搜尋區域 */}
      <div className={cn(
        "flex flex-col gap-4 rounded-none bg-white sm:flex-row",
        designTokens.neoBrutalism.border.full,
        designTokens.neoBrutalism.shadow.full,
        designTokens.spacing.card.padding
      )}>
        {/* 狀態篩選 */}
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as OrderStatus | 'all')}
            className={cn(
              "rounded-none border-2 border-black bg-white font-bold focus:outline-none",
              designTokens.input.base,
              designTokens.neoBrutalism.hover
            )}
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 搜尋框 */}
        <div className={cn(
          "flex flex-1 items-center gap-2 rounded-none border-2 border-black bg-white",
          designTokens.input.base
        )}>
          <Search className="h-5 w-5" />
          <input
            type="text"
            placeholder="搜尋訂單編號、客戶名稱或手機號碼..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent font-medium focus:outline-none"
          />
        </div>
      </div>

      {/* 桌面版: 完整表格 */}
      <div className={cn(
        "hidden lg:block rounded-none bg-white overflow-x-auto",
        designTokens.neoBrutalism.border.full,
        designTokens.neoBrutalism.shadow.full
      )}>
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
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm || statusFilter !== 'all' ? '找不到符合條件的訂單' : '尚無訂單'}
          </div>
        ) : (
          <div className="divide-y-2 divide-black">
            {filteredOrders.map(order => (
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
        {filteredOrders.length === 0 ? (
          <div className={cn(
            "rounded-none bg-white p-8 text-center text-gray-500",
            designTokens.neoBrutalism.border.full,
            designTokens.neoBrutalism.shadow.full
          )}>
            {searchTerm || statusFilter !== 'all' ? '找不到符合條件的訂單' : '尚無訂單'}
          </div>
        ) : (
          filteredOrders.map(order => (
            <Link
              key={order.id}
              href={`/admin/orders/${order.id}`}
              className={cn(
                "block rounded-none bg-white",
                getNeoBrutalismClasses({ active: true }),
                designTokens.spacing.card.padding,
                designTokens.spacing.card.gap
              )}
            >
              {/* 訂單編號與狀態 */}
              <div className="flex items-start justify-between gap-3">
                <div className={cn("font-mono font-bold text-blue-600", designTokens.typography.body.base)}>
                  {order.order_number}
                </div>
                <OrderStatusBadge status={order.status} size="sm" />
              </div>

              {/* 客戶資訊 */}
              <div className={designTokens.spacing.card.gap}>
                <div className={cn("font-bold", designTokens.typography.body.base)}>
                  {order.user_name}
                </div>
                <div className={cn("text-gray-600", designTokens.typography.caption)}>
                  {order.user_phone} • {order.tier_name}
                </div>
              </div>

              {/* 金額與時間 */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <div className={cn("text-gray-600", designTokens.typography.caption)}>
                  {formatDate(order.created_at)}
                </div>
                <div className={cn("font-bold", designTokens.typography.body.base)}>
                  {formatAmount(order.total_amount)}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* 統計資訊 */}
      <div className={cn("text-gray-600", designTokens.typography.caption)}>
        顯示 {filteredOrders.length} 筆訂單 {filteredOrders.length !== initialTotal && `（篩選自共 ${initialTotal} 筆）`}
      </div>
    </div>
  )
}
