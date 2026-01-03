'use client'

import { useState, useEffect } from 'react'
import { getOrderTimeline, addOrderComment } from '@/lib/actions/orders'
import { OrderTimeline } from '@/components/admin/order-timeline'
import { CommentInput } from '@/components/orders/CommentInput'
import type { OrderTimelineWithActor } from '@/types'
import { toast } from 'sonner'

/**
 * 訂單留言區塊（後台專用）
 * Feature: 007-system-enhancement / User Story 1
 *
 * - 顯示時間軸與留言
 * - 管理員留言輸入
 */

interface OrderCommentSectionProps {
  orderId: string
  initialTimelines: OrderTimelineWithActor[]
}

export function OrderCommentSection({ orderId, initialTimelines }: OrderCommentSectionProps) {
  const [timelines, setTimelines] = useState<OrderTimelineWithActor[]>(initialTimelines)

  // 載入最新時間軸
  const refreshTimelines = async () => {
    const result = await getOrderTimeline(orderId)
    if (result.success && result.data) {
      setTimelines(result.data)
    }
  }

  // 提交留言
  const handleSubmitComment = async (content: string) => {
    const result = await addOrderComment({ orderId, content })

    if (result.success) {
      toast.success('留言已送出')
      await refreshTimelines()
    } else {
      toast.error(result.message || '送出留言失敗')
      throw new Error(result.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* 時間軸與留言顯示 */}
      <OrderTimeline timelines={timelines} />

      {/* 管理員留言輸入 */}
      <div className="rounded-none border-2 border-gray-300 bg-gray-50 p-4">
        <h3 className="mb-3 text-sm font-bold text-gray-700">管理員留言</h3>
        <CommentInput
          onSubmit={handleSubmitComment}
          placeholder="回覆客戶訊息..."
        />
      </div>
    </div>
  )
}
