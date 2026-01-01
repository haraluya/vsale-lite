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
  description: z.string()
    .max(500, '描述最多 500 字')
    .optional()
    .or(z.literal('')),
  sort_order: z.coerce.number()
    .int('排序必須為整數')
    .min(0, '排序必須大於等於 0')
    .default(0),
})

/**
 * 更新分類驗證 Schema
 */
export const updateCategorySchema = z.object({
  name: z.string()
    .min(1, '分類名稱不可為空')
    .max(50, '分類名稱最多 50 字')
    .optional(),
  description: z.string()
    .max(500, '描述最多 500 字')
    .optional()
    .or(z.literal('')),
  sort_order: z.coerce.number()
    .int('排序必須為整數')
    .min(0, '排序必須大於等於 0')
    .optional(),
})

/**
 * 分類遷移驗證 Schema
 */
export const migrateCategorySchema = z.object({
  fromCategoryId: z.string().uuid('無效的來源分類 ID'),
  toCategoryId: z.string().uuid('無效的目標分類 ID'),
})
