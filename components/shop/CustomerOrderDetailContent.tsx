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
        "min-h-screen bg-gray-50",
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
        "min-h-screen bg-gray-50",
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
              "mb-8 text-gray-600"
            )}>{error}</p>
            <Link
              href="/store/orders"
              className={cn(
                "rounded-none bg-green-400 font-bold transition-all",
                designTokens.neoBrutalism.border.full,
                "border-black",
                designTokens.neoBrutalism.shadow.full,
                designTokens.neoBrutalism.hover,
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
      "min-h-screen bg-gray-50",
      designTokens.spacing.page.padding
    )}>
      <div className={cn(
        designTokens.container.default,
        designTokens.spacing.page.gap
      )}>
        {/* 成功訊息 */}
        {isSuccess && (
          <div className={cn(
            "rounded-none bg-green-100 text-center",
            designTokens.neoBrutalism.border.full,
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

        {/* 返回按鈕 */}
        <div className={designTokens.spacing.section.marginBottom}>
          <Link
            href="/store/orders"
            className={cn(
              "inline-flex items-center font-bold hover:underline",
              designTokens.typography.body.large
            )}
          >
            ← 返回訂單列表
          </Link>
        </div>

        {/* 訂單標題 */}
        <div className={cn(
          "flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4",
          designTokens.spacing.section.marginBottom
        )}>
          <div>
            <h1 className={designTokens.typography.h1}>{order.order_number}</h1>
            <p className={cn(
              designTokens.typography.body.base,
              "mt-2 text-gray-600"
            )}>{formatDateTW(order.created_at)}</p>
          </div>
          <OrderStatusBadge status={order.status} size="lg" />
        </div>

        {/* 訂單內容 */}
        <div className={designTokens.spacing.page.gap}>
          {/* 商品明細 */}
          <div className={cn(
            "rounded-none bg-white",
            designTokens.neoBrutalism.border.full,
            "border-black",
            designTokens.neoBrutalism.shadow.full,
            designTokens.spacing.card.padding
          )}>
            <h2 className={cn(
              designTokens.typography.h2,
              "mb-4"
            )}>訂單商品</h2>
            <div className={designTokens.spacing.card.gap}>
              {/* 🆕 Feature 021: 組合優惠項目 */}
              {order.combo_deal_items && order.combo_deal_items.length > 0 && (
                <>
                  {order.combo_deal_items.map((comboDealItem) => {
                    const snapshot = comboDealItem.combo_deal_snapshot
                    return (
                      <div
                        key={comboDealItem.id}
                        className="rounded-none bg-yellow-50 border-2 border-yellow-400 p-3 md:p-4 mb-3 md:mb-4 last:mb-0"
                      >
                        {/* 組合優惠標題 */}
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-5 h-5 text-yellow-700 flex-shrink-0" />
                          <h3 className={cn(
                            designTokens.typography.body.large,
                            "font-bold text-yellow-900"
                          )}>
                            📦 {snapshot.combo_deal_name}
                          </h3>
                        </div>

                        {/* 商品清單 */}
                        <div className="space-y-1 mb-2 ml-7">
                          {snapshot.selected_products.map((product, idx) => (
                            <div key={idx} className={cn(
                              designTokens.typography.caption,
                              "text-gray-700"
                            )}>
                              • {product.product_name} × {product.quantity} ({formatCurrency(product.unit_price)})
                            </div>
                          ))}
                        </div>

                        {/* 價格資訊 */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ml-7">
                          <div className={cn(
                            designTokens.typography.caption,
                            "text-gray-600"
                          )}>
                            原價: <span className="line-through">{formatCurrency(comboDealItem.original_price)}</span>
                            {' '}→ 折扣 {formatCurrency(comboDealItem.discount_amount)}
                          </div>
                          <div className="text-left sm:text-right">
                            <p className={cn(
                              "text-lg md:text-xl font-bold text-green-600"
                            )}>
                              {formatCurrency(comboDealItem.discounted_price)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}

              {/* 一般商品項目 */}
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 border-b-2 border-gray-200 pb-3 md:pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex-1">
                    <h3 className={cn(
                      designTokens.typography.body.large,
                      "font-bold"
                    )}>{item.product_name_snapshot}</h3>
                    <p className={cn(
                      designTokens.typography.caption,
                      "text-gray-600"
                    )}>
                      單價: {formatCurrency(item.deal_price)} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className={cn(
                      "text-lg md:text-xl font-bold text-green-600"
                    )}>
                      {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 總計、運費、自訂費用與優惠券 */}
            <div className={cn(
              "mt-4 md:mt-6 pt-3 md:pt-4",
              designTokens.neoBrutalism.border.mobile,
              "md:border-t-3",
              "border-t-black"
            )}>
              {/* 運費 */}
              {order.shipping_fee !== undefined && order.shipping_fee !== null && (
                <div className="mb-3 flex items-center justify-between">
                  <p className={cn(
                    designTokens.typography.body.base,
                    "font-bold flex items-center gap-2"
                  )}>
                    <span>🚚</span>
                    <span>運費</span>
                  </p>
                  <p className={cn(
                    designTokens.typography.body.large,
                    "font-bold",
                    order.shipping_fee === 0 ? 'text-green-600' : ''
                  )}>
                    {order.shipping_fee === 0 ? '免運' : `+ ${formatCurrency(order.shipping_fee)}`}
                  </p>
                </div>
              )}

              {/* 自訂費用 */}
              {order.custom_fees && order.custom_fees.length > 0 && (
                <div className="mb-3 space-y-2">
                  {order.custom_fees.map((fee) => (
                    <div key={fee.id} className="flex items-center justify-between">
                      <p className={cn(
                        designTokens.typography.body.base,
                        "font-bold flex items-center gap-2"
                      )}>
                        <span>💵</span>
                        <span>{fee.fee_name}</span>
                      </p>
                      <p className={cn(
                        designTokens.typography.body.large,
                        "font-bold",
                        fee.amount < 0 ? 'text-red-600' : ''
                      )}>
                        {fee.amount >= 0 ? '+' : ''} {formatCurrency(fee.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* 優惠券折扣 */}
              {order.coupon && (
                <div className="mb-3 space-y-2">
                  <div className="flex items-center justify-between text-orange-600">
                    <p className={cn(
                      designTokens.typography.body.base,
                      "font-bold flex items-center gap-2"
                    )}>
                      <span>🎫</span>
                      <span>優惠券折扣 ({order.coupon.coupon_code})</span>
                    </p>
                    <p className={cn(
                      designTokens.typography.body.large,
                      "font-bold"
                    )}>
                      - {formatCurrency(order.coupon.discount_amount)}
                    </p>
                  </div>
                  <p className={cn(
                    designTokens.typography.caption,
                    "text-gray-500 pl-8"
                  )}>
                    {order.coupon.discount_type === 'fixed'
                      ? `現金折扣 NT$ ${order.coupon.discount_value}`
                      : `百分比折扣 ${order.coupon.discount_value}%`}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className={cn(
                  designTokens.typography.h3
                )}>訂單總金額</p>
                <p className={cn(
                  "text-2xl md:text-3xl font-bold text-green-600"
                )}>
                  {formatCurrency(order.total_amount)}
                </p>
              </div>
            </div>
          </div>

          {/* 訂單備註 */}
          {order.notes && (
            <div className={cn(
              "rounded-none bg-white",
              designTokens.neoBrutalism.border.full,
              "border-black",
              designTokens.neoBrutalism.shadow.full,
              designTokens.spacing.card.padding
            )}>
              <h2 className={cn(
                designTokens.typography.h2,
                "mb-4"
              )}>訂單備註</h2>
              <p className={cn(
                designTokens.typography.body.base,
                "text-gray-800"
              )}>{order.notes}</p>
            </div>
          )}

          {/* 訂單資訊 */}
          <div className={cn(
            "rounded-none bg-white",
            designTokens.neoBrutalism.border.full,
            "border-black",
            designTokens.neoBrutalism.shadow.full,
            designTokens.spacing.card.padding
          )}>
            <h2 className={cn(
              designTokens.typography.h2,
              "mb-4"
            )}>訂單資訊</h2>
            <dl className={cn(
              designTokens.spacing.card.gap,
              designTokens.typography.body.base
            )}>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <dt className="font-bold">訂單編號:</dt>
                <dd className="text-gray-800">{order.order_number}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <dt className="font-bold">訂單狀態:</dt>
                <dd>
                  <OrderStatusBadge status={order.status} size="sm" />
                </dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <dt className="font-bold">建立時間:</dt>
                <dd className="text-gray-800">{formatDateTW(order.created_at)}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <dt className="font-bold">商品數量:</dt>
                <dd className="text-gray-800">
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)} 件
                </dd>
              </div>
              {/* 送貨地址 */}
              {order.user.address && (
                <div className="flex flex-col border-t-2 border-gray-200 pt-3 mt-3 gap-1">
                  <dt className="font-bold">送貨地址:</dt>
                  <dd className="text-gray-800">{order.user.address}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* 狀態說明 */}
          <div className={cn(
            "rounded-none bg-gray-50",
            "border-2 border-gray-300",
            "p-3 md:p-4"
          )}>
            <h3 className={cn(
              designTokens.typography.body.large,
              "font-bold mb-2"
            )}>訂單狀態說明</h3>
            <ul className={cn(
              "space-y-1",
              designTokens.typography.caption,
              "text-gray-600"
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
            "rounded-none bg-white",
            designTokens.neoBrutalism.border.full,
            "border-black",
            designTokens.neoBrutalism.shadow.full,
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
                "mt-4 md:mt-6 rounded-none bg-gray-50",
                "border-2 border-gray-300",
                "p-3 md:p-4"
              )}>
                <h3 className={cn(
                  designTokens.typography.caption,
                  "font-bold mb-3 text-gray-700"
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
    </div>
  )
}
