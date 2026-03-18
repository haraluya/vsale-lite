'use client'

import { useTransition } from 'react'
import { cancelOrder } from '@/lib/actions/orders'
import { useConfirm } from '@/lib/contexts/dialog-context'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import type { OrderStatus } from '@/types'

/**
 * 客戶取消訂單按鈕元件
 *
 * 功能：
 * - 允許客戶取消自己的 pending 狀態訂單
 * - 使用統一對話框系統進行確認
 * - Neo-Brutalism 設計風格
 *
 * 限制：
 * - 僅 pending 狀態顯示（客戶不能取消已出貨訂單）
 * - 自動呼叫 cancelOrder Server Action
 */

interface CustomerOrderCancelButtonProps {
  orderId: string
  currentStatus: OrderStatus
  orderNumber: string
}

export function CustomerOrderCancelButton({
  orderId,
  currentStatus,
  orderNumber,
}: CustomerOrderCancelButtonProps) {
  const confirm = useConfirm()
  const [isPending, startTransition] = useTransition()

  // 客戶僅能取消 pending 狀態的訂單
  const canCancel = currentStatus === 'pending'

  if (!canCancel) {
    return null
  }

  const handleCancel = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // 使用統一對話框系統確認
    const confirmed = await confirm({
      title: '確認取消訂單',
      description: `您確定要取消訂單 ${orderNumber} 嗎？此操作無法復原。`,
      variant: 'danger',
    })

    if (!confirmed) {
      return
    }

    // 執行取消操作
    startTransition(async () => {
      const result = await cancelOrder(orderId)

      if (result.success) {
        toast.success(result.message || '訂單已成功取消')
        // 重新載入頁面以更新訂單狀態
        window.location.reload()
      } else {
        toast.error(result.message || '取消訂單失敗')
      }
    })
  }

  return (
    <button
      onClick={handleCancel}
      disabled={isPending}
      type="button"
      className="rounded-theme-sm border-theme bg-red-400 px-6 py-3 font-bold shadow-neo-sm transition-transform hover:-translate-y-0.5 hover:shadow-theme-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex items-center gap-2">
        <X className="h-5 w-5" />
        <span>{isPending ? '處理中...' : '取消訂單'}</span>
      </div>
    </button>
  )
}
