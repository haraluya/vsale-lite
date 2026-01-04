/**
 * Feature 008: 成員驗證 Schema
 * 用於後台成員帳號 CRUD 操作
 */

import { z } from 'zod'

// ===================================
// 成員登入驗證
// ===================================

export const loginWithUsernameSchema = z.object({
  username: z
    .string()
    .min(3, '帳號至少 3 個字元')
    .max(20, '帳號最多 20 個字元')
    .regex(/^[a-z0-9_]+$/, '帳號僅允許小寫字母、數字、底線'),
  password: z.string().min(1, '請輸入密碼'),
})

export type LoginWithUsernameInput = z.infer<typeof loginWithUsernameSchema>

// ===================================
// 成員 CRUD 驗證
// ===================================

// 建立成員
export const createAdminSchema = z.object({
  username: z
    .string()
    .min(3, '帳號至少 3 個字元')
    .max(20, '帳號最多 20 個字元')
    .regex(/^[a-z0-9_]+$/, '帳號僅允許小寫字母、數字、底線'),
  password: z
    .string()
    .min(6, '密碼至少 6 個字元'),
  display_name: z
    .string()
    .min(1, '暱稱至少 1 個字元')
    .max(20, '暱稱最多 20 個字元')
    .optional()
    .nullable(),
})

export type CreateAdminInput = z.infer<typeof createAdminSchema>

// 更新成員資料
export const updateAdminSchema = z.object({
  admin_id: z.string().uuid('無效的成員 ID'),
  display_name: z
    .string()
    .min(1, '暱稱至少 1 個字元')
    .max(20, '暱稱最多 20 個字元')
    .optional()
    .nullable(),
})

export type UpdateAdminInput = z.infer<typeof updateAdminSchema>

// 重設密碼
export const resetPasswordSchema = z.object({
  admin_id: z.string().uuid('無效的成員 ID'),
  new_password: z
    .string()
    .min(6, '密碼至少 6 個字元'),
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// 刪除成員
export const deleteAdminSchema = z.object({
  admin_id: z.string().uuid('無效的成員 ID'),
})

export type DeleteAdminInput = z.infer<typeof deleteAdminSchema>

// ===================================
// 查詢參數驗證
// ===================================

export const getAdminsSchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
})

export type GetAdminsInput = z.infer<typeof getAdminsSchema>
