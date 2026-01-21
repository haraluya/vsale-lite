'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { OrderStatusBadge } from '@/components/shop/order-status-badge'
import { OrderActions } from '@/components/admin/order-actions'
import { OrderCommentSection } from '@/components/admin/order-comment-section'
import { OrderEditor } from './order-editor'
import { ClientQuickViewDialog } from '@/components/admin/client-quick-view-dialog'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Phone, Award, Calendar, FileText, Edit } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designTokens, getPageContainerClasses, getNeoBrutalismClasses } from '@/lib/design-tokens'
import type { OrderDetail, OrderTimelineWithActor } from '@/types'
import { useConfirm } from '@/lib/contexts/dialog-context'

interface OrderDetailContentProps {
  order: OrderDetail
  timelines: OrderTimelineWithActor[]
}

export function OrderDetailContent({ order, timelines }: OrderDetailContentProps) {
  const router = useRouter()
  const confirm = useConfirm()
  const [isPending, startTransition] = useTransition()
  const [editMode, setEditMode] = useState(false)
  const [showClientDialog, setShowClientDialog] = useState(false)

  // 檢查訂單是否可編輯（僅 pending 狀態）
  const canEdit = order.status === 'pending'

  // 格式化金額
  const formatAmount = (amount: number) => {
    return `NT$ ${amount.toLocaleString()}`
  }

  // 格式化日期
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

  // 儲存編輯後重新載入
  const handleSave = () => {
    setEditMode(false)
    startTransition(() => {
      router.refresh()
    })
  }

  // 取消編輯
  const handleCancel = async () => {
    const confirmed = await confirm({
      title: '取消編輯',
      description: '確定要取消編輯嗎？所有未儲存的變更將遺失。',
      variant: 'danger'
    })

    if (confirmed) {
      setEditMode(false)
    }
  }

  return (
    <div className={getPageContainerClasses('default')}>
      {/* 返回按鈕 */}
      <Link
        href="/admin/orders"
        className={cn(
          'inline-flex items-center gap-2 rounded-none bg-white font-bold transition-transform',
          getNeoBrutalismClasses({ hover: true }),
          designTokens.button.md
        )}
      >
        <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
        <span>返回訂單列表</span>
      </Link>

      {editMode ? (
        /* 編輯模式 */
        <>
          <div className={cn('rounded-none bg-white', getNeoBrutalismClasses(), designTokens.spacing.card.padding)}>
            <div className="mb-4">
              <h1 className={cn(designTokens.typography.h1, 'mb-2 font-mono')}>{order.order_number}</h1>
              <OrderStatusBadge status={order.status} size="lg" />
            </div>
          </div>

          <OrderEditor order={order} onSave={handleSave} onCancel={handleCancel} />
        </>
      ) : (
        /* 檢視模式 */
        <>
          {/* 訂單標題 */}
          <div className={cn('rounded-none bg-white', getNeoBrutalismClasses(), designTokens.spacing.card.padding)}>
            <div className="mb-4 flex flex-col justify-between gap-3 md:gap-4 md:flex-row md:items-center">
              <div>
                <h1 className={cn(designTokens.typography.h1, 'mb-2 font-mono')}>{order.order_number}</h1>
                <OrderStatusBadge status={order.status} size="lg" />
              </div>
              <div className="flex items-center gap-3">
                {canEdit && (
                  <Button
                    onClick={() => setEditMode(true)}
                    className={cn(
                      'bg-blue-600 hover:bg-blue-700 text-white font-bold',
                      'border-2 md:border-3 border-black shadow-neo-sm md:shadow-neo',
                      'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
                      designTokens.button.md
                    )}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    編輯訂單
                  </Button>
                )}
                <div className={cn(designTokens.typography.caption, 'text-gray-600')}>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    建立時間：{formatDate(order.created_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* 客戶資訊 - 響應式單欄/三欄布局 */}
            <div className="grid gap-3 md:gap-4 border-t-2 border-black pt-4 grid-cols-1 md:grid-cols-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
                <div>
                  <div className={cn(designTokens.typography.caption, 'text-gray-600 flex items-center gap-1')}>
                    客戶姓名
                    <span className="text-xs text-blue-600">(點擊編輯資料)</span>
                  </div>
                  <button
                    onClick={() => setShowClientDialog(true)}
                    className={cn(
                      designTokens.typography.body.base,
                      'font-bold text-blue-600 hover:text-blue-800 hover:underline',
                      'transition-colors cursor-pointer text-left',
                      'flex items-center gap-1 group'
                    )}
                    title="點擊編輯客戶資料（地址、備註）"
                  >
                    {order.user.name}
                    <Edit className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
                <div>
                  <div className={cn(designTokens.typography.caption, 'text-gray-600')}>手機號碼</div>
                  <div className={cn(designTokens.typography.body.base, 'font-bold')}>{order.user.phone}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
                <div>
                  <div className={cn(designTokens.typography.caption, 'text-gray-600')}>會員等級</div>
                  <div className={cn(designTokens.typography.body.base, 'font-bold')}>{order.user.tier_name}</div>
                </div>
              </div>
            </div>

            {/* 客戶地址與備註 (Feature 007 - US2) */}
            {(order.user.address || order.user.admin_notes) && (
              <div
                className={cn(
                  'mt-3 md:mt-4 border-t-2 border-black pt-3 md:pt-4',
                  designTokens.spacing.card.gap
                )}
              >
                {order.user.address && (
                  <div>
                    <div className={cn(designTokens.typography.caption, 'font-bold text-gray-700')}>客戶地址</div>
                    <div className={cn(designTokens.typography.body.base, 'mt-1 text-gray-900')}>
                      {order.user.address}
                    </div>
                  </div>
                )}
                {order.user.admin_notes && (
                  <div>
                    <div className={cn(designTokens.typography.caption, 'font-bold text-yellow-700')}>
                      管理員備註
                    </div>
                    <div
                      className={cn(
                        'mt-1 rounded-none border-2 border-yellow-500 bg-yellow-50 p-2 md:p-3 text-yellow-900',
                        designTokens.typography.body.base
                      )}
                    >
                      {order.user.admin_notes}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 備註 */}
            {order.notes && (
              <div className="mt-3 md:mt-4 border-t-2 border-black pt-3 md:pt-4">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
                  <div>
                    <div className={cn(designTokens.typography.caption, 'text-gray-600')}>客戶備註</div>
                    <div className={cn(designTokens.typography.body.base, 'font-medium')}>{order.notes}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 訂單明細 */}
          <div className={cn('rounded-none bg-white', getNeoBrutalismClasses())}>
            <h2
              className={cn(
                designTokens.typography.h2,
                'border-b-2 md:border-b-3 border-black bg-gray-100 p-3 md:p-4'
              )}
            >
              訂單明細
            </h2>
            <div className="divide-y-2 divide-black">
              {order.items.map(item => (
                <div key={item.id} className="grid grid-cols-12 gap-2 md:gap-4 p-3 md:p-4">
                  <div className={cn('col-span-12 md:col-span-6 font-bold', designTokens.typography.body.base)}>
                    {item.product_name_snapshot}
                  </div>
                  <div
                    className={cn(
                      'col-span-4 md:col-span-2 text-left md:text-right',
                      designTokens.typography.body.base
                    )}
                  >
                    {formatAmount(item.deal_price)}
                  </div>
                  <div className={cn('col-span-4 md:col-span-2 text-center', designTokens.typography.body.base)}>
                    × {item.quantity}
                  </div>
                  <div
                    className={cn(
                      'col-span-4 md:col-span-2 text-right font-bold',
                      designTokens.typography.body.base
                    )}
                  >
                    {formatAmount(item.subtotal)}
                  </div>
                </div>
              ))}

              {/* 運費 (Feature 011) */}
              {order.shipping_fee && order.shipping_fee > 0 && (
                <div className="grid grid-cols-12 gap-2 md:gap-4 bg-blue-50 p-3 md:p-4">
                  <div className={cn('col-span-6 md:col-span-8 text-right font-bold', designTokens.typography.body.base)}>
                    🚚 運費
                  </div>
                  <div
                    className={cn(
                      'col-span-6 md:col-span-4 text-right font-bold',
                      designTokens.typography.body.large
                    )}
                  >
                    + {formatAmount(order.shipping_fee)}
                  </div>
                </div>
              )}

              {/* 自訂費用 (Feature 011) */}
              {order.custom_fees && order.custom_fees.length > 0 && (
                <>
                  {order.custom_fees.map((fee) => (
                    <div key={fee.id} className="grid grid-cols-12 gap-2 md:gap-4 bg-purple-50 p-3 md:p-4">
                      <div className={cn('col-span-6 md:col-span-8 text-right font-bold', designTokens.typography.body.base)}>
                        💵 {fee.fee_name}
                      </div>
                      <div
                        className={cn(
                          'col-span-6 md:col-span-4 text-right font-bold',
                          designTokens.typography.body.large,
                          fee.amount >= 0 ? '' : 'text-red-600'
                        )}
                      >
                        {fee.amount >= 0 ? '+' : ''} {formatAmount(fee.amount)}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* 優惠券折扣 (Feature 009) */}
              {order.coupon && (
                <div className="grid grid-cols-12 gap-2 md:gap-4 bg-orange-50 border-t-2 border-black p-3 md:p-4">
                  <div className={cn('col-span-12 md:col-span-6 font-bold text-orange-700', designTokens.typography.body.base)}>
                    🎫 優惠券折扣 ({order.coupon.coupon_code})
                  </div>
                  <div
                    className={cn(
                      'col-span-12 md:col-span-6 text-left md:text-right text-orange-700',
                      designTokens.typography.caption
                    )}
                  >
                    {order.coupon.discount_type === 'fixed'
                      ? `現金折扣 NT$ ${order.coupon.discount_value}`
                      : `百分比折扣 ${order.coupon.discount_value}%`}
                  </div>
                  <div
                    className={cn(
                      'col-span-6 md:col-span-8 text-right font-bold text-orange-700',
                      designTokens.typography.body.base
                    )}
                  >
                    折扣金額
                  </div>
                  <div
                    className={cn(
                      'col-span-6 md:col-span-4 text-right font-bold text-orange-700',
                      designTokens.typography.body.large
                    )}
                  >
                    - {formatAmount(order.coupon.discount_amount)}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-12 gap-2 md:gap-4 bg-yellow-100 p-3 md:p-4">
                <div className={cn('col-span-6 md:col-span-8 text-right font-bold', designTokens.typography.body.base)}>
                  訂單總金額
                </div>
                <div className={cn('col-span-6 md:col-span-4 text-right font-bold', designTokens.typography.h2)}>
                  {formatAmount(order.total_amount)}
                </div>
              </div>
            </div>
          </div>

          {/* 訂單修改歷史摘要 */}
          {timelines.some(t => t.action_type === 'order_modified') && (
            <div className={cn('rounded-none bg-purple-50', getNeoBrutalismClasses())}>
              <h2
                className={cn(
                  designTokens.typography.h2,
                  'border-b-2 md:border-b-3 border-black bg-purple-100 p-3 md:p-4'
                )}
              >
                ✏️ 訂單修改記錄
              </h2>
              <div className="p-3 md:p-4 space-y-3">
                {timelines
                  .filter(t => t.action_type === 'order_modified')
                  .reverse()
                  .map((timeline, index) => {
                    const modifications = timeline.modifications as any
                    const formatDate = (dateString: string) => {
                      const date = new Date(dateString)
                      return date.toLocaleDateString('zh-TW', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    }

                    return (
                      <div
                        key={timeline.id}
                        className="rounded-none border-2 border-purple-400 bg-white p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-sm">
                            修改 #{timelines.filter(t => t.action_type === 'order_modified').length - index}
                          </div>
                          <div className="text-xs text-gray-600">
                            {formatDate(timeline.created_at)} · {timeline.actor_name}
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 space-y-1">
                          {modifications?.items?.map((item: any, i: number) => {
                            if (item.type === 'price_changed') {
                              return <div key={`item-${i}`}>• 商品「{item.product_name}」單價: NT${item.old_price} → NT${item.new_price}</div>
                            }
                            if (item.type === 'quantity_changed') {
                              return <div key={`item-${i}`}>• 商品「{item.product_name}」數量: {item.old_quantity} → {item.new_quantity}</div>
                            }
                            if (item.type === 'removed') {
                              return <div key={`item-${i}`}>• 移除商品「{item.product_name}」</div>
                            }
                            if (item.type === 'added') {
                              return <div key={`item-${i}`}>• 新增商品「{item.product_name}」(單價 NT${item.new_price}, 數量 {item.new_quantity})</div>
                            }
                            return null
                          })}
                          {modifications?.shipping && (
                            <div>• 運費: NT${modifications.shipping.old_fee} → NT${modifications.shipping.new_fee}</div>
                          )}
                          {modifications?.fees?.map((fee: any, i: number) => {
                            if (fee.type === 'added') {
                              return <div key={`fee-${i}`}>• 新增費用「{fee.fee_name}」: NT${fee.amount >= 0 ? '+' : ''}{fee.amount}</div>
                            }
                            if (fee.type === 'removed') {
                              return <div key={`fee-${i}`}>• 移除費用「{fee.fee_name}」</div>
                            }
                            return null
                          })}
                          {modifications?.notes && (
                            <div>• 客戶備註: 已修改</div>
                          )}
                          {modifications?.coupon?.action === 'removed' && (
                            <div>• 移除優惠券「{modifications.coupon.coupon_code}」</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* 訂單操作 */}
          <OrderActions orderId={order.id} orderNumber={order.order_number} currentStatus={order.status} />

          {/* 操作歷史與留言 (Feature 007 - US1) */}
          <div className={cn('rounded-none bg-white', getNeoBrutalismClasses(), designTokens.spacing.card.padding)}>
            <h2 className={cn(designTokens.typography.h2, 'mb-4 md:mb-6')}>訂單溝通與操作歷史</h2>
            <OrderCommentSection orderId={order.id} initialTimelines={timelines} />
          </div>
        </>
      )}

      {/* 客戶快速檢視 Dialog */}
      <ClientQuickViewDialog
        open={showClientDialog}
        onOpenChange={setShowClientDialog}
        client={{
          id: order.user.id,
          name: order.user.name,
          phone: order.user.phone,
          tier_name: order.user.tier_name,
          address: order.user.address || null,
          admin_notes: order.user.admin_notes || null,
        }}
        onUpdate={() => {
          startTransition(() => {
            router.refresh()
          })
        }}
      />
    </div>
  )
}
