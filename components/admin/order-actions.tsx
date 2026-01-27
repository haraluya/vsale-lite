'use client'

import { useTransition } from 'react'
import { markAsShipping, revertShippingToPending } from '@/lib/actions/orders'
import { OrderStatusUpdater } from './order-status-updater'
import { OrderCancelButton } from './order-cancel-button'
import { OrderDeleteButton } from './order-delete-button'
import { toast } from 'sonner'
import type { OrderStatus } from '@/types'
import { useConfirm } from '@/lib/contexts/dialog-context'

/**
 * 訂單操作元件
 * Feature: 011-shipping-and-order-edit / US6
 *
 * - 標記出貨（扣減庫存）- 取代原有的「確認訂單」
 * - 更新訂單狀態
 * - 取消訂單
 * - 刪除訂單（僅 pending 狀態）
 * - Neo-Brutalism 設計風格
 */

interface OrderActionsProps {
  orderId: string
  orderNumber: string
  currentStatus: OrderStatus
  compact?: boolean // 緊湊模式，不顯示外層包裝
}

export function OrderActions({ orderId, orderNumber, currentStatus, compact = false }: OrderActionsProps) {
  const confirm = useConfirm()
  const [isPending, startTransition] = useTransition()

  const handleMarkAsShipping = async () => {
    const confirmed = await confirm({
      title: '確認標記出貨',
      description: '確定要標記為出貨中並扣減庫存嗎？此操作無法撤銷。',
      variant: 'warning',
      confirmText: '確定',
      cancelText: '取消',
    })

    if (!confirmed) {
      return
    }

    startTransition(async () => {
      const result = await markAsShipping(orderId)

      if (result.success) {
        toast.success(result.message || '訂單已標記為出貨中！')
        window.location.reload() // 重新載入頁面以顯示最新狀態
      } else {
        toast.error(result.message || '標記出貨失敗')
      }
    })
  }

  const handleRevertToPending = async () => {
    const confirmed = await confirm({
      title: '確認恢復到待確認',
      description: '確定要將訂單恢復到待確認狀態嗎？庫存將會回補。',
      variant: 'warning',
      confirmText: '確定恢復',
      cancelText: '取消',
    })

    if (!confirmed) {
      return
    }

    startTransition(async () => {
      const result = await revertShippingToPending(orderId)

      if (result.success) {
        toast.success(result.message || '訂單已恢復到待確認狀態！')
        window.location.reload() // 重新載入頁面以顯示最新狀態
      } else {
        toast.error(result.message || '恢復失敗')
      }
    })
  }

  const buttons = (
    <>
      {currentStatus === 'pending' && (
        <button
          onClick={handleMarkAsShipping}
          disabled={isPending}
          className="rounded-none border-2 md:border-3 border-black bg-blue-400 px-4 md:px-6 py-2 md:py-3 font-bold shadow-neo-sm md:shadow-neo transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-neo text-sm md:text-base"
        >
          {isPending ? '處理中...' : '🚚 標記出貨'}
        </button>
      )}
      {currentStatus === 'shipping' && (
        <button
          onClick={handleRevertToPending}
          disabled={isPending}
          className="rounded-none border-2 md:border-3 border-black bg-yellow-400 px-4 md:px-6 py-2 md:py-3 font-bold shadow-neo-sm md:shadow-neo transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-neo text-sm md:text-base"
        >
          {isPending ? '處理中...' : '↩️ 恢復到待確認'}
        </button>
      )}
      <OrderStatusUpdater orderId={orderId} currentStatus={currentStatus} />
      <OrderCancelButton
        orderId={orderId}
        currentStatus={currentStatus}
        orderNumber={orderNumber}
      />
      <OrderDeleteButton
        orderId={orderId}
        currentStatus={currentStatus}
        orderNumber={orderNumber}
      />
    </>
  )

  if (compact) {
    return <div className="flex flex-wrap gap-3">{buttons}</div>
  }

  return (
    <div className="rounded-none border-2 md:border-3 border-black bg-white p-6 shadow-neo">
      <h2 className="mb-4 text-xl font-bold">訂單操作</h2>
      <div className="flex flex-wrap gap-4">{buttons}</div>
    </div>
  )
}
