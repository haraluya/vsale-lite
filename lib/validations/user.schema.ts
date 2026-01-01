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

// 修改密碼 Schema
export const updatePasswordSchema = z.object({
  newPassword: z.string()
    .min(6, '密碼至少 6 個字元')
    .max(50, '密碼最多 50 個字元'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '兩次輸入的密碼不一致',
  path: ['confirmPassword'],
})

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
