'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelOrder } from '@/lib/actions/orders'
import { toast } from 'sonner'
import { Trash2, X } from 'lucide-react'
import type { OrderStatus } from '@/types'

/**
 * 取消訂單按鈕元件
 * Feature: 011-shipping-and-order-edit / US6
 *
 * - 允許管理員取消訂單（僅限 pending 或 shipping 狀態）
 * - 包含確認對話框
 * - Neo-Brutalism 設計風格
 */

interface OrderCancelButtonProps {
  orderId: string
  currentStatus: OrderStatus
  orderNumber: string
}

export function OrderCancelButton({ orderId, currentStatus, orderNumber }: OrderCancelButtonProps) {
  const router = useRouter()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  // 僅允許取消 pending 或 shipping 狀態的訂單
  const canCancel = currentStatus === 'pending' || currentStatus === 'shipping'

  if (!canCancel) {
    return null
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    startTransition(async () => {
      const result = await cancelOrder(orderId)

      if (result.success) {
        toast.success(result.message)
        setShowConfirmDialog(false)
        // ✅ 使用 window.location.reload() 強制重新載入頁面
        window.location.reload()
      } else {
        toast.error(result.message || '取消訂單失敗')
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setShowConfirmDialog(true)}
        className="rounded-theme-sm border-theme bg-red-400 px-6 py-3 font-bold shadow-neo-sm transition-transform hover:-translate-y-0.5 hover:shadow-theme-hover active:scale-[0.98]"
      >
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          <span>取消訂單</span>
        </div>
      </button>

      {/* 確認對話框 */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-foreground/50"
          onClick={(e) => {
            // 點擊背景關閉對話框
            if (e.target === e.currentTarget && !isPending) {
              setShowConfirmDialog(false)
            }
          }}
        >
          <div
            className="mx-4 max-w-md rounded-theme-sm border-theme bg-surface p-6 shadow-neo"
            onClick={(e) => {
              e.stopPropagation() // 防止事件冒泡到背景
            }}
          >
            <h3 className="mb-4 text-xl font-bold">確認取消訂單</h3>
            <p className="mb-6 text-text-secondary">
              您確定要取消訂單 <span className="font-mono font-bold">{orderNumber}</span> 嗎？
              {currentStatus === 'shipping' && (
                <span className="mt-2 block text-sm text-error">此訂單已出貨，取消後將回補庫存。</span>
              )}
            </p>

            <div className="flex gap-4">
              <button
                onClick={handleCancel}
                disabled={isPending}
                type="button"
                className="flex-1 rounded-theme-sm border-theme bg-red-400 px-4 py-2 font-bold shadow-neo-sm transition-transform hover:-translate-y-0.5 hover:shadow-theme-hover active:scale-[0.98] disabled:opacity-50"
              >
                {isPending ? '處理中...' : '確認取消'}
              </button>
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={isPending}
                type="button"
                className="flex-1 rounded-theme-sm border-theme bg-surface-secondary px-4 py-2 font-bold shadow-neo-sm transition-transform hover:-translate-y-0.5 hover:shadow-theme-hover active:scale-[0.98] disabled:opacity-50"
              >
                返回
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
