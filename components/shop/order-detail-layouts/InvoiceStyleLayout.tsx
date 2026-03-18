/**
 * Invoice-Style Layout - 發票式訂單詳情
 * 設計特點：
 * - 專業發票風格，適合列印
 * - 表格式清晰分欄
 * - 金額計算邏輯一目了然
 * - 強化邊框層次與間距
 */

'use client'

import { OrderDetail } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { formatDateTW } from '@/lib/date-utils'
import { OrderStatusBadge } from '@/components/shop/order-status-badge'

interface Props {
  order: OrderDetail
}

export function InvoiceStyleLayout({ order }: Props) {
  return (
    <div className="max-w-4xl mx-auto">
      {/* 發票標題區 */}
      <div className="rounded-theme-sm border bg-surface shadow-neo mb-6">
        <div className="bg-black text-white px-6 md:px-8 py-4 md:py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-black">訂單明細</h1>
              <p className="text-sm mt-1 text-text-secondary">{order.order_number}</p>
            </div>
            <OrderStatusBadge status={order.status} size="lg" />
          </div>
        </div>

        {/* 訂單資訊 */}
        <div className="px-6 md:px-8 py-5 border-b">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-bold text-xs text-text-secondary mb-1">訂單編號</div>
              <div className="font-bold">{order.order_number}</div>
            </div>
            <div>
              <div className="font-bold text-xs text-text-secondary mb-1">訂單日期</div>
              <div className="font-bold">{formatDateTW(order.created_at)}</div>
            </div>
            <div>
              <div className="font-bold text-xs text-text-secondary mb-1">商品總數</div>
              <div className="font-bold">
                {order.items.reduce((sum, item) => sum + item.quantity, 0)} 件
              </div>
            </div>
          </div>

          {order.user.address && (
            <div className="mt-4 pt-4 border-t-2 border-gray-200">
              <div className="font-bold text-xs text-text-secondary mb-1">送貨地址</div>
              <div className="font-bold">{order.user.address}</div>
            </div>
          )}
        </div>

        {/* 商品明細表格 */}
        <div className="overflow-x-auto">
          {/* 桌面版表格 */}
          <table className="w-full hidden md:table">
            <thead>
              <tr className="bg-surface-secondary border-b">
                <th className="px-6 py-3 text-left text-xs font-black uppercase">商品</th>
                <th className="px-6 py-3 text-right text-xs font-black uppercase w-24">單價</th>
                <th className="px-6 py-3 text-center text-xs font-black uppercase w-20">數量</th>
                <th className="px-6 py-3 text-right text-xs font-black uppercase w-28">小計</th>
              </tr>
            </thead>
            <tbody>
              {/* 組合優惠項目 */}
              {order.combo_deal_items && order.combo_deal_items.length > 0 && (
                <>
                  {order.combo_deal_items.map((comboDealItem) => {
                    const snapshot = comboDealItem.combo_deal_snapshot
                    const discountText = snapshot.discount_type === 'fixed'
                      ? `折扣 ${formatCurrency(snapshot.discount_value)}`
                      : `${Math.round(snapshot.discount_value / 10)} 折`

                    return (
                      <tr key={comboDealItem.id} className="border-b-2 border-gray-200">
                        <td className="px-6 py-4" colSpan={4}>
                          <div className="bg-yellow-50 border border-yellow-500 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-black text-yellow-900">📦 {snapshot.name}</span>
                              <span className="text-xs font-bold bg-yellow-200 border border-yellow-600 px-2 py-1">
                                {discountText}
                              </span>
                            </div>
                            <div className="space-y-1.5 text-sm">
                              {snapshot.series.flatMap(series =>
                                series.products.map((product, idx) => (
                                  <div key={`${series.series_id}-${idx}`} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="bg-yellow-200 border border-yellow-500 px-2 py-0.5 text-xs font-bold">
                                        {series.series_name}
                                      </span>
                                      <span>{product.product_name}</span>
                                    </div>
                                    <span className="text-text-secondary">
                                      {formatCurrency(product.unit_price)} × {product.quantity}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </>
              )}

              {/* 一般商品 */}
              {order.items.map((item) => {
                const seriesName = item.series_name_snapshot || item.series?.name

                return (
                  <tr key={item.id} className="border-b-2 border-gray-200">
                    <td className="px-6 py-4">
                      <div className="font-bold">{item.product_name_snapshot}</div>
                      {seriesName && (
                        <div className="mt-1">
                          <span className="inline-block bg-blue-100 border border-blue-500 px-2 py-0.5 text-xs font-bold text-blue-900">
                            {seriesName}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-bold">{formatCurrency(item.deal_price)}</td>
                    <td className="px-6 py-4 text-center font-bold">{item.quantity}</td>
                    <td className="px-6 py-4 text-right font-black text-success">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* 手機版列表 */}
          <div className="md:hidden divide-y-2 divide-gray-200">
            {/* 組合優惠項目 */}
            {order.combo_deal_items && order.combo_deal_items.length > 0 && (
              <>
                {order.combo_deal_items.map((comboDealItem) => {
                  const snapshot = comboDealItem.combo_deal_snapshot
                  const discountText = snapshot.discount_type === 'fixed'
                    ? `折扣 ${formatCurrency(snapshot.discount_value)}`
                    : `${Math.round(snapshot.discount_value / 10)} 折`

                  return (
                    <div key={comboDealItem.id} className="p-5">
                      <div className="bg-yellow-50 border border-yellow-500 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <span className="font-black text-yellow-900 flex-1">📦 {snapshot.name}</span>
                          <span className="text-xs font-bold bg-yellow-200 border border-yellow-600 px-2 py-1 ml-2">
                            {discountText}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          {snapshot.series.flatMap(series =>
                            series.products.map((product, idx) => (
                              <div key={`${series.series_id}-${idx}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="bg-yellow-200 border border-yellow-500 px-1.5 py-0.5 text-xs font-bold">
                                    {series.series_name}
                                  </span>
                                  <span className="flex-1">{product.product_name}</span>
                                </div>
                                <div className="text-text-secondary text-xs ml-auto text-right">
                                  {formatCurrency(product.unit_price)} × {product.quantity}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
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
                <div key={item.id} className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="font-bold mb-1">{item.product_name_snapshot}</div>
                      {seriesName && (
                        <span className="inline-block bg-blue-100 border border-blue-500 px-2 py-0.5 text-xs font-bold text-blue-900">
                          {seriesName}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-black text-success">{formatCurrency(item.subtotal)}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-text-secondary">
                    <span>{formatCurrency(item.deal_price)} × {item.quantity}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 金額摘要區 */}
        <div className="px-6 md:px-8 py-5 bg-surface-secondary border-t">
          <div className="max-w-md ml-auto space-y-2.5">
            {/* 商品小計 */}
            <div className="flex justify-between text-sm">
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
                  <div key={comboDealItem.id} className="flex justify-between text-sm text-orange-600">
                    <span className="truncate mr-2">{comboDealItem.combo_deal_snapshot.name}</span>
                    <span className="font-bold shrink-0">-{formatCurrency(comboDealItem.discount_amount)}</span>
                  </div>
                ))}
              </>
            )}

            {/* 優惠券 */}
            {order.coupon && (
              <div className="flex justify-between text-sm text-orange-600">
                <span>優惠券 ({order.coupon.coupon_code})</span>
                <span className="font-bold">-{formatCurrency(order.coupon.discount_amount)}</span>
              </div>
            )}

            {/* 運費 */}
            {order.shipping_fee !== undefined && order.shipping_fee !== null && (
              <div className="flex justify-between text-sm">
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
                  <div key={fee.id} className="flex justify-between text-sm">
                    <span className="text-foreground">{fee.fee_name}</span>
                    <span className={cn(
                      "font-bold",
                      fee.amount < 0 ? 'text-error' : 'text-foreground'
                    )}>
                      {fee.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(fee.amount))}
                    </span>
                  </div>
                ))}
              </>
            )}

            {/* 總計 */}
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-xl font-black">訂單總金額</span>
              <span className="text-3xl font-black text-success">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* 訂單備註 */}
        {order.notes && (
          <div className="px-6 md:px-8 py-5 border-t bg-yellow-50">
            <div className="font-black text-sm mb-2">訂單備註</div>
            <div className="text-sm text-foreground">{order.notes}</div>
          </div>
        )}
      </div>
    </div>
  )
}
