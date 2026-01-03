import { z } from 'zod'

/**
 * 購物車驗證 Schema
 * Feature: 004-cart-and-orders
 */

// 加入購物車項目
export const addToCartSchema = z.object({
  productId: z.string().uuid('無效的商品 ID'),
  quantity: z.number()
    .int('數量必須為整數')
    .positive('數量必須大於 0')
    .max(9999, '單項商品數量不得超過 9999'),
})

// 更新購物車項目數量
export const updateCartItemSchema = z.object({
  productId: z.string().uuid('無效的商品 ID'),
  quantity: z.number()
    .int('數量必須為整數')
    .positive('數量必須大於 0')
    .max(9999, '單項商品數量不得超過 9999'),
})

// 購物車項目陣列 (下單時驗證)
export const cartItemsSchema = z.array(
  z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })
).min(1, '購物車不能為空')
  .max(100, '購物車項目不得超過 100 項')

// 型別推導
export type AddToCartInput = z.infer<typeof addToCartSchema>
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>
export type CartItemsInput = z.infer<typeof cartItemsSchema>
