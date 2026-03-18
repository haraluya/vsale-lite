/**
 * Compact Card Layout - 極簡卡片式訂單詳情
 * 設計特點：
 * - 高密度資訊顯示
 * - 改善邊框間距（16-20px 內邊距）
 * - 網格系統分組相關資訊
 * - 商品項目緊湊表格式呈現
 */

'use client'

import { OrderDetail } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { formatDateTW } from '@/lib/date-utils'
import { OrderStatusBadge } from '@/components/shop/order-status-badge'
import { Package, Tag, Truck, FileText } from 'lucide-react'

interface Props {
  order: OrderDetail
}

export function CompactCardLayout({ order }: Props) {
  return (
    <div className="space-y-4">
      {/* 訂單標題區 - 緊湊型 */}
      <div className="rounded-none border-3 border-black bg-surface shadow-neo p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-black truncate">{order.order_number}</h1>
            <p className="text-sm text-text-secondary mt-1">{formatDateTW(order.created_at)}</p>
          </div>
          <OrderStatusBadge status={order.status} size="lg" />
        </div>
      </div>

      {/* 商品區 - 緊湑表格式 */}
      <div className="rounded-none border-3 border-black bg-surface shadow-neo overflow-hidden">
        <div className="bg-black text-white px-5 py-3">
          <h2 className="text-lg md:text-xl font-black flex items-center gap-2">
            <Package className="w-5 h-5" />
            訂單商品
          </h2>
        </div>

        <div className="p-5">
          {/* 組合優惠項目 */}
          {order.combo_deal_items && order.combo_deal_items.length > 0 && (
            <div className="space-y-2 mb-4">
              {order.combo_deal_items.map((comboDealItem) => {
                const snapshot = comboDealItem.combo_deal_snapshot
                const discountText = snapshot.discount_type === 'fixed'
                  ? `折扣 ${formatCurrency(snapshot.discount_value)}`
                  : `${Math.round(snapshot.discount_value / 10)} 折`

                return (
                  <div
                    key={comboDealItem.id}
                    className="border-2 border-yellow-500 bg-yellow-50 p-4"
                  >
                    {/* 組合優惠標題 - 單行緊湊 */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-black text-yellow-900 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        {snapshot.name}
                      </h3>
                      <span className="text-xs font-bold bg-yellow-200 border border-yellow-600 px-2 py-0.5">
                        {discountText}
                      </span>
                    </div>

                    {/* 商品列表 - 緊湊網格 */}
                    <div className="space-y-1.5">
                      {snapshot.series.flatMap(series =>
                        series.products.map((product, idx) => (
                          <div key={`${series.series_id}-${idx}`} className="flex items-center text-xs">
                            <span className="inline-block bg-yellow-200 border border-yellow-500 px-1.5 py-0.5 font-bold text-yellow-900 mr-2 shrink-0">
                              {series.series_name}
                            </span>
                            <span className="flex-1 truncate text-foreground">{product.product_name}</span>
                            <span className="text-text-secondary ml-2 shrink-0">
                              {formatCurrency(product.unit_price)} × {product.quantity}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 一般商品 - 緊湊列表 */}
          <div className="space-y-2">
            {order.items.map((item) => {
              const seriesName = item.series_name_snapshot || item.series?.name

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2 border-b-2 border-gray-200 last:border-0"
                >
                  {/* 左側：系列標籤 + 商品名稱 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {seriesName && (
                        <span className="inline-block bg-blue-100 border-2 border-blue-500 px-2 py-0.5 text-xs font-bold text-blue-900 shrink-0">
                          {seriesName}
                        </span>
                      )}
                      <span className="font-bold truncate">{item.product_name_snapshot}</span>
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      {formatCurrency(item.deal_price)} × {item.quantity}
                    </div>
                  </div>

                  {/* 右側：小計 */}
                  <div className="text-right shrink-0">
                    <div className="text-lg font-black text-success">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 金額摘要區 - 緊湊網格 */}
      <div className="rounded-none border-3 border-black bg-surface shadow-neo p-5">
        <div className="space-y-2">
          {/* 商品小計 */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-foreground">商品小計</span>
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
                <div key={comboDealItem.id} className="flex items-center justify-between py-1.5 text-orange-600">
                  <span className="text-sm flex items-center gap-1.5 truncate">
                    <Tag className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{comboDealItem.combo_deal_snapshot.name}</span>
                  </span>
                  <span className="font-bold shrink-0">-{formatCurrency(comboDealItem.discount_amount)}</span>
                </div>
              ))}
            </>
          )}

          {/* 優惠券折扣 */}
          {order.coupon && (
            <div className="flex items-center justify-between py-1.5 text-orange-600">
              <span className="text-sm flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                優惠券 ({order.coupon.coupon_code})
              </span>
              <span className="font-bold">-{formatCurrency(order.coupon.discount_amount)}</span>
            </div>
          )}

          {/* 運費 */}
          {order.shipping_fee !== undefined && order.shipping_fee !== null && (
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                運費
              </span>
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
                <div key={fee.id} className="flex items-center justify-between py-1.5">
                  <span className="text-sm">{fee.fee_name}</span>
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

          {/* 總金額 - 強調顯示 */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t-3 border-black">
            <span className="text-lg md:text-xl font-black">訂單總金額</span>
            <span className="text-2xl md:text-3xl font-black text-success">
              {formatCurrency(order.total_amount)}
            </span>
          </div>
        </div>
      </div>

      {/* 訂單資訊 - 網格佈局 */}
      <div className="rounded-none border-3 border-black bg-surface shadow-neo p-5">
        <h2 className="text-lg md:text-xl font-black mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          訂單資訊
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="flex justify-between md:block">
            <span className="font-bold">訂單編號</span>
            <span className="text-foreground md:block">{order.order_number}</span>
          </div>
          <div className="flex justify-between md:block">
            <span className="font-bold">訂單狀態</span>
            <span className="md:block mt-1">
              <OrderStatusBadge status={order.status} size="sm" />
            </span>
          </div>
          <div className="flex justify-between md:block">
            <span className="font-bold">建立時間</span>
            <span className="text-foreground md:block">{formatDateTW(order.created_at)}</span>
          </div>
          <div className="flex justify-between md:block">
            <span className="font-bold">商品數量</span>
            <span className="text-foreground md:block">
              {order.items.reduce((sum, item) => sum + item.quantity, 0)} 件
            </span>
          </div>
          {order.user.address && (
            <div className="col-span-1 md:col-span-2 pt-2 border-t-2 border-gray-200">
              <span className="font-bold block mb-1">送貨地址</span>
              <span className="text-foreground">{order.user.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* 訂單備註 */}
      {order.notes && (
        <div className="rounded-none border-3 border-black bg-surface shadow-neo p-5">
          <h2 className="text-lg md:text-xl font-black mb-3">訂單備註</h2>
          <p className="text-sm text-foreground">{order.notes}</p>
        </div>
      )}
    </div>
  )
}
