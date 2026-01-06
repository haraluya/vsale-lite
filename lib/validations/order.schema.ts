import { z } from 'zod'

/**
 * 訂單驗證 Schema
 * Feature: 004-cart-and-orders
 */

// 訂單狀態列舉
export const orderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'shipping',
  'completed',
  'cancelled',
])

// 建立訂單
export const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid('無效的商品 ID'),
      quantity: z.number()
        .int('數量必須為整數')
        .positive('數量必須大於 0'),
    })
  ).min(1, '訂單至少需要一個商品')
    .max(50, '單筆訂單商品項目不得超過 50 項'),

  notes: z.string()
    .max(500, '備註不得超過 500 字')
    .optional()
    .nullable(),

  // Feature 009: 優惠券系統
  userCouponId: z.string().uuid('無效的優惠券 ID')
    .optional()
    .nullable(),
})

// 更新訂單狀態
export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid('無效的訂單 ID'),
  newStatus: z.enum(['confirmed', 'shipping', 'completed'], {
    message: '無效的訂單狀態',
  }),
})

// 取消訂單
export const cancelOrderSchema = z.object({
  orderId: z.string().uuid('無效的訂單 ID'),
})

// 查詢訂單列表
export const getOrdersSchema = z.object({
  status: orderStatusSchema.optional(),
  search: z.string()
    .max(100, '搜尋關鍵字不得超過 100 字')
    .optional(),
  page: z.number()
    .int('頁碼必須為整數')
    .positive('頁碼必須大於 0')
    .default(1),
  limit: z.number()
    .int('每頁筆數必須為整數')
    .positive('每頁筆數必須大於 0')
    .max(100, '每頁筆數不得超過 100')
    .default(20),
}).optional()

// 新增訂單留言 (Feature 007)
export const addOrderCommentSchema = z.object({
  orderId: z.string().uuid('無效的訂單 ID'),
  content: z.string()
    .min(1, '留言內容不得為空')
    .max(500, '留言內容不得超過 500 字'),
})

// 新增自訂費用 (Feature 011)
export const orderCustomFeeSchema = z.object({
  orderId: z.string().uuid('無效的訂單 ID'),
  fee_name: z.string()
    .min(1, '費用名稱不得為空')
    .max(50, '費用名稱不得超過 50 字'),
  amount: z.number()
    .refine((val) => val !== 0, '費用金額不可為 0'),  // 可為正數（收費）或負數（減免）
})

// 訂單修改資料結構 (Feature 011)
export const orderModificationsSchema = z.object({
  items: z.array(
    z.object({
      type: z.enum(['price_changed', 'quantity_changed', 'removed', 'added']),
      item_id: z.string().uuid().optional(),  // 修改/移除時必填
      product_id: z.string().uuid().optional(),  // 新增時必填
      product_name: z.string().optional(),
      old_price: z.number().optional(),
      new_price: z.number().positive('單價必須大於 0').optional(),
      old_quantity: z.number().optional(),
      new_quantity: z.number().positive('數量必須大於 0').optional(),
    })
  ).optional(),

  fees: z.array(
    z.object({
      type: z.enum(['added', 'removed']),
      fee_id: z.string().uuid().optional(),  // 移除時必填
      fee_name: z.string().min(1).max(50).optional(),  // 新增時必填
      amount: z.number().optional(),
    })
  ).optional(),

  shipping: z.object({
    old_fee: z.number().min(0),
    new_fee: z.number().min(0, '運費不可為負數'),
  }).optional(),

  coupon: z.object({
    action: z.enum(['kept', 'removed']),
  }).optional(),
})

// 型別推導
export type OrderStatusInput = z.infer<typeof orderStatusSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>
export type GetOrdersInput = z.infer<typeof getOrdersSchema>
export type AddOrderCommentInput = z.infer<typeof addOrderCommentSchema>
export type OrderCustomFeeInput = z.infer<typeof orderCustomFeeSchema>
export type OrderModificationsInput = z.infer<typeof orderModificationsSchema>
