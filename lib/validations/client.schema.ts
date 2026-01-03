import { z } from 'zod'

/**
 * 客戶管理驗證 Schema
 * Feature: 007-system-enhancement
 */

// 更新客戶資料 (管理端)
export const updateClientSchema = z.object({
  clientId: z.string().uuid('無效的客戶 ID'),
  displayName: z.string()
    .min(1, '顯示名稱不得為空')
    .max(50, '顯示名稱不得超過 50 字')
    .optional(),
  tierId: z.string().uuid('無效的等級 ID').optional(),
  address: z.string()
    .max(500, '地址不得超過 500 字')
    .optional()
    .nullable(),
  adminNotes: z.string()
    .max(1000, '管理員備註不得超過 1000 字')
    .optional()
    .nullable(),
})

// 型別推導
export type UpdateClientInput = z.infer<typeof updateClientSchema>
