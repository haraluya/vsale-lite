import { z } from 'zod'

/**
 * 訂單驗證 Schema
 * Feature: 004-cart-and-orders
 */

// 訂單狀態列舉
// Feature 011: 移除 'confirmed' 狀態，簡化訂單流程
export const orderStatusSchema = z.enum([
  'pending',
  'shipping',
  'completed',
  'cancelled',
])

// 建立訂單
// Feature 021: 新增組合優惠項目支援 (Phase 7 - T064)
export const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid('無效的商品 ID'),
      quantity: z.number()
        .int('數量必須為整數')
        .positive('數量必須大於 0'),
    })
  ).max(50, '單筆訂單商品項目不得超過 50 項')
    .default([]), // 🆕 改為非必填，允許空陣列（當只有組合優惠時）

  // 🆕 Feature 021: 組合優惠項目
  comboDealItems: z.array(
    z.object({
      comboDealId: z.string().uuid('無效的組合優惠 ID'),
      comboDealName: z.string().min(1, '組合優惠名稱不得為空'),
      selectedProducts: z.array(
        z.object({
          product_id: z.string().uuid('無效的商品 ID'),
          series_id: z.string().uuid('無效的系列 ID'),
          quantity: z.number()
            .int('數量必須為整數')
            .positive('數量必須大於 0'),
        })
      ).min(1, '組合優惠至少需要一個商品'),
      originalPrice: z.number().nonnegative('原價不得為負數'),
      discountedPrice: z.number().nonnegative('優惠價不得為負數'),
      discountAmount: z.number().nonnegative('折扣金額不得為負數'),
    })
  ).max(10, '單筆訂單組合優惠不得超過 10 項')
    .default([]), // 預設為空陣列

  notes: z.string()
    .max(500, '備註不得超過 500 字')
    .optional()
    .nullable(),

  // Feature 009: 優惠券系統
  userCouponId: z.string().uuid('無效的優惠券 ID')
    .optional()
    .nullable(),

  // 代客下單：目標客戶 ID（管理員專用）
  onBehalfOfUserId: z.string().uuid('無效的客戶 ID')
    .optional()
    .nullable(),
}).refine(
  // 🆕 確保至少有一般商品或組合優惠項目
  (data) => data.items.length > 0 || data.comboDealItems.length > 0,
  {
    message: '訂單至少需要一個商品或組合優惠',
    path: ['items'],
  }
)

// 更新訂單狀態
// Feature 011: 僅允許特定狀態轉換 (shipping→completed)
export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid('無效的訂單 ID'),
  newStatus: z.enum(['shipping', 'completed'], {
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
      series_name: z.string().nullable().optional(),  // 🆕 系列名稱（用於時間軸顯示）
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

  notes: z.object({
    old_notes: z.string().nullable(),
    new_notes: z.string().max(500, '備註不可超過 500 字').nullable(),
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
