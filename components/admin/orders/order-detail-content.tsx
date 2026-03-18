'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { OrderStatusBadge } from '@/components/shop/order-status-badge'
import { OrderActions } from '@/components/admin/order-actions'
import { OrderCommentSection } from '@/components/admin/order-comment-section'
import { OrderEditor } from './order-editor'
import { ClientQuickViewDialog } from '@/components/admin/client-quick-view-dialog'
import { InfoField, SectionHeader, NoteField } from './info-field'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  User,
  Phone,
  Award,
  Calendar,
  FileText,
  Edit,
  Hash,
  Package,
  MapPin,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { designTokens, getPageContainerClasses, getThemeClasses } from '@/lib/design-tokens'
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
          'inline-flex items-center gap-2 rounded-theme-sm bg-white font-bold transition-transform',
          getThemeClasses({ hover: true }),
          designTokens.button.md
        )}
      >
        <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
        <span>返回訂單列表</span>
      </Link>

      {editMode ? (
        /* 編輯模式 */
        <>
          <div className={cn('rounded-theme-sm bg-white', getThemeClasses(), designTokens.spacing.card.padding)}>
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
          {/* 客戶資訊區塊 - 統一設計系統版本 */}
          <div className={cn('rounded-theme-sm bg-white', getThemeClasses(), designTokens.spacing.card.padding)}>
            {/* 左右分欄 */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
              {/* 左欄：客戶資料 */}
              <div className="flex flex-col gap-5">
                <SectionHeader title="客戶資料" icon={User} />

                <InfoField
                  icon={User}
                  iconColor="blue"
                  label="客戶姓名（點擊編輯）"
                  value={order.user.name}
                  valueSize="base"
                  valueColor="blue"
                  onClick={() => setShowClientDialog(true)}
                />

                <InfoField
                  icon={Phone}
                  iconColor="green"
                  label="手機號碼"
                  value={order.user.phone}
                  valueSize="base"
                  valueColor="gray"
                />

                <InfoField
                  icon={Award}
                  iconColor="purple"
                  label="會員等級"
                  value={order.user.tier_name}
                  valueSize="base"
                  valueColor="purple"
                />
              </div>

              {/* 右欄：訂單資料 */}
              <div className="flex flex-col gap-5">
                <SectionHeader title="訂單資料" icon={Package} />

                <InfoField
                  icon={Hash}
                  iconColor="orange"
                  label="訂單編號"
                  value={<span className="font-mono">{order.order_number}</span>}
                  valueSize="base"
                  valueColor="black"
                />

                <InfoField
                  icon={Package}
                  iconColor="blue"
                  label="訂單狀態"
                  value={<OrderStatusBadge status={order.status} size="md" />}
                  valueSize="base"
                  valueColor="gray"
                />

                <InfoField
                  icon={Calendar}
                  iconColor="purple"
                  label="建立時間"
                  value={formatDate(order.created_at)}
                  valueSize="sm"
                  valueColor="gray"
                />
              </div>
            </div>

            {/* 底部操作區 */}
            <div className="flex flex-col gap-5 mt-8 md:mt-10">
              <SectionHeader title="訂單操作" />
              <div className="flex flex-wrap gap-3">
                {canEdit && (
                  <Button
                    onClick={() => setEditMode(true)}
                    className={cn(
                      'bg-blue-600 hover:bg-blue-700 text-white font-bold',
                      'border-theme shadow-neo-sm',
                      'active:scale-[0.98]',
                      'px-4 md:px-6 py-2 md:py-3 text-sm md:text-base'
                    )}
                  >
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

          {/* ========== 區塊 2: 客戶地址與備註（獨立區塊） - 統一設計系統版本 ========== */}
          {(order.user.address || order.user.admin_notes) && (
            <div
              className={cn(
                'rounded-theme-sm bg-white',
                getThemeClasses(),
                designTokens.spacing.card.padding,
                designTokens.spacing.card.gap
              )}
            >
              <SectionHeader title="客戶資訊補充" icon={FileText} className="mb-5" />

              <div className="space-y-5">
                {/* 常用地址（條件顯示） */}
                {order.user.address && (
                  <NoteField icon={MapPin} label="常用地址" content={order.user.address} variant="info" />
                )}

                {/* 管理員備註（條件顯示） */}
                {order.user.admin_notes && (
                  <NoteField
                    icon={AlertTriangle}
                    label="管理員備註"
                    content={order.user.admin_notes}
                    variant="warning"
                  />
                )}
              </div>
            </div>
          )}

          {/* 訂單明細 */}
          <div className={cn('rounded-theme-sm bg-white', getThemeClasses())}>
            <h2
              className={cn(
                designTokens.typography.h3,
                'border-b bg-gray-100 p-4 md:p-5'
              )}
            >
              訂單明細
            </h2>

            {/* 客戶訂單備註 - 統一設計系統版本 */}
            {order.notes && (
              <div className="border-b bg-blue-50 p-4 md:p-5">
                <NoteField icon={FileText} label="客戶訂單備註" content={order.notes} variant="info" />
              </div>
            )}

            <div className="divide-y-2 divide-black">
              {/* 🆕 Feature 021: 組合優惠項目 */}
              {order.combo_deal_items && order.combo_deal_items.length > 0 && (
                <>
                  {order.combo_deal_items.map((comboDealItem) => {
                    const snapshot = comboDealItem.combo_deal_snapshot

                    // 生成折扣說明文字
                    const discountText = snapshot.discount_type === 'fixed'
                      ? `折扣 ${formatAmount(snapshot.discount_value)}`
                      : `${Math.round(snapshot.discount_value / 10)} 折`

                    return (
                      <div key={comboDealItem.id} className="bg-yellow-50 p-3 md:p-4">
                        {/* 組合優惠標題 */}
                        <div className="flex items-start gap-2 mb-3">
                          <Package className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-1" />
                          <div className="flex-1">
                            <h3 className={cn(designTokens.typography.body.large, "font-bold text-yellow-900")}>
                              📦 {snapshot.name}
                            </h3>
                            <p className={cn(designTokens.typography.caption, "text-yellow-700")}>
                              ({discountText})
                            </p>
                          </div>
                        </div>

                        {/* 商品清單 */}
                        <div className="space-y-2 ml-7 mb-3">
                          {snapshot.series.flatMap(series =>
                            series.products.map((product, idx) => (
                              <div key={`${series.series_id}-${idx}`} className="grid grid-cols-12 gap-2">
                                <div className="col-span-6 text-sm">
                                  <span className="text-yellow-800 font-bold">【{series.series_name}】</span>
                                  <span className="text-gray-900">{product.product_name}</span>
                                </div>
                                <div className="col-span-2 text-right text-sm text-gray-600">
                                  {formatAmount(product.unit_price)}
                                </div>
                                <div className="col-span-2 text-center text-sm text-gray-600">
                                  × {product.quantity}
                                </div>
                                <div className="col-span-2 text-right text-sm text-gray-900 font-semibold">
                                  {formatAmount(product.unit_price * product.quantity)}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* 組合優惠價格總計 */}
                        <div className="ml-7 pt-2 border-t-2 border-yellow-300 grid grid-cols-12 gap-2">
                          <div className="col-span-6 text-sm text-gray-600">組合優惠小計</div>
                          <div className="col-span-2"></div>
                          <div className="col-span-2"></div>
                          <div className="col-span-2 text-right text-base font-bold text-green-600">
                            {formatAmount(comboDealItem.discounted_price)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}

              {/* 一般商品項目 */}
              {order.items.map(item => {
                // 優先使用系列名稱快照，如果沒有才使用 JOIN 結果（向後相容）
                const seriesName = item.series_name_snapshot || item.series?.name

                return (
                  <div key={item.id} className="grid grid-cols-12 gap-2 md:gap-4 p-3 md:p-4">
                    <div className={cn('col-span-12 md:col-span-6 font-bold', designTokens.typography.body.base)}>
                      {seriesName && (
                        <span className="text-purple-700">【{seriesName}】</span>
                      )}
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
                )
              })}

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

              {/* 組合優惠折扣 (Feature 021) */}
              {order.combo_deal_items && order.combo_deal_items.length > 0 && (
                <>
                  {order.combo_deal_items.map((comboDealItem) => (
                    <div key={comboDealItem.id} className="grid grid-cols-12 gap-2 md:gap-4 bg-orange-50 p-3 md:p-4">
                      <div className={cn('col-span-6 md:col-span-8 text-right font-bold text-orange-700', designTokens.typography.body.base)}>
                        🎁 組合優惠折扣 - {comboDealItem.combo_deal_snapshot.name}
                      </div>
                      <div
                        className={cn(
                          'col-span-6 md:col-span-4 text-right font-bold text-orange-700',
                          designTokens.typography.body.large
                        )}
                      >
                        - {formatAmount(comboDealItem.discount_amount)}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* 優惠券折扣 (Feature 009) */}
              {order.coupon && (
                <div className="grid grid-cols-12 gap-2 md:gap-4 bg-orange-50 border-t p-3 md:p-4">
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
            <div className={cn('rounded-theme-sm bg-purple-50', getThemeClasses())}>
              <h2
                className={cn(
                  designTokens.typography.h2,
                  'border-b bg-purple-100 p-3 md:p-4'
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
                        className="rounded-theme-sm border border-purple-400 bg-white p-3"
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
          <div className={cn('rounded-theme-sm bg-white', getThemeClasses(), designTokens.spacing.card.padding)}>
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
