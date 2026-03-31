'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Tag, Trash2, ChevronDown, ChevronUp, Minus, Plus, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  const [submitting, setSubmitting] = useState(false)
  const [coupons, setCoupons] = useState<UserCoupon[]>([])
  const [loadingCoupons, setLoadingCoupons] = useState(false)
  const [couponExpanded, setCouponExpanded] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)

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
      setCouponError(result.error || '優惠券不適用')
      return
    }

    setCouponError(null)
    draft.applyCoupon({
      userCouponId: userCoupon.id,
      coupon: userCoupon.coupon,
      discountAmount: result.discountAmount ?? 0,
    })
    setCouponExpanded(false)
  }, [regularItems, selectedCustomer, draft])

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
        setSubmitResult({ type: 'success', message: `訂單 ${result.data?.orderNumber || ''} 已建立` })
        setTimeout(() => onOrderCreated(), 1500)
      } else {
        const errorDetail = result.errors ? `\n${JSON.stringify(result.errors)}` : ''
        console.error('代客下單失敗:', result.message, result.errors)
        setSubmitResult({ type: 'error', message: (result.message || '建立訂單時發生錯誤') + errorDetail })
        setSubmitting(false)
      }
    } catch (err) {
      console.error('代客下單例外:', err)
      setSubmitResult({ type: 'error', message: '建立訂單時發生未預期的錯誤' })
      setSubmitting(false)
    }
  }

  if (!selectedCustomer) return null

  if (!calculation) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Package className="h-12 w-12 text-text-secondary opacity-40" />
        <p className="text-sm text-text-secondary">尚未選擇任何商品</p>
        <Button variant="outline" onClick={() => draft.setCurrentStep(2)}>
          返回選擇商品
        </Button>
      </div>
    )
  }

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
              <div key={item.productId} className="px-3 py-2 flex items-center justify-between text-sm">
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{item.productName}</span>
                </div>
                {/* 數量調整 */}
                <div className="flex items-center gap-1.5 mx-2">
                  <button
                    className="h-6 w-6 flex items-center justify-center rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    onClick={() => draft.updateRegularItemQuantity(item.productId, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0
                      if (val > 0) draft.updateRegularItemQuantity(item.productId, val)
                    }}
                    className="w-10 text-center text-sm border rounded px-1 py-0.5"
                    min={1}
                  />
                  <button
                    className="h-6 w-6 flex items-center justify-center rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    onClick={() => draft.updateRegularItemQuantity(item.productId, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                {/* 單價（可編輯） */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-text-secondary">$</span>
                  <input
                    type="number"
                    value={item.tierPrice}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val) && val >= 0) {
                        draft.updateRegularItemPrice(item.productId, val)
                      }
                    }}
                    className="w-16 text-right text-sm border rounded px-1 py-0.5"
                    min={0}
                  />
                </div>
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
              {couponError && (
                <div className="mt-2 text-xs text-red-500 bg-red-50 rounded-theme-sm px-3 py-2">
                  {couponError}
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

      {/* 送出結果訊息 */}
      {submitResult && (
        <div className={cn(
          'rounded-theme-sm px-4 py-3 text-sm',
          submitResult.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        )}>
          {submitResult.message}
        </div>
      )}

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
