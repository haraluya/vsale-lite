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
    colorClass:
      'bg-yellow-400 border-yellow-600 text-yellow-900 dark:bg-yellow-600 dark:border-yellow-400 dark:text-yellow-100',
    emoji: '⏳',
  },
  shipping: {
    label: '出貨中',
    colorClass:
      'bg-blue-400 border-blue-600 text-blue-900 dark:bg-blue-600 dark:border-blue-400 dark:text-blue-100',
    emoji: '🚚',
  },
  completed: {
    label: '已完成',
    colorClass:
      'bg-green-400 border-green-600 text-green-900 dark:bg-green-600 dark:border-green-400 dark:text-green-100',
    emoji: '🎉',
  },
  cancelled: {
    label: '已取消',
    colorClass:
      'bg-gray-400 border-gray-600 text-gray-900 dark:bg-gray-600 dark:border-gray-400 dark:text-gray-100',
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
      className={`inline-flex items-center gap-1 rounded-theme-sm border font-bold ${config.colorClass} ${sizeClass} ${className}`}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  )
}
