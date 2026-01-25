'use client'

/**
 * 訂單狀態更新器元件
 * Feature: 011-shipping-and-order-edit / US6
 * Feature: Performance Optimization - Phase 2.4 (Optimistic Updates)
 *
 * - 允許管理員更新訂單狀態（shipping → completed）
 * - 使用 React 19 useOptimistic Hook 實現樂觀更新
 * - 立即 UI 反應（0ms 感知延遲）
 * - 背景發送請求更新資料庫
 * - 失敗時自動回滾並顯示錯誤
 * - Neo-Brutalism 設計風格
 */

import { useOptimistic, useTransition } from 'react'
import { updateOrderStatus } from '@/lib/actions/orders'
import { toast } from 'sonner'
import type { OrderStatus } from '@/types'

interface OrderStatusUpdaterProps {
  orderId: string
  currentStatus: OrderStatus
  onStatusChanged?: () => void
}

const NEXT_STATUS_MAP: Partial<Record<OrderStatus, { status: 'shipping' | 'completed'; label: string }>> = {
  shipping: { status: 'completed', label: '標記為已完成' },
}

export function OrderStatusUpdater({ orderId, currentStatus, onStatusChanged }: OrderStatusUpdaterProps) {
  const [isPending, startTransition] = useTransition()

  // 樂觀更新狀態（立即反應）
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<OrderStatus, OrderStatus>(
    currentStatus,
    (_, newStatus) => newStatus
  )

  const nextStatus = NEXT_STATUS_MAP[optimisticStatus]

  // 如果沒有下一個狀態（如 pending, completed, cancelled），不顯示按鈕
  if (!nextStatus) {
    return null
  }

  const handleUpdateStatus = () => {
    // 立即更新 UI（樂觀更新）
    setOptimisticStatus(nextStatus.status as OrderStatus)

    // 背景發送請求
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, nextStatus.status)

      if (result.success) {
        // 成功：保持樂觀更新的狀態，顯示成功訊息
        toast.success(result.message || '訂單狀態已更新')
        onStatusChanged?.()
      } else {
        // 失敗：自動回滾到原始狀態
        setOptimisticStatus(currentStatus)
        toast.error(result.message || '更新訂單狀態失敗')
      }
    })
  }

  return (
    <button
      onClick={handleUpdateStatus}
      disabled={isPending}
      className="rounded-none border-2 md:border-3 border-black bg-blue-400 px-6 py-3 font-bold shadow-neo-sm md:shadow-neo transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-neo"
      aria-label={`更新訂單狀態為${nextStatus.label}`}
    >
      {isPending ? '處理中...' : nextStatus.label}
    </button>
  )
}
