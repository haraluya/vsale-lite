/**
 * Product Validation Schemas
 * Feature: 002-product-management & 003-series-and-pricing
 */

import { z } from 'zod'

/**
 * 商品編號格式驗證
 * - Feature 003: 改為自動產生,格式為 {分類代碼}-{流水號} (如 DRK-0001)
 * - 範例: DRK-0001, SNK-0042
 */
const productCodeRegex = /^[A-Z]{3,10}-\d{4}$/

/**
 * 建立商品驗證 Schema
 * Feature 003 修改: 改用 series_id, 新增 retail_price 與 stock_status
 */
export const createProductSchema = z.object({
  series_id: z.string()
    .uuid('請選擇系列'),  // 🔄 Feature 003: 改為系列 ID (取代 category_id)
  name: z.string()
    .min(1, '商品名稱不可為空')
    .max(200, '商品名稱最多 200 字元'),
  description: z.string()
    .max(1000, '描述最多 1000 字')
    .optional()
    .or(z.literal('')),
  retail_price: z.coerce.number()
    .min(0, '零售價格不可為負數'),  // 🆕 Feature 003 Enhancement: 零售價格改為必填
  stock: z.coerce.number()
    .int('庫存必須為整數')
    .default(0),  // 支援負庫存 (憲章 VI)
  stock_status: z.enum(['sufficient', 'low', 'out_of_stock'])
    .default('sufficient'),  // 🆕 Feature 003: 庫存狀態
  unit: z.string()
    .min(1, '單位不可為空')
    .max(20, '單位最多 20 字元')
    .default('件'),
  status: z.enum(['active', 'inactive'])
    .default('active'),
  // 🔄 Feature 003: code 欄位移除,改為自動產生
})

/**
 * 更新商品驗證 Schema
 * 注意: code 欄位不可修改 (建立後不可變更)
 * Feature 003 修改: 改用 series_id, 新增 retail_price 與 stock_status
 */
export const updateProductSchema = z.object({
  series_id: z.string()
    .uuid('請選擇系列')
    .optional(),  // 🔄 Feature 003: 改為系列 ID (取代 category_id)
  name: z.string()
    .min(1, '商品名稱不可為空')
    .max(200, '商品名稱最多 200 字元')
    .optional(),
  description: z.string()
    .max(1000, '描述最多 1000 字')
    .optional()
    .or(z.literal('')),
  retail_price: z.coerce.number()
    .min(0, '原價不可為負數')
    .nullable()
    .optional(),  // 🆕 Feature 003: 原價/建議售價
  stock: z.coerce.number()
    .int('庫存必須為整數')
    .optional(),  // 支援負庫存 (憲章 VI)
  stock_status: z.enum(['sufficient', 'low', 'out_of_stock'])
    .optional(),  // 🆕 Feature 003: 庫存狀態
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

/**
 * 批次編輯商品驗證 Schema
 * Feature: 016-product-management-enhancements (Phase 3)
 */
export const batchUpdateProductsSchema = z.object({
  products: z
    .array(
      z.object({
        id: z.string().uuid('無效的商品 ID'),
        name: z
          .string()
          .min(1, '商品名稱不可為空')
          .max(200, '商品名稱最多 200 字元')
          .optional(),
        stock: z.coerce
          .number()
          .int('庫存必須為整數')
          .optional(), // 支援負庫存
        retail_price: z.coerce
          .number()
          .min(0, '零售價格不可為負數')
          .nullable()
          .optional(),
        unit: z
          .string()
          .min(1, '單位不可為空')
          .max(20, '單位最多 20 字元')
          .optional(),
      })
    )
    .min(1, '至少需要一個商品')
    .max(50, '單次最多修改 50 個商品'),
})
