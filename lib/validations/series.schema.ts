import { z } from 'zod'

// 建立系列
export const createSeriesSchema = z.object({
  category_id: z.string().uuid().nullable(),
  name: z.string().min(1, "系列名稱不可為空"),
  description: z.string().optional(),
  sort_order: z.number().int().min(0).default(0)
})

// 更新系列
export const updateSeriesSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  sort_order: z.number().int().min(0).optional()
})

export type CreateSeriesInput = z.infer<typeof createSeriesSchema>
export type UpdateSeriesInput = z.infer<typeof updateSeriesSchema>
