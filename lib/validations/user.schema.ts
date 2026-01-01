import { z } from 'zod'

// 建立客戶 Schema
export const createClientSchema = z.object({
  phone: z.string()
    .regex(/^09\d{8}$/, '請輸入有效的手機號碼 (09 開頭,共 10 碼)')
    .transform(val => val.replace(/[\s-]/g, '')),
  tier_id: z.string().uuid('請選擇會員等級'),
  display_name: z.string().max(50, '顯示名稱最多 50 字').optional(),
  notes: z.string().max(500, '備註最多 500 字').optional(),
})

// 更新客戶 Schema
export const updateClientSchema = z.object({
  tier_id: z.string().uuid('請選擇會員等級').optional(),
  display_name: z.string().max(50, '顯示名稱最多 50 字').optional(),
  notes: z.string().max(500, '備註最多 500 字').optional(),
})

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
