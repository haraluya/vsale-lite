/**
 * Category Validation Schemas
 * Feature: 002-product-management
 */

import { z } from 'zod'

/**
 * 建立分類驗證 Schema
 */
export const createCategorySchema = z.object({
  name: z.string()
    .min(1, '分類名稱不可為空')
    .max(50, '分類名稱最多 50 字'),
  code: z.string()
    .min(3, '分類代碼至少 3 個字元')
    .max(10, '分類代碼最多 10 個字元')
    .regex(/^[A-Z]{3,10}$/, '分類代碼必須為 3-10 個大寫英文字母'),
  description: z.string()
    .max(500, '描述最多 500 字')
    .optional()
    .or(z.literal('')),
})

/**
 * 更新分類驗證 Schema
 */
export const updateCategorySchema = z.object({
  name: z.string()
    .min(1, '分類名稱不可為空')
    .max(50, '分類名稱最多 50 字')
    .optional(),
  code: z.string()
    .min(3, '分類代碼至少 3 個字元')
    .max(10, '分類代碼最多 10 個字元')
    .regex(/^[A-Z]{3,10}$/, '分類代碼必須為 3-10 個大寫英文字母')
    .optional(),
  description: z.string()
    .max(500, '描述最多 500 字')
    .optional()
    .or(z.literal('')),
})

/**
 * 分類遷移驗證 Schema
 */
export const migrateCategorySchema = z.object({
  fromCategoryId: z.string().uuid('無效的來源分類 ID'),
  toCategoryId: z.string().uuid('無效的目標分類 ID'),
})
