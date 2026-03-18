/**
 * Customer Order Detail Content (Client Component)
 * Feature: 004-cart-and-orders (US2, US4)
 * Feature: 021-combo-deals (Phase 7 - T066)
 *
 * 客戶訂單詳情頁面內容
 * - 顯示訂單完整資訊
 * - 顯示訂單明細與總金額
 * - 顯示組合優惠項目（黃色背景標示）
 * - RLS 自動確保客戶只能看到自己的訂單
 */

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getOrderById, addOrderComment, getOrderTimeline } from '@/lib/actions/orders'
import { OrderStatusBadge } from '@/components/shop/order-status-badge'
import { OrderTimeline } from '@/components/admin/order-timeline'
import { CommentInput } from '@/components/orders/CommentInput'
import type { OrderDetail, OrderTimelineWithActor } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { formatDateTW } from '@/lib/date-utils'
import Link from 'next/link'
import { toast } from 'sonner'
import { designTokens } from '@/lib/design-tokens'
import { Package } from 'lucide-react'  // 🆕 Feature 021
import { SplitPanelLayout } from '@/components/shop/order-detail-layouts/SplitPanelLayout' // 🆕 使用分屏式佈局
import { CustomerOrderCancelButton } from '@/components/shop/customer-order-cancel-button' // 🆕 客戶取消訂單按鈕

interface Props {
  orderId: string
}

export function CustomerOrderDetailContent({ orderId }: Props) {
  const searchParams = useSearchParams()
  const isSuccess = searchParams.get('success') === 'true'

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [timelines, setTimelines] = useState<OrderTimelineWithActor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 載入訂單與時間軸
  useEffect(() => {
    async function loadOrder() {
      setIsLoading(true)
      setError(null)

      const result = await getOrderById(orderId)

      if (result.success && result.data) {
        setOrder(result.data)

        // 載入時間軸（含留言）
        const timelineResult = await getOrderTimeline(orderId)
        if (timelineResult.success && timelineResult.data) {
          setTimelines(timelineResult.data)
        }
      } else {
        setError(result.message || '載入訂單詳情時發生錯誤')
      }

      setIsLoading(false)
    }

    loadOrder()
  }, [orderId])

  // 提交留言
  const handleSubmitComment = async (content: string) => {
    const result = await addOrderComment({ orderId, content })

    if (result.success) {
      toast.success('留言已送出')

      // 重新載入時間軸
      const timelineResult = await getOrderTimeline(orderId)
      if (timelineResult.success && timelineResult.data) {
        setTimelines(timelineResult.data)
      }
    } else {
      toast.error(result.message || '送出留言失敗')
    }
  }

  // 載入中狀態
  if (isLoading) {
    return (
      <div className={cn(
        "min-h-screen bg-surface-secondary",
        designTokens.spacing.page.padding
      )}>
        <div className={designTokens.container.default}>
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mb-4 text-6xl">⏳</div>
              <p className={designTokens.typography.h3}>載入訂單詳情...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error || !order) {
    return (
      <div className={cn(
        "min-h-screen bg-surface-secondary",
        designTokens.spacing.page.padding
      )}>
        <div className={designTokens.container.default}>
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-6 text-6xl md:text-8xl">❌</div>
            <h2 className={cn(
              designTokens.typography.h2,
              "mb-4"
            )}>無法載入訂單</h2>
            <p className={cn(
              designTokens.typography.body.large,
              "mb-8 text-text-secondary"
            )}>{error}</p>
            <Link
              href="/store/orders"
              className={cn(
                "rounded-theme-sm bg-green-400 font-bold transition-all",
                designTokens.cleanCommerce.border.full,
                "border-border",
                designTokens.cleanCommerce.shadow.full,
                designTokens.cleanCommerce.hover,
                "px-6 py-3 md:px-8 md:py-4",
                designTokens.typography.body.large
              )}
            >
              返回訂單列表
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "min-h-screen bg-surface-secondary",
      designTokens.spacing.page.padding
    )}>
      <div className={cn(
        designTokens.container.default,
        designTokens.spacing.page.gap
      )}>
        {/* 成功訊息 */}
        {isSuccess && (
          <div className={cn(
            "rounded-theme-sm bg-green-100 text-center",
            designTokens.cleanCommerce.border.full,
            "border-green-600",
            designTokens.spacing.card.padding,
            designTokens.spacing.section.marginBottom
          )}>
            <div className="mb-2 text-4xl md:text-6xl">🎉</div>
            <h2 className={cn(
              designTokens.typography.h2,
              "mb-2 text-green-900"
            )}>訂單建立成功!</h2>
            <p className={cn(
              designTokens.typography.body.base,
              "text-green-800"
            )}>我們將盡快為您處理訂單</p>
          </div>
        )}

        {/* 返回按鈕與操作區 */}
        <div className={cn(
          "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
          designTokens.spacing.section.marginBottom
        )}>
          <Link
            href="/store/orders"
            className={cn(
              "inline-flex items-center font-bold hover:underline",
              designTokens.typography.body.large
            )}
          >
            ← 返回訂單列表
          </Link>

          {/* 取消訂單按鈕（僅 pending 狀態顯示） */}
          <CustomerOrderCancelButton
            orderId={order.id}
            currentStatus={order.status}
            orderNumber={order.order_number}
          />
        </div>

        {/* 使用分屏式佈局 */}
        <SplitPanelLayout order={order} />

        {/* 訂單狀態說明 */}
        <div className={cn(
          "rounded-theme-sm bg-surface-secondary",
          "border border-border",
          "p-3 md:p-4"
        )}>
          <h3 className={cn(
            designTokens.typography.body.large,
            "font-bold mb-2"
          )}>訂單狀態說明</h3>
          <ul className={cn(
            "space-y-1",
            designTokens.typography.caption,
            "text-text-secondary"
          )}>
            <li>⏳ <strong>待確認</strong>: 訂單已送出,等待管理員確認</li>
            <li>✅ <strong>已確認</strong>: 訂單已確認,準備出貨</li>
            <li>🚚 <strong>出貨中</strong>: 訂單已出貨,運送中</li>
            <li>🎉 <strong>已完成</strong>: 訂單已完成</li>
            <li>❌ <strong>已取消</strong>: 訂單已取消</li>
          </ul>
        </div>

        {/* 訂單留言與操作歷史 */}
        <div className={cn(
          "rounded-theme-sm bg-surface",
          designTokens.cleanCommerce.border.full,
          "border-border",
          designTokens.cleanCommerce.shadow.full,
          designTokens.spacing.card.padding
        )}>
          <h2 className={cn(
            designTokens.typography.h2,
            "mb-4 md:mb-6"
          )}>訂單溝通</h2>

          {/* 時間軸與留言顯示 */}
          <div className="mb-4 md:mb-6">
            <OrderTimeline timelines={timelines} />
          </div>

          {/* 留言輸入框 */}
          {order.status !== 'cancelled' && order.status !== 'completed' && (
            <div className={cn(
              "mt-4 md:mt-6 rounded-theme-sm bg-surface-secondary",
              "border border-border",
              "p-3 md:p-4"
            )}>
              <h3 className={cn(
                designTokens.typography.caption,
                "font-bold mb-3 text-foreground"
              )}>新增留言</h3>
              <CommentInput
                onSubmit={handleSubmitComment}
                placeholder="與管理員溝通訂單相關問題..."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
