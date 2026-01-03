/**
 * Customer Orders List Page
 * Feature: 004-cart-and-orders (US2, US4)
 * Route: /store/orders
 *
 * 客戶訂單列表頁面
 * - 顯示客戶自己的所有訂單
 * - 支援狀態篩選
 * - RLS 自動確保客戶只能看到自己的訂單
 */

'use client'

import { useEffect, useState } from 'react'
import { getOrders } from '@/lib/actions/orders'
import { OrderCard } from '@/components/shop/order-card'
import type { OrderWithUser, OrderStatus } from '@/types'
import Link from 'next/link'

const statusOptions: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部訂單' },
  { value: 'pending', label: '待確認' },
  { value: 'confirmed', label: '已確認' },
  { value: 'shipping', label: '出貨中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<OrderWithUser[]>([])
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadOrders() {
      setIsLoading(true)
      setError(null)

      const result = await getOrders({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page: 1,
        limit: 100, // 客戶端簡化,載入全部訂單
      })

      if (result.success && result.data) {
        setOrders(result.data.orders)
      } else {
        setError(result.message || '載入訂單列表時發生錯誤')
      }

      setIsLoading(false)
    }

    loadOrders()
  }, [statusFilter])

  // 載入中狀態
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mb-4 text-6xl">⏳</div>
              <p className="text-xl font-bold">載入訂單列表...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold">我的訂單</h1>
          <p className="mt-2 text-gray-600">
            查看您的所有訂單記錄
          </p>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-6 rounded-none border-3 border-red-600 bg-red-100 p-4">
            <p className="text-red-600 font-bold">❌ {error}</p>
          </div>
        )}

        {/* 狀態篩選 */}
        <div className="mb-6 flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`rounded-none border-3 px-4 py-2 font-bold transition-all ${
                statusFilter === option.value
                  ? 'border-black bg-green-400 shadow-neo'
                  : 'border-gray-400 bg-white hover:border-black'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* 訂單列表 */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-6 text-8xl">📋</div>
            <h2 className="mb-4 text-3xl font-bold">
              {statusFilter === 'all' ? '尚無訂單' : `無「${statusOptions.find(o => o.value === statusFilter)?.label}」訂單`}
            </h2>
            <p className="mb-8 text-gray-600">
              {statusFilter === 'all'
                ? '趕快去挑選喜歡的商品吧!'
                : '試試其他篩選條件或開始購物'}
            </p>
            {statusFilter === 'all' && (
              <Link
                href="/store"
                className="rounded-none border-3 border-black bg-green-400 px-8 py-4 text-lg font-bold shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
              >
                開始購物
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} showCustomerInfo={false} />
            ))}
          </div>
        )}

        {/* 訂單統計 */}
        {orders.length > 0 && (
          <div className="mt-8 rounded-none border-2 border-gray-300 bg-white p-4 text-center">
            <p className="text-sm text-gray-600">
              共 {orders.length} 筆訂單
              {statusFilter !== 'all' && ` (${statusOptions.find(o => o.value === statusFilter)?.label})`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
