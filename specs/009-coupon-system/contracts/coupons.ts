/**
 * API Contract: 優惠券系統 Server Actions
 *
 * 本檔案定義優惠券系統所有 Server Actions 的 TypeScript 型別定義、
 * Zod Schema 與 ActionResult 回傳格式。
 *
 * @feature 009-coupon-system
 * @date 2026-01-06
 */

import { z } from 'zod';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * 優惠券實體型別
 */
export interface Coupon {
  id: string;
  code: string;  // 原始代碼（管理員輸入）
  code_normalized: string;  // 自動轉大寫的代碼
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  min_order_amount: number | null;
  claim_limit: number;  // 每位客戶可領取張數上限（預設 1）
  total_limit: number | null;  // 總張數上限（所有客戶合計，NULL = 無限發放）
  valid_from: string;  // ISO 8601 格式
  valid_until: string;
  status: 'active' | 'inactive' | 'deleted';
  deleted_at: string | null;
  created_at: string;
  updated_at: string;

  // 關聯資料（JOIN 查詢時包含）
  tier_restrictions?: string[];  // tier_id 陣列
  series_restrictions?: string[];  // series_id 陣列
}

/**
 * 客戶優惠券領取記錄
 */
export interface UserCoupon {
  id: string;
  user_id: string;
  coupon_id: string;
  claimed_at: string;
  used_at: string | null;
  order_id: string | null;

  // 關聯資料（JOIN 查詢時包含）
  coupon?: Coupon;
}

/**
 * 訂單優惠券快照
 */
export interface OrderCoupon {
  id: string;
  order_id: string;
  coupon_code: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  discount_amount: number;  // 實際折扣金額
  created_at: string;
}

/**
 * 優惠券折扣計算結果
 */
export interface CouponDiscountResult {
  valid: boolean;
  error?: string;
  discountAmount?: number;  // 實際折扣金額
  originalAmount?: number;  // 折扣前金額
  finalAmount?: number;  // 折扣後金額
}

/**
 * 購物車商品項目（用於優惠券計算）
 */
export interface CartItem {
  product_id: string;
  series_id: string;
  price: number;  // 客戶等級價格
  quantity: number;
}

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * 優惠券代碼驗證（4-20 字元，僅允許英數字）
 */
export const couponCodeSchema = z
  .string()
  .min(4, '優惠券代碼至少 4 個字元')
  .max(20, '優惠券代碼最多 20 個字元')
  .regex(/^[A-Za-z0-9]+$/, '優惠券代碼僅允許英數字');

/**
 * 折扣方式驗證
 */
export const discountTypeSchema = z.enum(['fixed', 'percentage']);

/**
 * 現金折扣值驗證（必須 > 0）
 */
export const fixedDiscountValueSchema = z
  .number()
  .positive('現金折扣金額必須大於 0');

/**
 * 百分比折扣值驗證（1-100）
 */
export const percentageDiscountValueSchema = z
  .number()
  .min(1, '百分比折扣最小為 1%')
  .max(100, '百分比折扣最大為 100%');

/**
 * 建立優惠券 Schema
 */
export const createCouponSchema = z.object({
  code: couponCodeSchema,
  discount_type: discountTypeSchema,
  discount_value: z.number(),
  min_order_amount: z.number().nonnegative('最低金額不可為負數').optional().nullable(),
  valid_from: z.string().datetime('生效開始時間格式錯誤'),
  valid_until: z.string().datetime('生效結束時間格式錯誤'),
  tier_restrictions: z.array(z.string().uuid()).optional().default([]),
  series_restrictions: z.array(z.string().uuid()).optional().default([]),
}).refine(
  (data) => {
    // 驗證 valid_until > valid_from
    return new Date(data.valid_until) > new Date(data.valid_from);
  },
  { message: '生效結束時間必須晚於開始時間', path: ['valid_until'] }
).refine(
  (data) => {
    // 驗證折扣值範圍
    if (data.discount_type === 'fixed') {
      return data.discount_value > 0;
    } else {
      return data.discount_value >= 1 && data.discount_value <= 100;
    }
  },
  { message: '折扣值範圍錯誤', path: ['discount_value'] }
);

/**
 * 更新優惠券 Schema
 */
export const updateCouponSchema = z.object({
  code: couponCodeSchema.optional(),
  discount_type: discountTypeSchema.optional(),
  discount_value: z.number().optional(),
  min_order_amount: z.number().nonnegative().optional().nullable(),
  valid_from: z.string().datetime().optional(),
  valid_until: z.string().datetime().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  tier_restrictions: z.array(z.string().uuid()).optional(),
  series_restrictions: z.array(z.string().uuid()).optional(),
});

/**
 * 領取優惠券 Schema
 */
export const claimCouponSchema = z.object({
  couponCode: couponCodeSchema,
});

/**
 * 驗證優惠券 Schema
 */
export const validateCouponSchema = z.object({
  couponCode: couponCodeSchema,
  cartItems: z.array(z.object({
    product_id: z.string().uuid(),
    series_id: z.string().uuid(),
    price: z.number().nonnegative(),
    quantity: z.number().positive(),
  })),
});

// ============================================================================
// Server Actions Type Definitions
// ============================================================================

/**
 * ActionResult 通用回傳格式
 */
export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; errors?: Record<string, string[]>; message: string };

/**
 * 建立優惠券
 *
 * @param input - 優惠券建立資料
 * @returns ActionResult<Coupon>
 *
 * @example
 * ```typescript
 * const result = await createCoupon({
 *   code: 'WELCOME100',
 *   discount_type: 'fixed',
 *   discount_value: 100,
 *   min_order_amount: 500,
 *   valid_from: '2026-01-01T00:00:00Z',
 *   valid_until: '2026-12-31T23:59:59Z',
 *   tier_restrictions: ['tier-id-1', 'tier-id-2'],
 *   series_restrictions: [],
 * });
 *
 * if (result.success) {
 *   console.log('優惠券建立成功:', result.data);
 * } else {
 *   console.error('優惠券建立失敗:', result.message);
 * }
 * ```
 */
export type CreateCouponAction = (
  input: z.infer<typeof createCouponSchema>
) => Promise<ActionResult<Coupon>>;

/**
 * 更新優惠券
 *
 * @param couponId - 優惠券 ID
 * @param input - 優惠券更新資料
 * @returns ActionResult<Coupon>
 *
 * @example
 * ```typescript
 * const result = await updateCoupon('coupon-id', {
 *   discount_value: 150,
 *   status: 'inactive',
 * });
 * ```
 */
export type UpdateCouponAction = (
  couponId: string,
  input: z.infer<typeof updateCouponSchema>
) => Promise<ActionResult<Coupon>>;

/**
 * 刪除優惠券（軟刪除）
 *
 * @param couponId - 優惠券 ID
 * @returns ActionResult<void>
 *
 * @example
 * ```typescript
 * const result = await deleteCoupon('coupon-id');
 *
 * if (result.success) {
 *   console.log('優惠券已刪除');
 * }
 * ```
 */
export type DeleteCouponAction = (
  couponId: string
) => Promise<ActionResult<void>>;

/**
 * 查詢所有優惠券（管理員）
 *
 * @param filters - 篩選條件
 * @returns ActionResult<Coupon[]>
 *
 * @example
 * ```typescript
 * const result = await getCoupons({
 *   status: 'active',
 *   discount_type: 'fixed',
 * });
 *
 * if (result.success) {
 *   console.log('優惠券列表:', result.data);
 * }
 * ```
 */
export type GetCouponsAction = (filters?: {
  status?: 'active' | 'inactive' | 'deleted';
  discount_type?: 'fixed' | 'percentage';
  search?: string;  // 搜尋優惠券代碼
}) => Promise<ActionResult<Coupon[]>>;

/**
 * 查詢單一優惠券詳情
 *
 * @param couponId - 優惠券 ID
 * @returns ActionResult<Coupon>
 *
 * @example
 * ```typescript
 * const result = await getCouponById('coupon-id');
 *
 * if (result.success) {
 *   console.log('優惠券詳情:', result.data);
 * }
 * ```
 */
export type GetCouponByIdAction = (
  couponId: string
) => Promise<ActionResult<Coupon>>;

/**
 * 客戶領取優惠券
 *
 * @param input - 優惠券代碼
 * @returns ActionResult<UserCoupon>
 *
 * @example
 * ```typescript
 * const result = await claimCoupon({ couponCode: 'WELCOME100' });
 *
 * if (result.success) {
 *   console.log('優惠券領取成功:', result.data);
 * } else {
 *   console.error('領取失敗:', result.message);
 *   // 錯誤訊息範例：
 *   // - '優惠券不存在或已過期'
 *   // - '您已領取過此優惠券'
 * }
 * ```
 */
export type ClaimCouponAction = (
  input: z.infer<typeof claimCouponSchema>
) => Promise<ActionResult<UserCoupon>>;

/**
 * 查詢客戶已領取的優惠券列表
 *
 * @param filters - 篩選條件
 * @returns ActionResult<UserCoupon[]>
 *
 * @example
 * ```typescript
 * const result = await getUserCoupons({ used: false });
 *
 * if (result.success) {
 *   console.log('未使用的優惠券:', result.data);
 * }
 * ```
 */
export type GetUserCouponsAction = (filters?: {
  used?: boolean;  // true: 已使用, false: 未使用
}) => Promise<ActionResult<UserCoupon[]>>;

/**
 * 驗證優惠券是否可使用（含購物車資料）
 *
 * @param input - 優惠券代碼 + 購物車商品
 * @returns ActionResult<CouponDiscountResult>
 *
 * @example
 * ```typescript
 * const result = await validateCoupon({
 *   couponCode: 'WELCOME100',
 *   cartItems: [
 *     { product_id: 'p1', series_id: 's1', price: 300, quantity: 2 },
 *     { product_id: 'p2', series_id: 's2', price: 200, quantity: 1 },
 *   ],
 * });
 *
 * if (result.success && result.data?.valid) {
 *   console.log('可使用優惠券，折扣金額:', result.data.discountAmount);
 * } else {
 *   console.error('優惠券不可使用:', result.data?.error);
 *   // 錯誤訊息範例：
 *   // - '此優惠券限批發會員使用'
 *   // - '訂單金額需滿 $500 才可使用'
 *   // - '此優惠券僅適用於水果系列商品'
 * }
 * ```
 */
export type ValidateCouponAction = (
  input: z.infer<typeof validateCouponSchema>
) => Promise<ActionResult<CouponDiscountResult>>;

/**
 * 計算優惠券折扣（伺服器端工具函式）
 *
 * @param params - 優惠券 + 購物車 + 客戶等級
 * @returns CouponDiscountResult
 *
 * @internal 此函式供 Server Actions 內部使用，不直接暴露給前端
 *
 * @example
 * ```typescript
 * const result = calculateCouponDiscount({
 *   coupon,
 *   cartItems,
 *   userTierId: 'tier-id',
 * });
 *
 * if (result.valid) {
 *   console.log('折扣金額:', result.discountAmount);
 * }
 * ```
 */
export type CalculateCouponDiscountFunction = (params: {
  coupon: Coupon;
  cartItems: CartItem[];
  userTierId: string;
}) => CouponDiscountResult;

/**
 * 查詢優惠券使用統計（管理員）
 *
 * @param couponId - 優惠券 ID
 * @returns ActionResult<CouponStats>
 *
 * @example
 * ```typescript
 * const result = await getCouponStats('coupon-id');
 *
 * if (result.success) {
 *   console.log('領取數:', result.data.claimCount);
 *   console.log('使用數:', result.data.usedCount);
 * }
 * ```
 */
export interface CouponStats {
  claimCount: number;  // 領取次數
  usedCount: number;  // 使用次數
  totalDiscountAmount: number;  // 總折扣金額
}

export type GetCouponStatsAction = (
  couponId: string
) => Promise<ActionResult<CouponStats>>;

// ============================================================================
// Error Messages
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
  DELETE_CONFIRM: (count: number) => `此操作將刪除 ${count} 位客戶已領取的優惠券，是否繼續?`,
} as const;

// ============================================================================
// Success Messages
// ============================================================================

/**
 * 優惠券系統成功訊息常量
 */
export const COUPON_SUCCESS_MESSAGES = {
  CREATED: '優惠券建立成功',
  UPDATED: '優惠券更新成功',
  DELETED: '優惠券已刪除',
  CLAIMED: '優惠券領取成功',
  VALID: '優惠券可使用',
} as const;
