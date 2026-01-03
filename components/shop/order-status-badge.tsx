import type { OrderStatus } from '@/types'

/**
 * Order Status Badge Component
 * Feature: 004-cart-and-orders
 *
 * 訂單狀態徽章元件
 * - 顯示訂單狀態
 * - 使用不同顏色區分狀態
 * - Neo-Brutalism 設計風格
 */

interface OrderStatusBadgeProps {
  status: OrderStatus
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const statusConfig: Record<
  OrderStatus,
  {
    label: string
    colorClass: string
    emoji: string
  }
> = {
  pending: {
    label: '待確認',
    colorClass: 'bg-yellow-400 border-yellow-600 text-yellow-900',
    emoji: '⏳',
  },
  confirmed: {
    label: '已確認',
    colorClass: 'bg-blue-400 border-blue-600 text-blue-900',
    emoji: '✅',
  },
  shipping: {
    label: '出貨中',
    colorClass: 'bg-purple-400 border-purple-600 text-purple-900',
    emoji: '🚚',
  },
  completed: {
    label: '已完成',
    colorClass: 'bg-green-400 border-green-600 text-green-900',
    emoji: '🎉',
  },
  cancelled: {
    label: '已取消',
    colorClass: 'bg-gray-400 border-gray-600 text-gray-900',
    emoji: '❌',
  },
}

const sizeConfig = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
}

export function OrderStatusBadge({
  status,
  size = 'md',
  className = '',
}: OrderStatusBadgeProps) {
  const config = statusConfig[status]
  const sizeClass = sizeConfig[size]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-none border-2 font-bold ${config.colorClass} ${sizeClass} ${className}`}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  )
}
