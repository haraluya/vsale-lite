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
        className="rounded-none border-2 md:border-3 border-black bg-red-400 px-6 py-3 font-bold shadow-neo-sm md:shadow-neo transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          <span>取消訂單</span>
        </div>
      </button>

      {/* 確認對話框 */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
          onClick={(e) => {
            // 點擊背景關閉對話框
            if (e.target === e.currentTarget && !isPending) {
              setShowConfirmDialog(false)
            }
          }}
        >
          <div
            className="mx-4 max-w-md rounded-none border-2 md:border-3 border-black bg-white p-6 shadow-neo"
            onClick={(e) => {
              e.stopPropagation() // 防止事件冒泡到背景
            }}
          >
            <h3 className="mb-4 text-xl font-bold">確認取消訂單</h3>
            <p className="mb-6 text-gray-700">
              您確定要取消訂單 <span className="font-mono font-bold">{orderNumber}</span> 嗎？
              {currentStatus === 'shipping' && (
                <span className="mt-2 block text-sm text-red-600">此訂單已出貨，取消後將回補庫存。</span>
              )}
            </p>

            <div className="flex gap-4">
              <button
                onClick={handleCancel}
                disabled={isPending}
                type="button"
                className="flex-1 rounded-none border-2 md:border-3 border-black bg-red-400 px-4 py-2 font-bold shadow-neo-sm md:shadow-neo transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
              >
                {isPending ? '處理中...' : '確認取消'}
              </button>
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={isPending}
                type="button"
                className="flex-1 rounded-none border-2 md:border-3 border-black bg-gray-200 px-4 py-2 font-bold shadow-neo-sm md:shadow-neo transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
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
