'use client'

import { useState, useTransition } from 'react'
import { updateOrderStatus } from '@/lib/actions/orders'
import { toast } from 'sonner'
import type { OrderStatus } from '@/types'

/**
 * 訂單狀態更新器元件
 * Feature: 011-shipping-and-order-edit / US6
 *
 * - 允許管理員更新訂單狀態（shipping → completed）
 * - Neo-Brutalism 設計風格
 * - 顯示載入狀態與錯誤處理
 */

interface OrderStatusUpdaterProps {
  orderId: string
  currentStatus: OrderStatus
}

const NEXT_STATUS_MAP: Partial<Record<OrderStatus, { status: 'shipping' | 'completed'; label: string }>> = {
  shipping: { status: 'completed', label: '標記為已完成' },
}

export function OrderStatusUpdater({ orderId, currentStatus }: OrderStatusUpdaterProps) {
  const [isPending, startTransition] = useTransition()
  const nextStatus = NEXT_STATUS_MAP[currentStatus]

  // 如果沒有下一個狀態（如 pending, completed, cancelled），不顯示按鈕
  if (!nextStatus) {
    return null
  }

  const handleUpdateStatus = () => {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, nextStatus.status)

      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message || '更新訂單狀態失敗')
      }
    })
  }

  return (
    <button
      onClick={handleUpdateStatus}
      disabled={isPending}
      className="rounded-none border-3 border-black bg-blue-400 px-6 py-3 font-bold shadow-neo transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-neo"
    >
      {isPending ? '處理中...' : nextStatus.label}
    </button>
  )
}
