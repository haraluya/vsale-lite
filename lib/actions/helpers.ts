'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { AuthContext } from '@/types'

/**
 * 驗證當前使用者身份與權限
 * @param requiredRole 必要的角色 ('admin' 或 'client')
 * @returns AuthContext 包含使用者 ID、角色、會員等級
 * @throws Error 如果未登入或權限不足
 */
export async function checkAuth(requiredRole?: 'admin' | 'client'): Promise<AuthContext> {
  const supabase = await createClient()

  // 取得當前使用者
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  console.log('checkAuth - getUser 結果:', { userId: user?.id, error: authError?.message })

  if (authError || !user) {
    throw new Error('未登入,請先登入')
  }

  // 查詢 profiles 取得角色資訊（使用 Admin Client 繞過 RLS）
  const adminClient = createAdminClient()
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role, tier_id')
    .eq('id', user.id)
    .single()

  console.log('checkAuth - profile 查詢:', { profile, error: profileError?.message })

  if (profileError || !profile) {
    throw new Error('找不到使用者資料')
  }

  // 檢查角色權限
  if (requiredRole && profile.role !== requiredRole) {
    console.log('checkAuth - 權限檢查失敗:', { requiredRole, actualRole: profile.role })
    throw new Error('權限不足,無法執行此操作')
  }

  return {
    userId: user.id,
    role: profile.role as 'client' | 'admin',
    tierId: profile.tier_id || undefined,
  }
}
