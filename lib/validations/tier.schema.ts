import { z } from 'zod'

// 建立會員等級 Schema
export const createTierSchema = z.object({
  name: z.string()
    .min(1, '等級名稱不可為空')
    .max(50, '等級名稱最多 50 字'),
  rank: z.coerce.number()
    .int('排序必須為整數')
    .min(1, '排序必須大於 0'),
})

// 更新會員等級 Schema
export const updateTierSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  rank: z.coerce.number().int().min(1).optional(),
})

export type CreateTierInput = z.infer<typeof createTierSchema>
export type UpdateTierInput = z.infer<typeof updateTierSchema>
