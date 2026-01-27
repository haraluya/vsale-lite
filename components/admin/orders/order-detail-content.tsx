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

  // 格式化日期（完整版）
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

  // 格式化日期（簡短版）
  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-TW', {
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
          {/* 客戶資訊區塊 - 強調型佈局 */}
          <div className={cn('rounded-none bg-white', getNeoBrutalismClasses())}>
            {/* Hero 區域：客戶資訊超大顯示 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-b-2 md:border-b-3 border-black p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                {/* 左側：客戶資訊 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4 mb-4">
                    {/* 頭像 */}
                    <button
                      onClick={() => setShowClientDialog(true)}
                      className={cn(
                        'w-14 h-14 md:w-16 md:h-16 flex-shrink-0',
                        'bg-blue-600 text-white',
                        'border-2 md:border-3 border-black shadow-neo-sm md:shadow-neo',
                        'flex items-center justify-center',
                        'text-2xl md:text-3xl font-bold',
                        'hover:bg-blue-700 transition-colors cursor-pointer',
                        'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                      )}
                      title="點擊編輯客戶資料"
                    >
                      {order.user.name.charAt(0)}
                    </button>

                    {/* 姓名與手機 */}
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => setShowClientDialog(true)}
                        className={cn(
                          'text-2xl md:text-3xl font-bold text-blue-600 hover:text-blue-700',
                          'hover:underline transition-colors cursor-pointer text-left',
                          'flex items-center gap-2 mb-1'
                        )}
                        title="點擊編輯客戶資料"
                      >
                        {order.user.name}
                        <span className="text-xs md:text-sm font-normal text-blue-600">✏️ 點擊編輯</span>
                      </button>
                      <div className="flex items-center gap-2 text-lg md:text-xl font-bold text-gray-900 font-mono">
                        <Phone className="h-5 w-5 md:h-6 md:w-6 text-gray-600" />
                        {order.user.phone}
                      </div>
                    </div>
                  </div>

                  {/* 會員等級徽章 */}
                  <div className="inline-flex items-center gap-2 bg-purple-700 text-white px-4 md:px-5 py-2 md:py-2.5 border-2 md:border-3 border-black shadow-neo-sm md:shadow-neo font-bold text-sm md:text-base">
                    ⭐ {order.user.tier_name}會員
                  </div>
                </div>

                {/* 右側：訂單狀態徽章 */}
                <div className="flex-shrink-0">
                  <div className="bg-white px-6 md:px-8 py-3 md:py-4 border-2 md:border-3 border-black shadow-neo md:shadow-[6px_6px_0_black]">
                    <OrderStatusBadge status={order.status} size="lg" />
                  </div>
                </div>
              </div>
            </div>

            {/* 訂單詳細資訊網格 */}
            <div className="grid grid-cols-1 md:grid-cols-3 border-b-2 md:border-b-3 border-black">
              {/* 訂單編號 */}
              <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r-2 border-gray-300 text-center">
                <div className={cn(designTokens.typography.caption, 'text-gray-600 font-bold uppercase tracking-wide mb-2')}>
                  # 訂單編號
                </div>
                <div className={cn(designTokens.typography.body.large, 'font-mono font-bold')}>
                  {order.order_number}
                </div>
              </div>

              {/* 建立時間 */}
              <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r-2 border-gray-300 text-center">
                <div className={cn(designTokens.typography.caption, 'text-gray-600 font-bold uppercase tracking-wide mb-2')}>
                  📅 建立時間
                </div>
                <div className={cn(designTokens.typography.body.base, 'font-medium')}>
                  {formatDate(order.created_at).split(' ').map((part, i) => (
                    <div key={i}>{part}</div>
                  ))}
                </div>
              </div>

              {/* 訂單狀態說明 */}
              <div className="p-5 md:p-6 text-center">
                <div className={cn(designTokens.typography.caption, 'text-gray-600 font-bold uppercase tracking-wide mb-2')}>
                  📊 訂單狀態
                </div>
                <div className={cn(designTokens.typography.body.large, 'font-bold text-blue-600')}>
                  {order.status === 'pending' && '待處理'}
                  {order.status === 'shipping' && '出貨中'}
                  {order.status === 'completed' && '已完成'}
                  {order.status === 'cancelled' && '已取消'}
                </div>
              </div>
            </div>

            {/* 操作按鈕區 */}
            <div className="bg-gray-50 p-5 md:p-6">
              <div className="flex flex-wrap gap-3 justify-center">
                {canEdit && (
                  <Button
                    onClick={() => setEditMode(true)}
                    className={cn(
                      'bg-blue-600 hover:bg-blue-700 text-white font-bold',
                      'border-2 md:border-3 border-black shadow-neo-sm md:shadow-neo',
                      'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
                      'px-6 md:px-8 py-3 md:py-3.5 text-sm md:text-base',
                      'flex-1 md:flex-initial md:min-w-[180px]'
                    )}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    編輯訂單
                  </Button>
                )}
                <OrderActions
                  orderId={order.id}
                  orderNumber={order.order_number}
                  currentStatus={order.status}
                  compact
                />
              </div>
            </div>
          </div>

          {/* ========== 區塊 2: 客戶地址與備註（獨立區塊） ========== */}
          {(order.user.address || order.user.admin_notes) && (
            <div className={cn(
              'rounded-none bg-white',
              getNeoBrutalismClasses(),
              designTokens.spacing.card.padding,
              designTokens.spacing.card.gap
            )}>
              <h2 className={cn(designTokens.typography.h3, 'mb-4 md:mb-6')}>
                客戶資訊補充
              </h2>

              <div className="space-y-4 md:space-y-5">
                {/* 常用地址（條件顯示） */}
                {order.user.address && (
                  <div>
                    <div className={cn(
                      designTokens.typography.label,
                      'text-gray-700 mb-2 flex items-center gap-1.5'
                    )}>
                      📍 常用地址
                    </div>
                    <div className={cn(
                      'rounded-none border-2 border-gray-300 bg-gray-50 p-3 md:p-4',
                      designTokens.typography.body.base,
                      'text-gray-900'
                    )}>
                      {order.user.address}
                    </div>
                  </div>
                )}

                {/* 管理員備註（條件顯示） */}
                {order.user.admin_notes && (
                  <div>
                    <div className={cn(
                      designTokens.typography.label,
                      'text-yellow-800 mb-2 flex items-center gap-1.5'
                    )}>
                      ⚠️ 管理員備註
                    </div>
                    <div className={cn(
                      'rounded-none border-2 border-yellow-500 bg-yellow-50',
                      'p-3 md:p-4',
                      designTokens.typography.body.base,
                      'text-yellow-900 font-medium'
                    )}>
                      {order.user.admin_notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 訂單明細 */}
          <div className={cn('rounded-none bg-white', getNeoBrutalismClasses())}>
            <h2
              className={cn(
                designTokens.typography.h3,
                'border-b-2 md:border-b-3 border-black bg-gray-100 p-4 md:p-5'
              )}
            >
              訂單明細
            </h2>

            {/* 客戶訂單備註 */}
            {order.notes && (
              <div className="border-b-2 border-black bg-blue-50 p-4 md:p-5">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-700 mt-0.5" />
                  <div className="flex-1">
                    <div className={cn(designTokens.typography.label, 'text-blue-800 mb-2')}>
                      💬 客戶訂單備註
                    </div>
                    <div
                      className={cn(
                        'rounded-none border-2 border-blue-400 bg-white p-3 md:p-4 text-blue-900',
                        designTokens.typography.body.base,
                        'font-medium'
                      )}
                    >
                      {order.notes}
                    </div>
                  </div>
                </div>
              </div>
            )}

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
              {order.shipping_fee > 0 && (
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
                            {formatDateShort(timeline.created_at)} · {timeline.actor_name}
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
