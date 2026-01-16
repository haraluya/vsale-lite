'use server'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { AuthContext } from '@/types'

/**
 * 取得當前使用者認證資訊（帶快取）
 * 使用 React cache() 確保在單次 request 中只執行一次資料庫查詢
 *
 * @internal 此函數僅供內部使用，請使用 checkAuth() 替代
 */
const getCachedAuth = cache(async () => {
  const supabase = await createClient()

  // Step 1: 認證檢查
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false as const, error: '未登入,請先登入' }
  }

  // Step 2: 查詢使用者資料（使用同一個客戶端，避免重複建立連線）
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, tier_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { success: false as const, error: '找不到使用者資料' }
  }

  return {
    success: true as const,
    data: {
      userId: user.id,
      role: profile.role as 'client' | 'admin',
      tierId: profile.tier_id || undefined,
    },
  }
})

/**
 * 驗證當前使用者身份與權限（優化版 - 帶快取）
 *
 * 使用 React cache() 實現 request-scoped 快取：
 * - 在單次 HTTP Request 中多次呼叫只會執行一次資料庫查詢
 * - 避免重複建立 Supabase 客戶端連線
 * - 減少認證查詢的網路延遲
 *
 * @param requiredRole 必要的角色 ('admin' 或 'client')
 * @returns AuthContext 包含使用者 ID、角色、會員等級
 * @throws Error 如果未登入或權限不足
 */
export async function checkAuth(requiredRole?: 'admin' | 'client'): Promise<AuthContext> {
  try {
    const result = await getCachedAuth()

    if (!result.success) {
      throw new Error(result.error)
    }

    const authContext = result.data

    // 檢查角色權限
    if (requiredRole && authContext.role !== requiredRole) {
      throw new Error('權限不足,無法執行此操作')
    }

    return authContext
  } catch (error) {
    console.error('checkAuth error:', error)
    throw error // 重新拋出錯誤，讓呼叫方處理
  }
}
