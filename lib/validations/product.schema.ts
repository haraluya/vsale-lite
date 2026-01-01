/**
 * Product Validation Schemas
 * Feature: 002-product-management
 */

import { z } from 'zod'

/**
 * 商品編號格式驗證
 * - 僅允許英數字、連字號、底線
 * - 範例: A001, DRINK-001, SKU_12345
 */
const productCodeRegex = /^[A-Za-z0-9-_]+$/

/**
 * 建立商品驗證 Schema
 */
export const createProductSchema = z.object({
  code: z.string()
    .min(1, '商品編號不可為空')
    .max(50, '商品編號最多 50 字元')
    .regex(productCodeRegex, '商品編號僅可包含英數字、連字號、底線'),
  name: z.string()
    .min(1, '商品名稱不可為空')
    .max(200, '商品名稱最多 200 字元'),
  category_id: z.string()
    .uuid('請選擇商品分類'),
  description: z.string()
    .max(1000, '描述最多 1000 字')
    .optional()
    .or(z.literal('')),
  stock: z.coerce.number()
    .int('庫存必須為整數')
    .default(0),
  unit: z.string()
    .min(1, '單位不可為空')
    .max(20, '單位最多 20 字元')
    .default('件'),
  status: z.enum(['active', 'inactive'])
    .default('active'),
})

/**
 * 更新商品驗證 Schema
 * 注意: code 欄位不可修改 (建立後不可變更)
 */
export const updateProductSchema = z.object({
  name: z.string()
    .min(1, '商品名稱不可為空')
    .max(200, '商品名稱最多 200 字元')
    .optional(),
  category_id: z.string()
    .uuid('請選擇商品分類')
    .optional(),
  description: z.string()
    .max(1000, '描述最多 1000 字')
    .optional()
    .or(z.literal('')),
  stock: z.coerce.number()
    .int('庫存必須為整數')
    .optional(),
  unit: z.string()
    .min(1, '單位不可為空')
    .max(20, '單位最多 20 字元')
    .optional(),
  status: z.enum(['active', 'inactive'])
    .optional(),
})

/**
 * 圖片上傳驗證
 */
export const productImageSchema = z.object({
  productId: z.string().uuid('無效的商品 ID'),
  file: z.instanceof(File, { message: '請選擇圖片檔案' }),
})

/**
 * 圖片格式與大小驗證 (客戶端使用)
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validFormats = ['image/jpeg', 'image/png', 'image/webp']
  const maxSize = 5 * 1024 * 1024 // 5MB

  if (!validFormats.includes(file.type)) {
    return {
      valid: false,
      error: '僅支援 JPG, PNG, WebP 格式',
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: '檔案大小不可超過 5MB',
    }
  }

  return { valid: true }
}
