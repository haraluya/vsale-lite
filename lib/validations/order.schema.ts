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

// 型別推導
export type OrderStatusInput = z.infer<typeof orderStatusSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>
export type GetOrdersInput = z.infer<typeof getOrdersSchema>
