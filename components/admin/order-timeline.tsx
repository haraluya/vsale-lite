'use client'

import { Clock, User } from 'lucide-react'
import type { OrderTimeline as OrderTimelineType } from '@/types'

/**
 * 訂單操作歷史時間軸元件
 * Feature: 004-cart-and-orders / US5
 *
 * - 顯示訂單的所有操作記錄
 * - 時間軸設計
 * - Neo-Brutalism 設計風格
 */

interface OrderTimelineProps {
  timelines: OrderTimelineType[]
}

const ACTION_TYPE_CONFIG: Record<
  string,
  {
    label: string
    emoji: string
    colorClass: string
  }
> = {
  created: {
    label: '建立訂單',
    emoji: '📝',
    colorClass: 'bg-green-200 border-green-600',
  },
  status_changed: {
    label: '狀態變更',
    emoji: '🔄',
    colorClass: 'bg-blue-200 border-blue-600',
  },
  cancelled: {
    label: '取消訂單',
    emoji: '❌',
    colorClass: 'bg-red-200 border-red-600',
  },
}

const STATUS_LABELS: Record<string, string> = {
  pending: '待確認',
  confirmed: '已確認',
  shipping: '出貨中',
  completed: '已完成',
  cancelled: '已取消',
}

export function OrderTimeline({ timelines }: OrderTimelineProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTimelineMessage = (timeline: OrderTimelineType) => {
    switch (timeline.action_type) {
      case 'created':
        return `${timeline.actor_name} 建立訂單`
      case 'status_changed':
        return `${timeline.actor_name} 將訂單狀態從「${STATUS_LABELS[timeline.old_status || '']}」改為「${STATUS_LABELS[timeline.new_status || '']}」`
      case 'cancelled':
        return `${timeline.actor_name} 取消訂單`
      default:
        return '未知操作'
    }
  }

  if (timelines.length === 0) {
    return (
      <div className="rounded-none border-2 border-black bg-gray-50 p-4 text-center text-gray-500">
        尚無操作記錄
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {timelines.map((timeline, index) => {
        const config = ACTION_TYPE_CONFIG[timeline.action_type] || {
          label: '其他操作',
          emoji: '📌',
          colorClass: 'bg-gray-200 border-gray-600',
        }

        return (
          <div key={timeline.id} className="flex gap-4">
            {/* 時間線 */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-none border-2 ${config.colorClass} text-lg`}
              >
                {config.emoji}
              </div>
              {index < timelines.length - 1 && <div className="h-full w-0.5 bg-black" />}
            </div>

            {/* 內容 */}
            <div className="flex-1 pb-6">
              <div className="rounded-none border-2 border-black bg-white p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="mb-2 flex items-start justify-between">
                  <div className="font-bold">{getTimelineMessage(timeline)}</div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    {formatDate(timeline.created_at)}
                  </div>
                </div>

                {timeline.notes && <div className="text-sm text-gray-600">{timeline.notes}</div>}

                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                  <User className="h-3 w-3" />
                  {timeline.actor_role === 'admin' ? '管理員' : '客戶'}: {timeline.actor_name}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
