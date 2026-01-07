'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteOrder } from '@/lib/actions/orders'
import { toast } from 'sonner'
import { Trash2, AlertTriangle } from 'lucide-react'
import type { OrderStatus } from '@/types'

/**
 * 訂單刪除按鈕元件
 * Feature: 006-ux-enhancement / US8
 *
 * - 僅 pending 狀態訂單可刪除
 * - 顯示確認對話框
 * - 刪除成功後導向訂單列表
 * - Neo-Brutalism 設計風格
 */

interface OrderDeleteButtonProps {
  orderId: string
  orderNumber: string
  currentStatus: OrderStatus
}

export function OrderDeleteButton({
  orderId,
  orderNumber,
  currentStatus,
}: OrderDeleteButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showDialog, setShowDialog] = useState(false)

  // 僅 pending 狀態可刪除
  if (currentStatus !== 'pending') {
    return null
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDialog(false)

    startTransition(async () => {
      console.log('🔵 開始刪除訂單:', { orderId, currentStatus })
      const result = await deleteOrder({ order_id: orderId, reason: '管理員刪除訂單' })
      console.log('🟢 刪除訂單結果:', result)

      if (result.success) {
        toast.success(result.message || '訂單已成功刪除')
        // 🔧 修復：立即導向，避免頁面重新渲染觸發 404
        // 使用 router.push 而非 window.location.href，保持 SPA 體驗
        router.push('/admin/orders')
      } else {
        // 🔧 修復：刪除失敗時不要跳轉，顯示錯誤訊息
        toast.error(result.message || '訂單刪除失敗')
        console.error('刪除訂單失敗:', result)
        // 重新開啟對話框，讓使用者可以再試一次
        setShowDialog(true)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        disabled={isPending}
        className="rounded-none border-3 border-black bg-red-400 px-6 py-3 font-bold shadow-neo transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-neo"
      >
        <span className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          {isPending ? '刪除中...' : '刪除訂單'}
        </span>
      </button>

      {/* 刪除確認對話框 */}
      {showDialog && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            // 點擊背景關閉對話框
            if (e.target === e.currentTarget && !isPending) {
              setShowDialog(false)
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-none border-3 border-black bg-white p-6 shadow-neo"
            onClick={(e) => {
              e.stopPropagation() // 防止事件冒泡到背景
            }}
          >
            <div className="mb-4 flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 flex-shrink-0 text-red-600" />
              <div>
                <h3 className="mb-2 text-xl font-bold">確認刪除訂單</h3>
                <p className="mb-2 text-gray-700">
                  您確定要刪除訂單 <span className="font-mono font-bold">{orderNumber}</span> 嗎?
                </p>
                <p className="text-sm text-red-600">此操作無法撤銷，訂單資料將永久刪除。</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDialog(false)}
                disabled={isPending}
                type="button"
                className="flex-1 rounded-none border-3 border-black bg-gray-200 px-4 py-3 font-bold shadow-neo transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
              >
                返回
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                type="button"
                className="flex-1 rounded-none border-3 border-black bg-red-400 px-4 py-3 font-bold shadow-neo transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
              >
                {isPending ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
