/**
 * Customer Orders Content (Client Component)
 * Feature: 004-cart-and-orders (US2, US4)
 *
 * 客戶訂單列表頁面內容
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
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

const statusOptions: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部訂單' },
  { value: 'pending', label: '待確認' },
  { value: 'shipping', label: '出貨中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

export function CustomerOrdersContent() {
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
        limit: 100,
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
      <div className={cn(
        "min-h-screen bg-gray-50",
        designTokens.spacing.page.padding
      )}>
        <div className={designTokens.container.default}>
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mb-4 text-6xl">⏳</div>
              <p className={designTokens.typography.h3}>載入訂單列表...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "min-h-screen bg-gray-50",
      designTokens.spacing.page.padding
    )}>
      <div className={cn(
        designTokens.container.default,
        designTokens.spacing.page.gap
      )}>
        {/* 頁面標題 */}
        <div className={designTokens.spacing.section.marginBottom}>
          <h1 className={designTokens.typography.h1}>我的訂單</h1>
          <p className={cn(
            designTokens.typography.body.base,
            "mt-2 text-gray-600"
          )}>
            查看您的所有訂單記錄
          </p>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className={cn(
            "rounded-none bg-red-100",
            designTokens.neoBrutalism.border.full,
            "border-red-600",
            "p-4",
            designTokens.spacing.section.marginBottom
          )}>
            <p className="text-red-600 font-bold">❌ {error}</p>
          </div>
        )}

        {/* 狀態篩選 */}
        <div className={cn(
          "flex flex-wrap gap-2 md:gap-3",
          designTokens.spacing.section.marginBottom
        )}>
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={cn(
                "rounded-none font-bold transition-all",
                "px-3 py-2 md:px-4",
                "min-h-[44px]",
                designTokens.typography.body.base,
                statusFilter === option.value ? [
                  designTokens.neoBrutalism.border.full,
                  "border-black bg-green-400",
                  designTokens.neoBrutalism.shadow.full
                ] : [
                  "border-2 border-gray-400 bg-white",
                  "hover:border-black hover:shadow-neo-sm md:hover:shadow-neo"
                ]
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* 訂單列表 */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-6 text-6xl md:text-8xl">📋</div>
            <h2 className={cn(
              designTokens.typography.h2,
              "mb-4 text-center"
            )}>
              {statusFilter === 'all' ? '尚無訂單' : `無「${statusOptions.find(o => o.value === statusFilter)?.label}」訂單`}
            </h2>
            <p className={cn(
              designTokens.typography.body.large,
              "mb-8 text-gray-600 text-center"
            )}>
              {statusFilter === 'all'
                ? '趕快去挑選喜歡的商品吧!'
                : '試試其他篩選條件或開始購物'}
            </p>
            {statusFilter === 'all' && (
              <Link
                href="/store"
                className={cn(
                  "rounded-none bg-green-400 font-bold transition-all",
                  designTokens.neoBrutalism.border.full,
                  "border-black",
                  designTokens.neoBrutalism.shadow.full,
                  designTokens.neoBrutalism.hover,
                  "px-6 py-3 md:px-8 md:py-4",
                  designTokens.typography.body.large
                )}
              >
                開始購物
              </Link>
            )}
          </div>
        ) : (
          <div className={cn(
            "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
            designTokens.spacing.grid.gap
          )}>
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} showCustomerInfo={false} />
            ))}
          </div>
        )}

        {/* 訂單統計 */}
        {orders.length > 0 && (
          <div className={cn(
            "mt-6 md:mt-8 rounded-none bg-white text-center",
            "border-2 border-gray-300",
            "p-3 md:p-4"
          )}>
            <p className={cn(
              designTokens.typography.caption,
              "text-gray-600"
            )}>
              共 {orders.length} 筆訂單
              {statusFilter !== 'all' && ` (${statusOptions.find(o => o.value === statusFilter)?.label})`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
