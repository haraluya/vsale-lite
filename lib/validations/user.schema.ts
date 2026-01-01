import { z } from 'zod'

// 建立客戶 Schema
export const createClientSchema = z.object({
  phone: z.string()
    .regex(/^09\d{8}$/, '請輸入有效的手機號碼')
    .transform(val => val.replace(/[\s-]/g, '')),
  tier_id: z.string().uuid('請選擇會員等級'),
})

// 更新客戶 Schema
export const updateClientSchema = z.object({
  tier_id: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
})

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
