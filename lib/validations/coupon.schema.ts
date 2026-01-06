/**
 * Zod 驗證 Schema：優惠券系統
 *
 * @feature 009-coupon-system
 * @date 2026-01-07
 */

import { z } from 'zod'

// ============================================================================
// 基礎驗證 Schema
// ============================================================================

/**
 * 優惠券代碼驗證（4-20 字元，僅允許英數字）
 */
export const couponCodeSchema = z
  .string()
  .min(4, '優惠券代碼至少 4 個字元')
  .max(20, '優惠券代碼最多 20 個字元')
  .regex(/^[A-Za-z0-9]+$/, '優惠券代碼僅允許英數字')

/**
 * 折扣方式驗證
 */
export const discountTypeSchema = z.enum(['fixed', 'percentage'])

/**
 * 現金折扣值驗證（必須 > 0）
 */
export const fixedDiscountValueSchema = z
  .number()
  .positive('現金折扣金額必須大於 0')

/**
 * 百分比折扣值驗證（1-100）
 */
export const percentageDiscountValueSchema = z
  .number()
  .min(1, '百分比折扣最小為 1%')
  .max(100, '百分比折扣最大為 100%')

// ============================================================================
// Server Actions 輸入驗證 Schema
// ============================================================================

/**
 * 建立優惠券 Schema
 *
 * @example
 * ```typescript
 * const validation = createCouponSchema.safeParse({
 *   code: 'WELCOME100',
 *   discount_type: 'fixed',
 *   discount_value: 100,
 *   min_order_amount: 500,
 *   valid_from: '2026-01-01T00:00:00Z',
 *   valid_until: '2026-12-31T23:59:59Z',
 *   tier_restrictions: ['tier-id-1'],
 *   series_restrictions: [],
 * });
 * ```
 */
export const createCouponSchema = z
  .object({
    code: couponCodeSchema,
    discount_type: discountTypeSchema,
    discount_value: z.number(),
    min_order_amount: z
      .number()
      .nonnegative('最低金額不可為負數')
      .optional()
      .nullable(),
    claim_limit: z
      .number()
      .int('領取張數必須為整數')
      .min(1, '每位客戶至少可領取 1 張')
      .max(99, '每位客戶最多可領取 99 張')
      .optional()
      .default(1),
    valid_from: z.string().datetime('生效開始時間格式錯誤'),
    valid_until: z.string().datetime('生效結束時間格式錯誤'),
    tier_restrictions: z.array(z.string().uuid()).optional().default([]),
    series_restrictions: z.array(z.string().uuid()).optional().default([]),
  })
  .refine(
    (data) => {
      // 驗證 valid_until > valid_from
      return new Date(data.valid_until) > new Date(data.valid_from)
    },
    { message: '生效結束時間必須晚於開始時間', path: ['valid_until'] }
  )
  .refine(
    (data) => {
      // 驗證折扣值範圍
      if (data.discount_type === 'fixed') {
        return data.discount_value > 0
      } else {
        return data.discount_value >= 1 && data.discount_value <= 100
      }
    },
    { message: '折扣值範圍錯誤', path: ['discount_value'] }
  )

/**
 * 更新優惠券 Schema
 *
 * @example
 * ```typescript
 * const validation = updateCouponSchema.safeParse({
 *   discount_value: 150,
 *   status: 'inactive',
 * });
 * ```
 */
export const updateCouponSchema = z.object({
  code: couponCodeSchema.optional(),
  discount_type: discountTypeSchema.optional(),
  discount_value: z.number().optional(),
  min_order_amount: z.number().nonnegative().optional().nullable(),
  claim_limit: z
    .number()
    .int('領取張數必須為整數')
    .min(1, '每位客戶至少可領取 1 張')
    .max(99, '每位客戶最多可領取 99 張')
    .optional(),
  valid_from: z.string().datetime().optional(),
  valid_until: z.string().datetime().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  tier_restrictions: z.array(z.string().uuid()).optional(),
  series_restrictions: z.array(z.string().uuid()).optional(),
})

/**
 * 領取優惠券 Schema
 *
 * @example
 * ```typescript
 * const validation = claimCouponSchema.safeParse({
 *   couponCode: 'WELCOME100',
 * });
 * ```
 */
export const claimCouponSchema = z.object({
  couponCode: couponCodeSchema,
})

/**
 * 驗證優惠券 Schema (含購物車資料)
 *
 * @example
 * ```typescript
 * const validation = validateCouponSchema.safeParse({
 *   couponCode: 'WELCOME100',
 *   cartItems: [
 *     { product_id: 'p1', series_id: 's1', price: 300, quantity: 2 },
 *   ],
 * });
 * ```
 */
export const validateCouponSchema = z.object({
  couponCode: couponCodeSchema,
  cartItems: z.array(
    z.object({
      product_id: z.string().uuid(),
      series_id: z.string().uuid(),
      price: z.number().nonnegative(),
      quantity: z.number().positive(),
    })
  ),
})

// ============================================================================
// 錯誤訊息常量
// ============================================================================

/**
 * 優惠券系統錯誤訊息常量
 */
export const COUPON_ERROR_MESSAGES = {
  // 權限錯誤
  PERMISSION_DENIED: '權限不足',

  // 優惠券不存在
  COUPON_NOT_FOUND: '優惠券不存在',
  COUPON_EXPIRED: '優惠券已過期',
  COUPON_NOT_ACTIVE: '優惠券未啟用',

  // 領取錯誤
  ALREADY_CLAIMED: '您已領取過此優惠券',
  CLAIM_FAILED: '優惠券領取失敗',

  // 使用條件錯誤
  TIER_RESTRICTION_FAILED: '此優惠券限特定會員等級使用',
  MIN_AMOUNT_NOT_MET: (amount: number) => `訂單金額需滿 $${amount} 才可使用`,
  SERIES_RESTRICTION_FAILED: '此優惠券僅適用於特定系列商品',

  // 建立/更新錯誤
  DUPLICATE_CODE: '優惠券代碼已存在',
  INVALID_DATE_RANGE: '生效結束時間必須晚於開始時間',
  INVALID_DISCOUNT_VALUE: '折扣值範圍錯誤',

  // 刪除錯誤
  DELETE_CONFIRM: (count: number) =>
    `此操作將刪除 ${count} 位客戶已領取的優惠券，是否繼續?`,
} as const

/**
 * 優惠券系統成功訊息常量
 */
export const COUPON_SUCCESS_MESSAGES = {
  CREATED: '優惠券建立成功',
  UPDATED: '優惠券更新成功',
  DELETED: '優惠券已刪除',
  CLAIMED: '優惠券領取成功',
  VALID: '優惠券可使用',
} as const
