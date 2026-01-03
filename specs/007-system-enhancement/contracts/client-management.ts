/**
 * API Contract: 客戶管理擴充
 * Feature: 007-system-enhancement
 * Date: 2026-01-03
 */

import { z } from 'zod'

// ============================================================================
// Zod Schemas (驗證規則)
// ============================================================================

/**
 * 更新客戶資料 Schema（管理端）
 */
export const updateClientSchema = z.object({
  client_id: z.string().uuid('客戶 ID 格式錯誤'),
  display_name: z.string().min(1, '客戶名稱不可為空').optional(),
  tier_id: z.string().uuid('等級 ID 格式錯誤').optional(),
  address: z.string().optional(), // 可選，無長度限制
  admin_notes: z.string().optional(), // 可選，無長度限制
  status: z.enum(['active', 'inactive']).optional(),
})

/**
 * 查詢客戶資料 Schema（客戶端，排除 admin_notes）
 */
export const getClientProfileSchema = z.object({
  client_id: z.string().uuid('客戶 ID 格式錯誤'),
})

// ============================================================================
// TypeScript Types (型別定義)
// ============================================================================

/**
 * 客戶資料（客戶端可見，排除 admin_notes）
 */
export type ClientProfile = {
  id: string
  display_name: string
  phone: string
  tier_id: string
  tier_name: string // 關聯查詢 tiers.name
  address: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

/**
 * 客戶資料（管理端可見，包含 admin_notes）
 */
export type AdminClientProfile = ClientProfile & {
  admin_notes: string | null
}

/**
 * 客戶列表項目（管理端，包含摘要欄位）
 */
export type ClientListItem = {
  id: string
  display_name: string
  phone: string
  tier_name: string
  address_summary: string | null // 最多 30 字，超過顯示「...」
  admin_notes_summary: string | null // 最多 30 字，超過顯示「...」
  status: 'active' | 'inactive'
  created_at: string
}

/**
 * 更新客戶資料輸入型別
 */
export type UpdateClientInput = z.infer<typeof updateClientSchema>

// ============================================================================
// Server Actions (API 端點)
// ============================================================================

/**
 * 查詢客戶資料（客戶端）
 *
 * @description
 * - 客戶僅能查詢自己的資料
 * - **排除 admin_notes 欄位**
 *
 * @param client_id - 客戶 ID（通常為當前登入使用者 ID）
 * @returns ActionResult<ClientProfile>
 *
 * @example
 * const result = await getClientProfile(auth.uid())
 * if (result.success) {
 *   console.log(result.data.address) // 可見
 *   console.log(result.data.admin_notes) // undefined（不存在）
 * }
 */
export async function getClientProfile(
  client_id: string
): Promise<ActionResult<ClientProfile>>

/**
 * 查詢客戶資料（管理端）
 *
 * @description
 * - 管理員可查詢任何客戶資料
 * - **包含 admin_notes 欄位**
 *
 * @param client_id - 客戶 ID
 * @returns ActionResult<AdminClientProfile>
 *
 * @example
 * const result = await getAdminClientProfile('xxx-xxx-xxx')
 * if (result.success) {
 *   console.log(result.data.admin_notes) // 可見
 * }
 */
export async function getAdminClientProfile(
  client_id: string
): Promise<ActionResult<AdminClientProfile>>

/**
 * 更新客戶資料（管理端）
 *
 * @description
 * - 僅管理員可執行
 * - 可更新 display_name, tier_id, address, admin_notes, status
 * - 不可更新 phone（手機號碼為唯一登入標識，需透過其他流程修改）
 *
 * @param input - 更新資料
 * @returns ActionResult<AdminClientProfile>
 *
 * @example
 * const result = await updateClient({
 *   client_id: 'xxx-xxx-xxx',
 *   address: '台北市信義區信義路五段7號',
 *   admin_notes: '此客戶為 VIP，優先處理訂單'
 * })
 */
export async function updateClient(
  input: UpdateClientInput
): Promise<ActionResult<AdminClientProfile>>

/**
 * 查詢客戶列表（管理端，包含摘要欄位）
 *
 * @description
 * - 僅管理員可執行
 * - 支援依等級篩選
 * - 支援依名稱或手機號碼搜尋
 * - address 與 admin_notes 顯示摘要（最多 30 字，超過顯示「...」）
 *
 * @param options - 篩選與搜尋選項
 * @returns ActionResult<ClientListItem[]>
 *
 * @example
 * const result = await getClientList({
 *   tier_id: 'xxx-xxx-xxx', // 可選
 *   search: '王小明' // 可選
 * })
 */
export async function getClientList(options?: {
  tier_id?: string
  search?: string
}): Promise<ActionResult<ClientListItem[]>>

// ============================================================================
// ActionResult Type (統一回傳格式)
// ============================================================================

export type ActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; errors?: Record<string, string[]>; message: string }
