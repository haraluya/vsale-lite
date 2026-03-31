/**
 * 統一訂單金額計算模組
 *
 * 所有金額計算的唯一來源，前後端共用。
 * 規則：
 * - 原價 = 零售價（retail_price）
 * - 優惠券折扣基數 = 僅普通商品等級價
 * - 組合優惠與優惠券完全獨立
 * - 運費基數 = 普通商品等級價 + 組合優惠折後價
 * - 全部使用 Math.round() 整數精度
 */

export interface RegularItemInput {
  retailPrice: number
  tierPrice: number
  quantity: number
  seriesId?: string
}

export interface ComboDealInput {
  name: string
  retailTotal: number
  originalPrice: number
  discountedPrice: number
  discountAmount: number
}

export interface CouponInput {
  code: string
  discountType: 'fixed' | 'percentage'
  discountValue: number
  minOrderAmount?: number | null
  seriesRestrictions?: string[]
}

export interface OrderCalculationResult {
  retailTotal: number
  memberDiscount: number
  comboDiscount: number
  couponDiscount: number
  couponEligibleAmount: number
  shippingSubtotal: number
  discountDetails: DiscountDetail[]
}

export interface DiscountDetail {
  label: string
  amount: number
  type: 'combo' | 'coupon'
}

export function calculateOrderAmounts(input: {
  regularItems: RegularItemInput[]
  comboDeals: ComboDealInput[]
  coupon?: CouponInput | null
}): OrderCalculationResult {
  const { regularItems, comboDeals, coupon } = input

  const regularRetailTotal = regularItems.reduce(
    (sum, item) => sum + item.retailPrice * item.quantity, 0
  )
  const regularTierTotal = regularItems.reduce(
    (sum, item) => sum + item.tierPrice * item.quantity, 0
  )

  const comboRetailTotal = comboDeals.reduce(
    (sum, deal) => sum + deal.retailTotal, 0
  )
  const comboOriginalTotal = comboDeals.reduce(
    (sum, deal) => sum + deal.originalPrice, 0
  )
  const comboDiscountedTotal = comboDeals.reduce(
    (sum, deal) => sum + deal.discountedPrice, 0
  )
  const comboDiscountTotal = comboDeals.reduce(
    (sum, deal) => sum + deal.discountAmount, 0
  )

  const retailTotal = Math.round(regularRetailTotal + comboRetailTotal)
  const memberDiscount = Math.round(
    (regularRetailTotal - regularTierTotal) + (comboRetailTotal - comboOriginalTotal)
  )

  let couponEligibleAmount = regularTierTotal
  if (coupon?.seriesRestrictions && coupon.seriesRestrictions.length > 0) {
    couponEligibleAmount = regularItems
      .filter(item => item.seriesId && coupon.seriesRestrictions!.includes(item.seriesId))
      .reduce((sum, item) => sum + item.tierPrice * item.quantity, 0)
  }
  couponEligibleAmount = Math.round(couponEligibleAmount)

  let couponDiscount = 0
  if (coupon && couponEligibleAmount > 0) {
    if (coupon.minOrderAmount && couponEligibleAmount < coupon.minOrderAmount) {
      couponDiscount = 0
    } else if (coupon.discountType === 'fixed') {
      couponDiscount = Math.min(coupon.discountValue, couponEligibleAmount)
    } else if (coupon.discountType === 'percentage') {
      couponDiscount = Math.round(couponEligibleAmount * coupon.discountValue / 100)
    }
    couponDiscount = Math.max(0, Math.min(couponDiscount, couponEligibleAmount))
  }

  const shippingSubtotal = Math.round(regularTierTotal + comboDiscountedTotal)

  const discountDetails: DiscountDetail[] = []
  for (const deal of comboDeals) {
    if (deal.discountAmount > 0) {
      discountDetails.push({
        label: `🔥 ${deal.name}`,
        amount: Math.round(deal.discountAmount),
        type: 'combo',
      })
    }
  }
  if (coupon && couponDiscount > 0) {
    discountDetails.push({
      label: `🏷️ ${coupon.code}`,
      amount: couponDiscount,
      type: 'coupon',
    })
  }

  return {
    retailTotal,
    memberDiscount: Math.round(memberDiscount),
    comboDiscount: Math.round(comboDiscountTotal),
    couponDiscount,
    couponEligibleAmount,
    shippingSubtotal,
    discountDetails,
  }
}

export function calculateGrandTotal(
  result: OrderCalculationResult,
  shippingFee: number
): number {
  return result.retailTotal - result.memberDiscount - result.comboDiscount - result.couponDiscount + shippingFee
}
