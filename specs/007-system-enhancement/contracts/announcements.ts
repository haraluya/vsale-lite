/**
 * API Contract: 廣告輪播系統
 * Feature: 007-system-enhancement
 * Date: 2026-01-03
 */

import { z } from 'zod'

// ============================================================================
// Zod Schemas (驗證規則)
// ============================================================================

/**
 * 新增廣告 Schema
 */
export const createAnnouncementSchema = z.object({
  title: z.string().min(1, '廣告標題不可為空').max(100, '廣告標題不可超過 100 字'),
  link_url: z
    .string()
    .url('連結 URL 格式錯誤')
    .optional()
    .or(z.literal('')), // 允許空字串
  sort_order: z.number().int('排序必須為整數').default(0),
})

/**
 * 更新廣告 Schema
 */
export const updateAnnouncementSchema = z.object({
  id: z.string().uuid('廣告 ID 格式錯誤'),
  title: z.string().min(1, '廣告標題不可為空').max(100, '廣告標題不可超過 100 字').optional(),
  link_url: z
    .string()
    .url('連結 URL 格式錯誤')
    .optional()
    .or(z.literal('')), // 允許空字串
  sort_order: z.number().int('排序必須為整數').optional(),
  is_active: z.boolean().optional(),
})

/**
 * 上傳廣告圖片 Schema
 */
export const uploadAnnouncementImageSchema = z.object({
  announcement_id: z.string().uuid('廣告 ID 格式錯誤'),
  file: z.instanceof(File, { message: '請提供有效的圖片檔案' }),
})

// ============================================================================
// TypeScript Types (型別定義)
// ============================================================================

/**
 * 廣告資料型別
 */
export type Announcement = {
  id: string
  title: string
  image_url: string
  link_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * 新增廣告輸入型別
 */
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>

/**
 * 更新廣告輸入型別
 */
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>

// ============================================================================
// Server Actions (API 端點)
// ============================================================================

/**
 * 查詢啟用的廣告（前台）
 *
 * @description
 * - 所有使用者（包含未登入）可查詢
 * - 僅返回 is_active = true 的廣告
 * - 依 sort_order 升序排列
 * - 最多返回 5 則廣告
 *
 * @returns ActionResult<Announcement[]>
 *
 * @example
 * const result = await getActiveAnnouncements()
 * if (result.success) {
 *   console.log(result.data) // 最多 5 則廣告
 * }
 */
export async function getActiveAnnouncements(): Promise<ActionResult<Announcement[]>>

/**
 * 查詢所有廣告（管理端）
 *
 * @description
 * - 僅管理員可執行
 * - 返回所有廣告（包含停用的）
 * - 依 sort_order 升序排列
 *
 * @returns ActionResult<Announcement[]>
 *
 * @example
 * const result = await getAllAnnouncements()
 * if (result.success) {
 *   console.log(result.data) // 所有廣告
 * }
 */
export async function getAllAnnouncements(): Promise<ActionResult<Announcement[]>>

/**
 * 新增廣告（管理端）
 *
 * @description
 * - 僅管理員可執行
 * - 新增後需上傳圖片（使用 uploadAnnouncementImage）
 * - 預設為啟用狀態（is_active = true）
 *
 * @param input - 廣告資料（不包含圖片）
 * @returns ActionResult<Announcement>
 *
 * @example
 * const result = await createAnnouncement({
 *   title: '新春優惠活動',
 *   link_url: 'https://example.com/promo',
 *   sort_order: 1
 * })
 * if (result.success) {
 *   // 接著上傳圖片
 *   await uploadAnnouncementImage({
 *     announcement_id: result.data.id,
 *     file: imageFile
 *   })
 * }
 */
export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<ActionResult<Announcement>>

/**
 * 更新廣告（管理端）
 *
 * @description
 * - 僅管理員可執行
 * - 可更新標題、連結、排序、啟用狀態
 * - 圖片需透過 uploadAnnouncementImage 單獨更新
 *
 * @param input - 更新資料
 * @returns ActionResult<Announcement>
 *
 * @example
 * const result = await updateAnnouncement({
 *   id: 'xxx-xxx-xxx',
 *   is_active: false // 停用廣告
 * })
 */
export async function updateAnnouncement(
  input: UpdateAnnouncementInput
): Promise<ActionResult<Announcement>>

/**
 * 刪除廣告（管理端）
 *
 * @description
 * - 僅管理員可執行
 * - 同時刪除 Supabase Storage 中的圖片
 *
 * @param announcement_id - 廣告 ID
 * @returns ActionResult<void>
 *
 * @example
 * const result = await deleteAnnouncement('xxx-xxx-xxx')
 */
export async function deleteAnnouncement(
  announcement_id: string
): Promise<ActionResult<void>>

/**
 * 上傳廣告圖片（管理端）
 *
 * @description
 * - 僅管理員可執行
 * - 圖片儲存路徑：`announcements/{announcement_id}/main.{ext}`
 * - 支援格式：JPG, PNG, WebP
 * - 大小限制：5MB
 * - 覆寫模式（允許重新上傳）
 *
 * @param input - 上傳資料
 * @returns ActionResult<{ image_url: string }>
 *
 * @example
 * const result = await uploadAnnouncementImage({
 *   announcement_id: 'xxx-xxx-xxx',
 *   file: imageFile
 * })
 * if (result.success) {
 *   console.log(result.data.image_url) // https://...
 * }
 */
export async function uploadAnnouncementImage(input: {
  announcement_id: string
  file: File
}): Promise<ActionResult<{ image_url: string }>>

// ============================================================================
// ActionResult Type (統一回傳格式)
// ============================================================================

export type ActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; errors?: Record<string, string[]>; message: string }
