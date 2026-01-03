import Link from 'next/link'
import type { OrderWithUser } from '@/types'
import { OrderStatusBadge } from './order-status-badge'
import { formatCurrency } from '@/lib/utils'

/**
 * Order Card Component
 * Feature: 004-cart-and-orders
 *
 * 訂單卡片元件 (用於訂單列表)
 * - 顯示訂單基本資訊
 * - 點擊可進入訂單詳情
 * - Neo-Brutalism 設計風格
 */

interface OrderCardProps {
  order: OrderWithUser
  showCustomerInfo?: boolean // 管理員檢視時顯示客戶資訊
}

export function OrderCard({ order, showCustomerInfo = false }: OrderCardProps) {
  const createdDate = new Date(order.created_at).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Link
      href={showCustomerInfo ? `/admin/orders/${order.id}` : `/store/orders/${order.id}`}
      className="block"
    >
      <div className="group rounded-none border-3 border-black bg-white p-6 shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none">
        {/* 訂單編號與狀態 */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">{order.order_number}</h3>
            <p className="mt-1 text-sm text-gray-600">{createdDate}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        {/* 客戶資訊 (管理員檢視) */}
        {showCustomerInfo && (
          <div className="mb-4 rounded-none border-2 border-gray-300 bg-gray-50 p-3">
            <p className="text-sm">
              <span className="font-bold">客戶:</span> {order.user_name}
            </p>
            <p className="text-sm">
              <span className="font-bold">手機:</span> {order.user_phone}
            </p>
            <p className="text-sm">
              <span className="font-bold">等級:</span> {order.tier_name}
            </p>
          </div>
        )}

        {/* 訂單金額 */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">訂單金額</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(order.total_amount)}
          </p>
        </div>

        {/* 備註 */}
        {order.notes && (
          <div className="rounded-none border-2 border-gray-300 bg-gray-50 p-3">
            <p className="text-sm">
              <span className="font-bold">備註:</span> {order.notes}
            </p>
          </div>
        )}

        {/* Hover 提示 */}
        <div className="mt-4 flex items-center justify-end text-sm text-gray-500 group-hover:text-black">
          <span>點擊查看詳情</span>
          <span className="ml-1">→</span>
        </div>
      </div>
    </Link>
  )
}
