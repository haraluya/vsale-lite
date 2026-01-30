/**
 * 優惠券系統工具函式
 *
 * 提供優惠券折扣計算與條件驗證邏輯
 *
 * @feature 009-coupon-system
 * @date 2026-01-07
 */

import type {
  Coupon,
  CouponDiscountResult,
} from '@/types'

/**
 * 購物車商品項目（用於優惠券計算）
 */
export interface CartItemForCoupon {
  product_id: string
  series_id: string
  price: number // 客戶等級價格
  quantity: number
}

/**
 * 計算優惠券折扣
 *
 * @param params - 優惠券 + 購物車 + 客戶等級 + 組合優惠金額
 * @returns CouponDiscountResult
 *
 * @feature 021-combo-deals: 支援組合優惠金額計算
 *
 * @example
 * ```typescript
 * const result = calculateCouponDiscount({
 *   coupon,
 *   cartItems,
 *   userTierId: 'tier-id',
 *   comboDealsTotal: 250, // 組合優惠優惠後總價
 * });
 *
 * if (result.valid) {
 *   console.log('折扣金額:', result.discountAmount);
 * }
 * ```
 */
export function calculateCouponDiscount(params: {
  coupon: Coupon
  cartItems: CartItemForCoupon[]
  userTierId: string
  comboDealsTotal?: number // 🆕 組合優惠優惠後總價（預設 0）
}): CouponDiscountResult {
  const { coupon, cartItems, userTierId, comboDealsTotal = 0 } = params

  // 1. 驗證等級限制
  if (
    coupon.tier_restrictions &&
    coupon.tier_restrictions.length > 0 &&
    !coupon.tier_restrictions.includes(userTierId)
  ) {
    return {
      valid: false,
      error: '此優惠券限特定會員等級使用',
    }
  }

  // 2. 計算適用商品總額（考慮系列限制與組合優惠）
  let eligibleAmount = 0

  if (coupon.series_restrictions && coupon.series_restrictions.length > 0) {
    // 🆕 有系列限制：僅計算限定系列商品，組合優惠不計入
    // 理由：系列限制與組合優惠互斥（根據業務規則）
    eligibleAmount = cartItems
      .filter((item) => coupon.series_restrictions!.includes(item.series_id))
      .reduce((sum, item) => sum + item.price * item.quantity, 0)
  } else {
    // 🆕 無系列限制：計算全部商品 + 組合優惠
    // 理由：優惠券折扣應用於總金額（包含組合優惠優惠後價格）
    const cartTotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )
    eligibleAmount = cartTotal + comboDealsTotal
  }

  // 3. 驗證最低金額
  if (coupon.min_order_amount && eligibleAmount < coupon.min_order_amount) {
    return {
      valid: false,
      error: `訂單金額需滿 $${coupon.min_order_amount} 才可使用`,
    }
  }

  // 4. 計算折扣金額
  let discountAmount = 0

  if (coupon.discount_type === 'fixed') {
    // 現金折扣：取折扣值與適用金額的較小值（避免折扣超過總額）
    discountAmount = Math.min(coupon.discount_value, eligibleAmount)
  } else if (coupon.discount_type === 'percentage') {
    // 百分比折扣：適用金額 × 折扣百分比
    discountAmount = eligibleAmount * (coupon.discount_value / 100)
  }

  // 5. 確保折扣金額不為負數且不超過總額
  discountAmount = Math.max(0, Math.min(discountAmount, eligibleAmount))

  return {
    valid: true,
    discountAmount: Math.round(discountAmount * 100) / 100, // 四捨五入到小數點後 2 位
    originalAmount: Math.round(eligibleAmount * 100) / 100,
    finalAmount: Math.round((eligibleAmount - discountAmount) * 100) / 100,
  }
}

/**
 * 驗證優惠券使用條件（不含折扣計算）
 *
 * @param params - 優惠券 + 購物車 + 客戶等級 + 組合優惠金額
 * @returns 驗證結果（僅 valid/error）
 *
 * @feature 021-combo-deals: 支援組合優惠金額
 *
 * @example
 * ```typescript
 * const result = validateCouponConditions({
 *   coupon,
 *   cartItems,
 *   userTierId: 'tier-id',
 *   comboDealsTotal: 250,
 * });
 *
 * if (!result.valid) {
 *   console.error('優惠券不可使用:', result.error);
 * }
 * ```
 */
export function validateCouponConditions(params: {
  coupon: Coupon
  cartItems: CartItemForCoupon[]
  userTierId: string
  comboDealsTotal?: number // 🆕 組合優惠優惠後總價
}): Pick<CouponDiscountResult, 'valid' | 'error'> {
  const result = calculateCouponDiscount(params)
  return {
    valid: result.valid,
    error: result.error,
  }
}

/**
 * 格式化優惠券代碼（轉大寫）
 *
 * @param code - 原始優惠券代碼
 * @returns 大寫優惠券代碼
 */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase()
}

/**
 * 檢查優惠券是否已過期
 *
 * @param coupon - 優惠券物件
 * @returns true: 已過期, false: 未過期
 */
export function isCouponExpired(coupon: Coupon): boolean {
  const now = new Date()
  const validUntil = new Date(coupon.valid_until)
  return now > validUntil
}

/**
 * 檢查優惠券是否尚未生效
 *
 * @param coupon - 優惠券物件
 * @returns true: 尚未生效, false: 已生效
 */
export function isCouponNotStarted(coupon: Coupon): boolean {
  const now = new Date()
  const validFrom = new Date(coupon.valid_from)
  return now < validFrom
}

/**
 * 檢查優惠券是否在有效期內
 *
 * @param coupon - 優惠券物件
 * @returns true: 有效期內, false: 無效
 */
export function isCouponValid(coupon: Coupon): boolean {
  return (
    coupon.status === 'active' &&
    !isCouponExpired(coupon) &&
    !isCouponNotStarted(coupon)
  )
}

/**
 * 格式化折扣顯示文字
 *
 * @param coupon - 優惠券物件
 * @returns 折扣顯示文字（如「現金折扣 $100」或「折扣 20%」）
 *
 * @example
 * ```typescript
 * formatDiscountDisplay(coupon) // "現金折扣 $100" 或 "折扣 20%"
 * ```
 */
export function formatDiscountDisplay(coupon: Coupon): string {
  if (coupon.discount_type === 'fixed') {
    return `現金折扣 $${coupon.discount_value}`
  } else {
    return `折扣 ${coupon.discount_value}%`
  }
}

/**
 * 格式化最低金額限制顯示文字
 *
 * @param coupon - 優惠券物件
 * @returns 最低金額限制文字（如「滿 $500 可用」或「無金額限制」）
 */
export function formatMinAmountDisplay(coupon: Coupon): string {
  if (coupon.min_order_amount) {
    return `滿 $${coupon.min_order_amount} 可用`
  } else {
    return '無金額限制'
  }
}
