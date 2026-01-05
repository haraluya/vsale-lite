import { z } from 'zod'

// 建立系列
export const createSeriesSchema = z.object({
  category_id: z.string().uuid().nullable(),
  code: z.string()
    .min(3, "系列代碼至少 3 個字元")
    .max(10, "系列代碼最多 10 個字元")
    .regex(/^[A-Z]{3,10}$/, "系列代碼必須為 3-10 個大寫英文字母"),
  name: z.string().min(1, "系列名稱不可為空"),
  description: z.string().optional(),
})

// 更新系列
export const updateSeriesSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  code: z.string()
    .min(3, "系列代碼至少 3 個字元")
    .max(10, "系列代碼最多 10 個字元")
    .regex(/^[A-Z]{3,10}$/, "系列代碼必須為 3-10 個大寫英文字母")
    .optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
})

export type CreateSeriesInput = z.infer<typeof createSeriesSchema>
export type UpdateSeriesInput = z.infer<typeof updateSeriesSchema>
