'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Filter } from 'lucide-react'
import { OrderStatusBadge } from '@/components/shop/order-status-badge'
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
  { value: 'confirmed', label: '已確認' },
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
      order.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user_phone.includes(searchTerm)

    return matchesStatus && matchesSearch
  })

  // 格式化金額
  const formatAmount = (amount: number) => {
    return `NT$ ${amount.toLocaleString()}`
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      {/* 篩選與搜尋區域 */}
      <div className="flex flex-col gap-4 rounded-none border-3 border-black bg-white p-4 shadow-neo sm:flex-row">
        {/* 狀態篩選 */}
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as OrderStatus | 'all')}
            className="rounded-none border-2 border-black bg-white px-3 py-2 font-bold hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none focus:outline-none"
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 搜尋框 */}
        <div className="flex flex-1 items-center gap-2 rounded-none border-2 border-black bg-white px-3 py-2">
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

      {/* 訂單列表 */}
      <div className="rounded-none border-3 border-black bg-white shadow-neo">
        {/* 標題列 */}
        <div className="grid grid-cols-6 gap-4 border-b-3 border-black bg-gray-100 p-4 font-bold">
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
                <div className="text-sm text-gray-600">{formatDate(order.created_at)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 統計資訊 */}
      <div className="text-sm text-gray-600">
        顯示 {filteredOrders.length} 筆訂單 {filteredOrders.length !== initialTotal && `（篩選自共 ${initialTotal} 筆）`}
      </div>
    </div>
  )
}
