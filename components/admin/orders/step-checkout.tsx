'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Tag, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAlert } from '@/lib/contexts/dialog-context'
import { createOrder } from '@/lib/actions/orders'
import { getCustomerCoupons } from '@/lib/actions/coupons'
import { calculateCouponDiscount, formatDiscountDisplay } from '@/lib/utils/coupon-helpers'
import { calculateGrandTotal } from '@/lib/pricing/order-calculator'
import type { AdminOrderDraftReturn } from '@/hooks/use-admin-order-draft'
import type { UserCoupon } from '@/types'
import type { CartItemForCoupon } from '@/lib/utils/coupon-helpers'

interface StepCheckoutProps {
  draft: AdminOrderDraftReturn
  onOrderCreated: () => void
}

export function StepCheckout({ draft, onOrderCreated }: StepCheckoutProps) {
  const alert = useAlert()
  const [submitting, setSubmitting] = useState(false)
  const [coupons, setCoupons] = useState<UserCoupon[]>([])
  const [loadingCoupons, setLoadingCoupons] = useState(false)
  const [couponExpanded, setCouponExpanded] = useState(false)

  const { selectedCustomer, regularItems, comboDeals, appliedCoupon, notes, calculation } = draft

  // 載入客戶優惠券
  useEffect(() => {
    if (!selectedCustomer) return
    let cancelled = false
    setLoadingCoupons(true)
    getCustomerCoupons(selectedCustomer.id).then((result) => {
      if (cancelled) return
      if (result.success && result.data) {
        setCoupons(result.data)
      }
      setLoadingCoupons(false)
    })
    return () => { cancelled = true }
  }, [selectedCustomer])

  // 套用優惠券
  const handleApplyCoupon = useCallback((userCoupon: UserCoupon) => {
    if (!userCoupon.coupon || !selectedCustomer) return

    const cartItems: CartItemForCoupon[] = regularItems.map((item) => ({
      product_id: item.productId,
      series_id: item.seriesId,
      price: item.tierPrice,
      quantity: item.quantity,
    }))

    const result = calculateCouponDiscount({
      coupon: userCoupon.coupon,
      cartItems,
      userTierId: selectedCustomer.tierId,
    })

    if (!result.valid) {
      alert({ title: '無法套用', message: result.error || '優惠券不適用', variant: 'warning' })
      return
    }

    draft.applyCoupon({
      userCouponId: userCoupon.id,
      coupon: userCoupon.coupon,
      discountAmount: result.discountAmount ?? 0,
    })
    setCouponExpanded(false)
  }, [regularItems, selectedCustomer, draft, alert])

  // 送出訂單
  const handleSubmit = async () => {
    if (!selectedCustomer || !calculation) return
    setSubmitting(true)

    try {
      const result = await createOrder({
        items: regularItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        comboDealItems: comboDeals.map((deal) => ({
          comboDealId: deal.combo_deal_id,
          comboDealName: deal.combo_deal_name,
          selectedProducts: deal.selected_products.map((sp) => ({
            product_id: sp.product_id,
            series_id: sp.series_id,
            quantity: sp.quantity,
          })),
          originalPrice: deal.original_price,
          discountedPrice: deal.discounted_price,
          discountAmount: deal.discount_amount,
        })),
        notes: notes || null,
        userCouponId: appliedCoupon?.userCouponId ?? null,
        onBehalfOfUserId: selectedCustomer.id,
      })

      if (result.success) {
        await alert({
          title: '下單成功',
          message: `訂單 ${result.data?.orderNumber} 已建立`,
          variant: 'success',
        })
        onOrderCreated()
      } else {
        await alert({
          title: '下單失敗',
          message: result.message || '建立訂單時發生錯誤',
          variant: 'error',
        })
      }
    } catch {
      await alert({
        title: '系統錯誤',
        message: '建立訂單時發生未預期的錯誤',
        variant: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!selectedCustomer || !calculation) return null

  const grandTotal = calculateGrandTotal(calculation, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* 客戶資訊 */}
      <div className="bg-blue-50 rounded-theme p-3 flex items-center gap-2 text-sm">
        <span className="font-medium">{selectedCustomer.displayName || selectedCustomer.phone}</span>
        {selectedCustomer.tierName && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {selectedCustomer.tierName}
          </span>
        )}
      </div>

      {/* 普通商品明細 */}
      {regularItems.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold mb-2">一般商品</h4>
          <div className="divide-y border rounded-theme">
            {regularItems.map((item) => (
              <div key={item.productId} className="px-3 py-2 flex justify-between text-sm">
                <div>
                  <span className="font-medium">{item.productName}</span>
                  <span className="text-text-secondary ml-1">x{item.quantity}</span>
                </div>
                <span>${(item.tierPrice * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 組合優惠明細 */}
      {comboDeals.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold mb-2">組合優惠</h4>
          <div className="divide-y border rounded-theme">
            {comboDeals.map((deal) => (
              <div key={deal.id} className="px-3 py-2 flex justify-between text-sm">
                <span className="font-medium">{deal.combo_deal_name}</span>
                <span>${deal.discounted_price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 金額摘要 */}
      <section className="border rounded-theme p-3 space-y-2">
        <h4 className="text-sm font-semibold">金額摘要</h4>

        {/* 零售原價 */}
        <div className="flex justify-between text-sm text-text-secondary">
          <span>零售原價</span>
          <span className="line-through">${calculation.retailTotal.toLocaleString()}</span>
        </div>

        {/* 會員折扣 */}
        {calculation.memberDiscount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>會員折扣</span>
            <span>-${calculation.memberDiscount.toLocaleString()}</span>
          </div>
        )}

        {/* 組合優惠折扣 */}
        {calculation.comboDiscount > 0 && (
          <div className="flex justify-between text-sm text-amber-600">
            <span>組合優惠折扣</span>
            <span>-${calculation.comboDiscount.toLocaleString()}</span>
          </div>
        )}

        {/* 優惠券折扣 */}
        {calculation.couponDiscount > 0 && (
          <div className="flex justify-between text-sm text-purple-600">
            <span>優惠券折扣</span>
            <span>-${calculation.couponDiscount.toLocaleString()}</span>
          </div>
        )}

        {/* 優惠券操作區 */}
        <div className="pt-1">
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-purple-50 rounded-theme-sm px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-purple-500" />
                <span className="text-purple-700 font-medium">
                  {appliedCoupon.coupon.code}
                </span>
                <span className="text-purple-500 text-xs">
                  ({formatDiscountDisplay(appliedCoupon.coupon)})
                </span>
              </div>
              <button
                type="button"
                onClick={() => draft.removeCoupon()}
                className="text-purple-400 hover:text-purple-600 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setCouponExpanded(!couponExpanded)}
                className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800"
              >
                <Tag className="h-4 w-4" />
                <span>套用優惠券</span>
                {couponExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {couponExpanded && (
                <div className="mt-2 border rounded-theme-sm divide-y max-h-40 overflow-y-auto">
                  {loadingCoupons ? (
                    <div className="flex justify-center py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
                    </div>
                  ) : coupons.length === 0 ? (
                    <div className="text-center text-text-secondary text-sm py-3">
                      此客戶無可用優惠券
                    </div>
                  ) : (
                    coupons.map((uc) =>
                      uc.coupon ? (
                        <button
                          key={uc.id}
                          type="button"
                          onClick={() => handleApplyCoupon(uc)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex justify-between items-center"
                        >
                          <div>
                            <span className="font-medium">{uc.coupon.code}</span>
                            <span className="text-text-secondary ml-2 text-xs">
                              {formatDiscountDisplay(uc.coupon)}
                            </span>
                          </div>
                          <span className="text-xs text-text-secondary">
                            {uc.coupon.min_order_amount
                              ? `滿$${uc.coupon.min_order_amount}`
                              : '無門檻'}
                          </span>
                        </button>
                      ) : null
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 分隔線 */}
        <hr />

        {/* 合計 */}
        <div className="flex justify-between font-semibold text-lg">
          <span>合計</span>
          <span className="text-blue-600">${grandTotal.toLocaleString()}</span>
        </div>
        <p className="text-xs text-text-secondary">運費將於訂單建立後依等級設定自動計算</p>
      </section>

      {/* 備註 */}
      <section>
        <label htmlFor="order-notes" className="text-sm font-semibold block mb-1">
          訂單備註
        </label>
        <textarea
          id="order-notes"
          value={notes}
          onChange={(e) => draft.setNotes(e.target.value)}
          placeholder="選填，最多 500 字"
          maxLength={500}
          className="w-full border rounded-theme p-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </section>

      {/* 送出按鈕 */}
      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className={cn('w-full gap-2', submitting && 'opacity-70')}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            送出中...
          </>
        ) : (
          `確認下單 $${grandTotal.toLocaleString()}`
        )}
      </Button>
    </div>
  )
}
