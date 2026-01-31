'use client'

import { Clock, User } from 'lucide-react'
import type { OrderTimelineWithActor as OrderTimelineType } from '@/types'
import { formatDateTW } from '@/lib/date-utils'

/**
 * 訂單操作歷史時間軸元件
 * Feature: 004-cart-and-orders / US5
 * Enhanced: 007-system-enhancement / US1 - 新增留言氣泡式顯示
 *
 * - 顯示訂單的所有操作記錄與留言
 * - 留言採用氣泡式設計（客戶左灰、管理員右藍）
 * - 操作歷史採用時間軸設計
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
  confirmed: {
    label: '確認訂單',
    emoji: '✅',
    colorClass: 'bg-blue-200 border-blue-600',
  },
  status_updated: {
    label: '狀態變更',
    emoji: '🔄',
    colorClass: 'bg-blue-200 border-blue-600',
  },
  cancelled: {
    label: '取消訂單',
    emoji: '❌',
    colorClass: 'bg-red-200 border-red-600',
  },
  comment: {
    label: '留言',
    emoji: '💬',
    colorClass: 'bg-yellow-200 border-yellow-600',
  },
  order_modified: {
    label: '訂單已修改',
    emoji: '✏️',
    colorClass: 'bg-purple-200 border-purple-600',
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

  const getTimelineMessage = (timeline: OrderTimelineType) => {
    switch (timeline.action_type) {
      case 'created':
        return `${timeline.actor_name} 建立訂單`
      case 'confirmed':
        return `${timeline.actor_name} 確認訂單`
      case 'status_updated':
        return `${timeline.actor_name} 將訂單狀態從「${STATUS_LABELS[timeline.old_status || '']}」改為「${STATUS_LABELS[timeline.new_status || '']}」`
      case 'cancelled':
        return `${timeline.actor_name} 取消訂單`
      case 'comment':
        return null // 留言不需要標題訊息，直接顯示內容
      case 'order_modified':
        return `${timeline.actor_name} 修改訂單內容`
      default:
        return '未知操作'
    }
  }

  // 格式化訂單修改內容（Feature 011）
  const formatModifications = (modifications: any) => {
    if (!modifications) return null

    const changes: string[] = []

    // 商品變更
    if (modifications.items && modifications.items.length > 0) {
      modifications.items.forEach((item: any) => {
        // 🆕 優先使用系列名稱，向後相容舊記錄
        const productDisplay = item.series_name
          ? `【${item.series_name}】${item.product_name}`
          : item.product_name

        switch (item.type) {
          case 'price_changed':
            changes.push(`• 商品「${productDisplay}」單價: ${item.old_price} → ${item.new_price}`)
            break
          case 'quantity_changed':
            changes.push(`• 商品「${productDisplay}」數量: ${item.old_quantity} → ${item.new_quantity}`)
            break
          case 'removed':
            changes.push(`• 移除商品「${productDisplay}」`)
            break
          case 'added':
            changes.push(`• 新增商品「${productDisplay}」(單價 ${item.new_price}, 數量 ${item.new_quantity})`)
            break
        }
      })
    }

    // 運費變更
    if (modifications.shipping) {
      changes.push(`• 運費: ${modifications.shipping.old_fee} → ${modifications.shipping.new_fee}`)
    }

    // 自訂費用變更
    if (modifications.fees && modifications.fees.length > 0) {
      modifications.fees.forEach((fee: any) => {
        if (fee.type === 'added') {
          changes.push(`• 新增費用「${fee.fee_name}」: ${fee.amount}`)
        } else if (fee.type === 'removed') {
          changes.push(`• 移除費用「${fee.fee_name}」`)
        }
      })
    }

    // 優惠券變更
    if (modifications.coupon) {
      if (modifications.coupon.action === 'removed') {
        changes.push(`• 移除優惠券「${modifications.coupon.coupon_code}」`)
      }
    }

    return changes.length > 0 ? changes.join('\n') : null
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
        const isComment = timeline.action_type === 'comment'
        const isAdminComment = isComment && timeline.actor_role === 'admin'
        const config = ACTION_TYPE_CONFIG[timeline.action_type] || {
          label: '其他操作',
          emoji: '📌',
          colorClass: 'bg-gray-200 border-gray-600',
        }

        // 留言採用氣泡式設計
        if (isComment) {
          return (
            <div
              key={timeline.id}
              className={`flex ${isAdminComment ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-md ${isAdminComment ? 'ml-auto' : 'mr-auto'}`}>
                {/* 氣泡式留言框 */}
                <div
                  className={`rounded-none border-2 md:border-3 border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                             ${isAdminComment ? 'bg-blue-100' : 'bg-gray-100'}`}
                >
                  {/* 留言內容 */}
                  <div className="mb-3 whitespace-pre-wrap break-words text-sm">
                    {timeline.content}
                  </div>

                  {/* 操作者與時間 */}
                  <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span className="font-semibold">
                        {timeline.actor_role === 'admin' ? '管理員' : '客戶'}: {timeline.actor_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDateTW(timeline.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        // 操作歷史採用時間軸設計
        return (
          <div key={timeline.id} className="flex gap-4">
            {/* 時間線 */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none border-2 ${config.colorClass} text-lg`}
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
                    {formatDateTW(timeline.created_at)}
                  </div>
                </div>

                {timeline.content && <div className="text-sm text-gray-600">{timeline.content}</div>}

                {/* 訂單修改詳細內容 (Feature 011) */}
                {timeline.action_type === 'order_modified' && timeline.modifications && (
                  <div className="mt-3 rounded-none border-2 border-purple-300 bg-purple-50 p-3">
                    <div className="mb-1 text-xs font-bold text-purple-700">修改明細：</div>
                    <div className="whitespace-pre-line text-sm text-gray-700">
                      {formatModifications(timeline.modifications)}
                    </div>
                  </div>
                )}

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
