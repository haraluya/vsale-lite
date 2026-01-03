/**
 * API Contract: 訂單留言系統
 * Feature: 007-system-enhancement
 * Date: 2026-01-03
 */

import { z } from 'zod'

// ============================================================================
// Zod Schemas (驗證規則)
// ============================================================================

/**
 * 新增訂單留言 Schema
 */
export const addOrderCommentSchema = z.object({
  order_id: z.string().uuid('訂單 ID 格式錯誤'),
  content: z
    .string()
    .min(1, '留言內容不可為空')
    .max(500, '留言內容不可超過 500 字'),
})

/**
 * 查詢訂單留言 Schema
 */
export const getOrderCommentsSchema = z.object({
  order_id: z.string().uuid('訂單 ID 格式錯誤'),
})

// ============================================================================
// TypeScript Types (型別定義)
// ============================================================================

/**
 * 訂單留言輸入型別
 */
export type AddOrderCommentInput = z.infer<typeof addOrderCommentSchema>

/**
 * 訂單留言輸出型別（包含使用者資訊）
 */
export type OrderComment = {
  id: string
  order_id: string
  action_type: 'comment'
  content: string
  actor_id: string
  actor_role: 'client' | 'admin'
  actor_name: string // 關聯查詢 profiles.display_name
  created_at: string
}

/**
 * 訂單完整時間軸（包含操作歷史與留言）
 */
export type OrderTimeline = {
  id: string
  order_id: string
  action_type: 'created' | 'confirmed' | 'status_updated' | 'cancelled' | 'comment'
  content: string | null
  old_status: string | null
  new_status: string | null
  actor_id: string | null
  actor_role: 'client' | 'admin' | null
  actor_name: string | null
  created_at: string
}

// ============================================================================
// Server Actions (API 端點)
// ============================================================================

/**
 * 新增訂單留言
 *
 * @description
 * - 客戶僅能在自己的訂單留言
 * - 管理員可在任何訂單留言
 * - 留言自動插入 order_timelines 表，action_type = 'comment'
 *
 * @param input - 留言輸入資料
 * @returns ActionResult<OrderComment>
 *
 * @example
 * // 客戶端使用
 * const result = await addOrderComment({
 *   order_id: 'xxx-xxx-xxx',
 *   content: '請問這筆訂單什麼時候出貨？'
 * })
 *
 * @example
 * // 管理端使用
 * const result = await addOrderComment({
 *   order_id: 'xxx-xxx-xxx',
 *   content: '已安排明天出貨，感謝您的訂購！'
 * })
 */
export async function addOrderComment(
  input: AddOrderCommentInput
): Promise<ActionResult<OrderComment>>

/**
 * 查詢訂單完整時間軸（包含操作歷史與留言）
 *
 * @description
 * - 客戶僅能查詢自己的訂單時間軸
 * - 管理員可查詢任何訂單時間軸
 * - 依 created_at 升序排列（舊 → 新）
 *
 * @param order_id - 訂單 ID
 * @returns ActionResult<OrderTimeline[]>
 *
 * @example
 * const result = await getOrderTimeline('xxx-xxx-xxx')
 * if (result.success) {
 *   console.log(result.data) // [{ action_type: 'created', ... }, { action_type: 'comment', content: '...', ... }]
 * }
 */
export async function getOrderTimeline(
  order_id: string
): Promise<ActionResult<OrderTimeline[]>>

// ============================================================================
// ActionResult Type (統一回傳格式)
// ============================================================================

export type ActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; errors?: Record<string, string[]>; message: string }
