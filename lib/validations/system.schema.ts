/**
 * Feature 008: 系統設定與操作日誌驗證 Schema
 * 用於系統設定 CRUD 與操作日誌查詢
 */

import { z } from 'zod'

// ===================================
// 系統設定驗證
// ===================================

// 更新系統設定
export const updateSettingSchema = z.object({
  key: z
    .string()
    .min(1, '設定鍵不可為空')
    .regex(/^[a-z0-9_]+$/, '設定鍵僅允許小寫字母、數字、底線'),
  value: z.string().min(0, '設定值不可為空'),  // 允許空字串（如清空 Logo）
})

export type UpdateSettingInput = z.infer<typeof updateSettingSchema>

// Logo 上傳驗證
export const uploadLogoSchema = z.object({
  logo_type: z.enum(['logo', 'logo_icon', 'favicon'], {
    message: '無效的 Logo 類型',
  }),
  file: z.instanceof(File, { message: '請選擇圖片檔案' }),
})

export type UploadLogoInput = z.infer<typeof uploadLogoSchema>

// ===================================
// 操作日誌驗證
// ===================================

// 操作日誌查詢參數（改進版：處理空字串與陣列）
export const getAuditLogsSchema = z.object({
  target_type: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  target_id: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  action_type: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(
      z
        .enum(['created', 'updated', 'deleted', 'stock_adjusted', 'comment_added'], {
          message: '無效的操作類型',
        })
        .optional()
    ),
  actor_id: z.string().uuid({ message: '無效的使用者 ID 格式' }).optional(),
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式應為 YYYY-MM-DD')
    .optional(),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式應為 YYYY-MM-DD')
    .optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
})

export type GetAuditLogsInput = z.infer<typeof getAuditLogsSchema>

// 操作日誌記錄參數
export const logAuditSchema = z.object({
  target_type: z.string().min(1, '目標實體類型不可為空'),
  target_id: z.string().min(1, '目標實體 ID 不可為空'),
  action_type: z.enum(['created', 'updated', 'deleted', 'stock_adjusted', 'comment_added'], {
    message: '無效的操作類型',
  }),
  old_values: z.record(z.string(), z.any()).optional().nullable(),
  new_values: z.record(z.string(), z.any()).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type LogAuditInput = z.infer<typeof logAuditSchema>
