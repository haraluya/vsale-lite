/**
 * Customer Order Detail Page
 * Feature: 004-cart-and-orders (US2, US4)
 * Route: /store/orders/[id]
 *
 * 客戶訂單詳情頁面
 * - 顯示訂單完整資訊
 * - 顯示訂單明細與總金額
 * - RLS 自動確保客戶只能看到自己的訂單
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { getOrderById } from '@/lib/actions/orders'
import { OrderStatusBadge } from '@/components/shop/order-status-badge'
import type { OrderDetail } from '@/types'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

export default function CustomerOrderDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params.id as string
  const isSuccess = searchParams.get('success') === 'true'

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadOrder() {
      setIsLoading(true)
      setError(null)

      const result = await getOrderById(orderId)

      if (result.success && result.data) {
        setOrder(result.data)
      } else {
        setError(result.message || '載入訂單詳情時發生錯誤')
      }

      setIsLoading(false)
    }

    loadOrder()
  }, [orderId])

  // 載入中狀態
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mb-4 text-6xl">⏳</div>
              <p className="text-xl font-bold">載入訂單詳情...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-6 text-8xl">❌</div>
            <h2 className="mb-4 text-3xl font-bold">無法載入訂單</h2>
            <p className="mb-8 text-gray-600">{error}</p>
            <Link
              href="/store/orders"
              className="rounded-none border-3 border-black bg-green-400 px-8 py-4 text-lg font-bold shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              返回訂單列表
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const createdDate = new Date(order.created_at).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* 成功訊息 */}
        {isSuccess && (
          <div className="mb-6 rounded-none border-3 border-green-600 bg-green-100 p-6 text-center">
            <div className="mb-2 text-6xl">🎉</div>
            <h2 className="mb-2 text-2xl font-bold text-green-900">訂單建立成功!</h2>
            <p className="text-green-800">我們將盡快為您處理訂單</p>
          </div>
        )}

        {/* 返回按鈕 */}
        <div className="mb-6">
          <Link
            href="/store/orders"
            className="inline-flex items-center text-lg font-bold hover:underline"
          >
            ← 返回訂單列表
          </Link>
        </div>

        {/* 訂單標題 */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">{order.order_number}</h1>
            <p className="mt-2 text-gray-600">{createdDate}</p>
          </div>
          <OrderStatusBadge status={order.status} size="lg" />
        </div>

        {/* 訂單內容 */}
        <div className="space-y-6">
          {/* 商品明細 */}
          <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
            <h2 className="mb-4 text-2xl font-bold">訂單商品</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b-2 border-gray-200 pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex-1">
                    <h3 className="font-bold">{item.product_name_snapshot}</h3>
                    <p className="text-sm text-gray-600">
                      單價: {formatCurrency(item.deal_price)} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 總計 */}
            <div className="mt-6 border-t-3 border-black pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xl font-bold">訂單總金額</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(order.total_amount)}
                </p>
              </div>
            </div>
          </div>

          {/* 訂單備註 */}
          {order.notes && (
            <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
              <h2 className="mb-4 text-2xl font-bold">訂單備註</h2>
              <p className="text-gray-800">{order.notes}</p>
            </div>
          )}

          {/* 訂單資訊 */}
          <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
            <h2 className="mb-4 text-2xl font-bold">訂單資訊</h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="font-bold">訂單編號:</dt>
                <dd className="text-gray-800">{order.order_number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-bold">訂單狀態:</dt>
                <dd>
                  <OrderStatusBadge status={order.status} size="sm" />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-bold">建立時間:</dt>
                <dd className="text-gray-800">{createdDate}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-bold">商品數量:</dt>
                <dd className="text-gray-800">
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)} 件
                </dd>
              </div>
            </dl>
          </div>

          {/* 狀態說明 */}
          <div className="rounded-none border-2 border-gray-300 bg-gray-50 p-4">
            <h3 className="mb-2 font-bold">訂單狀態說明</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>⏳ <strong>待確認</strong>: 訂單已送出,等待管理員確認</li>
              <li>✅ <strong>已確認</strong>: 訂單已確認,準備出貨</li>
              <li>🚚 <strong>出貨中</strong>: 訂單已出貨,運送中</li>
              <li>🎉 <strong>已完成</strong>: 訂單已完成</li>
              <li>❌ <strong>已取消</strong>: 訂單已取消</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
