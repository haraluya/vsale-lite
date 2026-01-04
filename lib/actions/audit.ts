/**
 * Feature 008: 操作日誌 Server Actions
 * 提供操作日誌的查詢、記錄、統計功能
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import type {
  ActionResult,
  AuditLog,
  GetAuditLogsParams,
  GetAuditLogsResponse,
  AuditLogStats,
} from '@/types'
import { logAuditSchema, getAuditLogsSchema, type LogAuditInput } from '@/lib/validations/system.schema'

// ===================================
// 工具函式
// ===================================

/**
 * 強制轉換 action_type 參數
 * 處理陣列、空字串、undefined 的情況
 */
function coerceActionType(value: any): string | undefined {
  // 處理陣列（取第一個值）
  if (Array.isArray(value)) {
    value = value[0]
  }

  // 跳過空字串、undefined、null
  if (value === '' || value === undefined || value === null) {
    return undefined
  }

  // 回傳字串值
  return String(value).trim()
}

// ===================================
// 核心操作日誌記錄函式
// ===================================

/**
 * 記錄操作日誌（所有後台操作都應呼叫此函式）
 * @param input 操作日誌參數
 */
export async function logAudit(input: LogAuditInput): Promise<ActionResult> {
  try {
    // 驗證輸入
    const validatedInput = logAuditSchema.parse(input)

    // 權限檢查：僅已認證使用者可記錄操作
    const authContext = await checkAuth()

    const supabase = await createClient()

    // 取得操作者資訊（username 或 display_name 或 email 或 phone）
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name, email, phone')
      .eq('id', authContext.userId)
      .single()

    const actorDisplayName =
      profile?.username ||
      profile?.display_name ||
      profile?.email ||
      profile?.phone ||
      '未知使用者'

    // 插入操作日誌
    const { error } = await supabase.from('audit_logs').insert({
      target_type: validatedInput.target_type,
      target_id: validatedInput.target_id,
      action_type: validatedInput.action_type,
      actor_id: authContext.userId,
      actor_role: authContext.role,
      actor_display_name: actorDisplayName,
      old_values: validatedInput.old_values || null,
      new_values: validatedInput.new_values || null,
      notes: validatedInput.notes || null,
    })

    if (error) {
      console.error('[logAudit] 操作日誌記錄失敗:', error)
      return { success: false, message: '操作日誌記錄失敗' }
    }

    return { success: true, message: '操作日誌記錄成功' }
  } catch (error) {
    console.error('[logAudit] 錯誤:', error)
    return { success: false, message: '操作日誌記錄失敗' }
  }
}

// ===================================
// 操作日誌查詢功能
// ===================================

/**
 * 查詢操作日誌列表（支援篩選與分頁）
 * @param params 查詢參數
 */
export async function getAuditLogs(
  params: GetAuditLogsParams
): Promise<ActionResult<GetAuditLogsResponse>> {
  try {
    // 權限檢查：僅管理員可查詢操作日誌
    await checkAuth('admin')

    // 第 1 層防禦：清理並強制轉換參數
    const cleanedParams = {
      action_type: coerceActionType(params.action_type),
      target_type: params.target_type === '' ? undefined : params.target_type,
      target_id: params.target_id === '' ? undefined : params.target_id,
      actor_id: params.actor_id,
      date_from: params.date_from === '' ? undefined : params.date_from,
      date_to: params.date_to === '' ? undefined : params.date_to,
      page: typeof params.page === 'string' ? parseInt(params.page, 10) : params.page,
      limit: typeof params.limit === 'string' ? parseInt(params.limit, 10) : params.limit,
    }

    // 第 2 層防禦：Zod 驗證
    const validatedParams = getAuditLogsSchema.parse(cleanedParams)

    const supabase = await createClient()

    // 建立查詢（基礎過濾）
    let query = supabase.from('audit_logs').select('*', { count: 'exact' })

    // 篩選條件
    if (validatedParams.target_type) {
      query = query.eq('target_type', validatedParams.target_type)
    }

    if (validatedParams.target_id) {
      query = query.eq('target_id', validatedParams.target_id)
    }

    if (validatedParams.action_type) {
      query = query.eq('action_type', validatedParams.action_type)
    }

    if (validatedParams.actor_id) {
      query = query.eq('actor_id', validatedParams.actor_id)
    }

    // 日期範圍篩選（轉換為 UTC+8 時區）
    if (validatedParams.date_from) {
      // 將本地日期轉換為 UTC 時間（台灣時區 UTC+8，所以減 8 小時）
      const fromDate = new Date(`${validatedParams.date_from}T00:00:00+08:00`)
      query = query.gte('created_at', fromDate.toISOString())
    }

    if (validatedParams.date_to) {
      // 將本地日期轉換為 UTC 時間（台灣時區 UTC+8，所以減 8 小時）
      const toDate = new Date(`${validatedParams.date_to}T23:59:59+08:00`)
      query = query.lte('created_at', toDate.toISOString())
    }

    // 排序（最新在前）
    query = query.order('created_at', { ascending: false })

    // 分頁
    const page = validatedParams.page || 1
    const limit = validatedParams.limit || 20
    const offset = (page - 1) * limit

    query = query.range(offset, offset + limit - 1)

    // 執行查詢
    const { data, error, count } = await query

    if (error) {
      console.error('[getAuditLogs] 查詢失敗:', error)
      return { success: false, message: '查詢操作日誌失敗' }
    }

    return {
      success: true,
      data: {
        logs: (data as AuditLog[]) || [],
        total: count || 0,
        page,
        limit,
      },
    }
  } catch (error) {
    console.error('[getAuditLogs] 錯誤:', error)
    return { success: false, message: '查詢操作日誌失敗' }
  }
}

/**
 * 查詢特定實體的操作歷史（用於實體詳情頁的時間軸）
 * @param targetType 實體類型（如 'product', 'order', 'client'）
 * @param targetId 實體 ID
 */
export async function getAuditLogsByTarget(
  targetType: string,
  targetId: string
): Promise<ActionResult<AuditLog[]>> {
  try {
    // 權限檢查：僅管理員可查詢操作日誌
    await checkAuth('admin')

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[getAuditLogsByTarget] 查詢失敗:', error)
      return { success: false, message: '查詢操作歷史失敗' }
    }

    return {
      success: true,
      data: (data as AuditLog[]) || [],
    }
  } catch (error) {
    console.error('[getAuditLogsByTarget] 錯誤:', error)
    return { success: false, message: '查詢操作歷史失敗' }
  }
}

/**
 * 查詢操作日誌統計資料
 */
export async function getAuditLogStats(): Promise<ActionResult<AuditLogStats>> {
  try {
    // 權限檢查：僅管理員可查詢統計
    await checkAuth('admin')

    const supabase = await createClient()

    // 查詢總數
    const { count: totalCount } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })

    // 查詢各類型操作統計
    const { data: typeStats } = await supabase
      .from('audit_logs')
      .select('action_type')
      .then((result) => {
        const stats = (result.data || []).reduce(
          (acc, log) => {
            const type = log.action_type
            acc[type] = (acc[type] || 0) + 1
            return acc
          },
          {} as Record<string, number>
        )

        return {
          data: Object.entries(stats).map(([action_type, count]) => ({
            action_type: action_type as any,
            count,
          })),
        }
      })

    // 查詢各操作者統計（前 10 名）
    const { data: actorStats } = await supabase
      .from('audit_logs')
      .select('actor_id, actor_display_name')
      .then((result) => {
        const stats = (result.data || []).reduce(
          (acc, log) => {
            if (!log.actor_id) return acc
            const key = log.actor_id
            if (!acc[key]) {
              acc[key] = {
                actor_id: log.actor_id,
                actor_name: log.actor_display_name || '未知',
                count: 0,
              }
            }
            acc[key].count++
            return acc
          },
          {} as Record<string, { actor_id: string; actor_name: string; count: number }>
        )

        return {
          data: Object.values(stats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10),
        }
      })

    return {
      success: true,
      data: {
        total_logs: totalCount || 0,
        logs_by_type: typeStats || [],
        logs_by_actor: actorStats || [],
      },
    }
  } catch (error) {
    console.error('[getAuditLogStats] 錯誤:', error)
    return { success: false, message: '查詢操作日誌統計失敗' }
  }
}
