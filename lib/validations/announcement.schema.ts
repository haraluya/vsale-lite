import { z } from 'zod'

/**
 * 廣告輪播驗證 Schema
 * Feature: 007-system-enhancement
 */

// 建立廣告
export const createAnnouncementSchema = z.object({
  title: z.string()
    .min(1, '標題不得為空')
    .max(100, '標題不得超過 100 字'),
  imageUrl: z.string()
    .url('圖片 URL 格式錯誤'),
  linkUrl: z.string()
    .url('連結 URL 格式錯誤')
    .optional()
    .nullable(),
  sortOrder: z.number()
    .int('排序必須為整數')
    .default(0),
  isActive: z.boolean()
    .default(true),
})

// 更新廣告
export const updateAnnouncementSchema = z.object({
  announcementId: z.string().uuid('無效的廣告 ID'),
  title: z.string()
    .min(1, '標題不得為空')
    .max(100, '標題不得超過 100 字')
    .optional(),
  imageUrl: z.string()
    .url('圖片 URL 格式錯誤')
    .optional(),
  linkUrl: z.string()
    .url('連結 URL 格式錯誤')
    .optional()
    .nullable(),
  sortOrder: z.number()
    .int('排序必須為整數')
    .optional(),
  isActive: z.boolean()
    .optional(),
})

// 刪除廣告
export const deleteAnnouncementSchema = z.object({
  announcementId: z.string().uuid('無效的廣告 ID'),
})

// 圖片上傳驗證
export const uploadAnnouncementImageSchema = z.object({
  announcementId: z.string().uuid('無效的廣告 ID'),
  file: z.instanceof(File, { message: '檔案格式錯誤' }),
})

// 型別推導
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>
export type DeleteAnnouncementInput = z.infer<typeof deleteAnnouncementSchema>
export type UploadAnnouncementImageInput = z.infer<typeof uploadAnnouncementImageSchema>
