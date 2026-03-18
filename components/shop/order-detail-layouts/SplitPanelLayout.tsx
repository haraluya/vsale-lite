/**
 * Split-Panel Layout - 分屏式訂單詳情
 * 設計特點：
 * - 左右分欄（桌面）/ 上下分區（手機）
 * - 商品與金額摘要分離顯示
 * - 更好的視覺層次
 * - 適合快速掃視訂單重點
 */

'use client'

import { OrderDetail } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { formatDateTW } from '@/lib/date-utils'
import { OrderStatusBadge } from '@/components/shop/order-status-badge'
import { Package, Receipt, MapPin, Calendar, Hash } from 'lucide-react'

interface Props {
  order: OrderDetail
}

// 根據訂單狀態返回對應的漸層色
function getStatusGradient(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-gradient-to-r from-yellow-400 to-orange-400' // 待確認：黃→橙
    case 'confirmed':
      return 'bg-gradient-to-r from-blue-400 to-cyan-400' // 已確認：藍→青
    case 'shipping':
      return 'bg-gradient-to-r from-purple-400 to-pink-400' // 出貨中：紫→粉
    case 'completed':
      return 'bg-gradient-to-r from-green-400 to-emerald-400' // 已完成：綠→翠
    case 'cancelled':
      return 'bg-gradient-to-r from-gray-400 to-slate-400' // 已取消：灰→石板
    default:
      return 'bg-gradient-to-r from-blue-400 to-cyan-400' // 預設：藍→青
  }
}

export function SplitPanelLayout({ order }: Props) {
  const gradientClass = getStatusGradient(order.status)

  return (
    <div className="space-y-4">
      {/* 訂單標題 */}
      <div className={cn(
        "rounded-none border-3 border-black shadow-neo p-5 md:p-6",
        gradientClass
      )}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-white drop-shadow-lg">
              {order.order_number}
            </h1>
            <p className="text-sm text-white/90 mt-1">{formatDateTW(order.created_at)}</p>
          </div>
          <OrderStatusBadge status={order.status} size="lg" />
        </div>
      </div>

      {/* 主要內容區 - 分屏佈局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左側/上方：商品明細 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 商品區塊 */}
          <div className="rounded-none border-3 border-black bg-surface shadow-neo overflow-hidden">
            <div className="bg-black text-white px-5 py-3 flex items-center gap-2">
              <Package className="w-5 h-5" />
              <h2 className="text-lg font-black">訂單商品</h2>
            </div>

            <div className="p-5 space-y-3">
              {/* 組合優惠項目 */}
              {order.combo_deal_items && order.combo_deal_items.length > 0 && (
                <>
                  {order.combo_deal_items.map((comboDealItem) => {
                    const snapshot = comboDealItem.combo_deal_snapshot
                    const discountText = snapshot.discount_type === 'fixed'
                      ? `折扣 ${formatCurrency(snapshot.discount_value)}`
                      : `${Math.round(snapshot.discount_value / 10)} 折`

                    return (
                      <div
                        key={comboDealItem.id}
                        className="border-2 border-yellow-500 bg-yellow-50 p-4 rounded-none"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-yellow-700" />
                            <h3 className="font-black text-yellow-900">{snapshot.name}</h3>
                          </div>
                          <span className="text-xs font-bold bg-yellow-200 border border-yellow-600 px-2 py-1">
                            {discountText}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-sm">
                          {snapshot.series.flatMap(series =>
                            series.products.map((product, idx) => (
                              <div key={`${series.series_id}-${idx}`} className="flex items-center gap-2">
                                <span className="bg-yellow-200 border border-yellow-500 px-1.5 py-0.5 text-xs font-bold shrink-0">
                                  {series.series_name}
                                </span>
                                <span className="flex-1 truncate">{product.product_name}</span>
                                <span className="text-text-secondary text-xs shrink-0">
                                  {formatCurrency(product.unit_price)} × {product.quantity}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })}
                </>
              )}

              {/* 一般商品 */}
              {order.items.map((item) => {
                const seriesName = item.series_name_snapshot || item.series?.name

                return (
                  <div
                    key={item.id}
                    className="border-2 border-gray-300 bg-surface-secondary p-4 rounded-none hover:border-black transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        {seriesName && (
                          <div className="mb-1.5">
                            <span className="inline-block bg-blue-100 border-2 border-blue-500 px-2 py-0.5 text-xs font-bold text-blue-900">
                              {seriesName}
                            </span>
                          </div>
                        )}
                        <h3 className="font-bold text-base">{item.product_name_snapshot}</h3>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xl font-black text-success">
                          {formatCurrency(item.subtotal)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-text-secondary">
                      <span>單價 {formatCurrency(item.deal_price)}</span>
                      <span>數量 {item.quantity}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 訂單備註 */}
          {order.notes && (
            <div className="rounded-none border-3 border-black bg-surface shadow-neo p-5">
              <h3 className="font-black mb-2 flex items-center gap-2">
                <span className="text-lg">📝</span>
                訂單備註
              </h3>
              <p className="text-sm text-foreground">{order.notes}</p>
            </div>
          )}
        </div>

        {/* 右側/下方：金額摘要與訂單資訊 */}
        <div className="lg:col-span-1 space-y-4">
          {/* 金額摘要 - 固定在右側 */}
          <div className="rounded-none border-3 border-black bg-surface shadow-neo overflow-hidden lg:sticky lg:top-4">
            <div className="bg-green-600 text-white px-5 py-3 flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              <h2 className="text-lg font-black">金額摘要</h2>
            </div>

            <div className="p-5 space-y-2.5">
              {/* 商品小計 */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-foreground">商品小計</span>
                <span className="font-bold">
                  {formatCurrency(
                    order.items.reduce((sum, item) => sum + item.subtotal, 0) +
                    (order.combo_deal_items?.reduce((sum, item) => sum + item.original_price, 0) || 0)
                  )}
                </span>
              </div>

              {/* 組合優惠折扣 */}
              {order.combo_deal_items && order.combo_deal_items.length > 0 && (
                <>
                  {order.combo_deal_items.map((comboDealItem) => (
                    <div key={comboDealItem.id} className="flex justify-between items-center text-sm text-orange-600">
                      <span className="truncate mr-2 text-xs">{comboDealItem.combo_deal_snapshot.name}</span>
                      <span className="font-bold shrink-0">-{formatCurrency(comboDealItem.discount_amount)}</span>
                    </div>
                  ))}
                </>
              )}

              {/* 優惠券 */}
              {order.coupon && (
                <div className="flex justify-between items-center text-sm text-orange-600">
                  <span className="text-xs">優惠券</span>
                  <span className="font-bold">-{formatCurrency(order.coupon.discount_amount)}</span>
                </div>
              )}

              {/* 運費 */}
              {order.shipping_fee !== undefined && order.shipping_fee !== null && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-foreground">運費</span>
                  <span className={cn(
                    "font-bold",
                    order.shipping_fee === 0 ? 'text-success' : 'text-foreground'
                  )}>
                    {order.shipping_fee === 0 ? '免運' : formatCurrency(order.shipping_fee)}
                  </span>
                </div>
              )}

              {/* 自訂費用 */}
              {order.custom_fees && order.custom_fees.length > 0 && (
                <>
                  {order.custom_fees.map((fee) => (
                    <div key={fee.id} className="flex justify-between items-center text-sm">
                      <span className="text-foreground text-xs truncate">{fee.fee_name}</span>
                      <span className={cn(
                        "font-bold shrink-0",
                        fee.amount < 0 ? 'text-error' : 'text-foreground'
                      )}>
                        {fee.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(fee.amount))}
                      </span>
                    </div>
                  ))}
                </>
              )}

              {/* 總金額 */}
              <div className="pt-3 mt-2 border-t-3 border-black">
                <div className="flex justify-between items-center">
                  <span className="text-base font-black">總金額</span>
                  <span className="text-2xl md:text-3xl font-black text-success">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 訂單資訊卡片 */}
          <div className="rounded-none border-3 border-black bg-surface shadow-neo p-5">
            <h3 className="font-black mb-4 text-lg">訂單資訊</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Hash className="w-4 h-4 mt-0.5 text-text-secondary shrink-0" />
                <div className="flex-1">
                  <div className="text-xs text-text-secondary mb-0.5">訂單編號</div>
                  <div className="font-bold">{order.order_number}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 mt-0.5 text-text-secondary shrink-0" />
                <div className="flex-1">
                  <div className="text-xs text-text-secondary mb-0.5">建立時間</div>
                  <div className="font-bold">{formatDateTW(order.created_at)}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Package className="w-4 h-4 mt-0.5 text-text-secondary shrink-0" />
                <div className="flex-1">
                  <div className="text-xs text-text-secondary mb-0.5">商品數量</div>
                  <div className="font-bold">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)} 件
                  </div>
                </div>
              </div>

              {order.user.address && (
                <div className="flex items-start gap-3 pt-3 border-t-2 border-gray-200">
                  <MapPin className="w-4 h-4 mt-0.5 text-text-secondary shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs text-text-secondary mb-0.5">送貨地址</div>
                    <div className="font-bold">{order.user.address}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
