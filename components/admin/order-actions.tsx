'use client'

import { useTransition } from 'react'
import { confirmOrder } from '@/lib/actions/orders'
import { OrderStatusUpdater } from './order-status-updater'
import { OrderCancelButton } from './order-cancel-button'
import { toast } from 'sonner'
import type { OrderStatus } from '@/types'

/**
 * 訂單操作元件
 * Feature: 004-cart-and-orders / US3
 *
 * - 確認訂單（扣減庫存）
 * - 更新訂單狀態
 * - 取消訂單
 * - Neo-Brutalism 設計風格
 */

interface OrderActionsProps {
  orderId: string
  orderNumber: string
  currentStatus: OrderStatus
}

export function OrderActions({ orderId, orderNumber, currentStatus }: OrderActionsProps) {
  const [isPending, startTransition] = useTransition()

  const handleConfirmOrder = async () => {
    if (!confirm('確定要確認訂單並扣減庫存嗎？此操作無法撤銷。')) {
      return
    }

    startTransition(async () => {
      const result = await confirmOrder(orderId)

      if (result.success) {
        toast.success(result.message || '訂單確認成功！')
        window.location.reload() // 重新載入頁面以顯示最新狀態
      } else {
        toast.error(result.message || '訂單確認失敗')
      }
    })
  }

  return (
    <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
      <h2 className="mb-4 text-xl font-bold">訂單操作</h2>
      <div className="flex flex-wrap gap-4">
        {currentStatus === 'pending' && (
          <button
            onClick={handleConfirmOrder}
            disabled={isPending}
            className="rounded-none border-3 border-black bg-green-400 px-6 py-3 font-bold shadow-neo transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-neo"
          >
            {isPending ? '處理中...' : '確認訂單（扣減庫存）'}
          </button>
        )}
        <OrderStatusUpdater orderId={orderId} currentStatus={currentStatus} />
        <OrderCancelButton
          orderId={orderId}
          currentStatus={currentStatus}
          orderNumber={orderNumber}
        />
      </div>
    </div>
  )
}
