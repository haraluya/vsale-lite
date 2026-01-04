/**
 * Feature 008: 管理員帳號管理 Server Actions
 * 提供管理員登入、CRUD、密碼重設等功能
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'
import type {
  ActionResult,
  AdminProfile,
  GetAdminsParams,
  GetAdminsResponse,
} from '@/types'
import {
  loginWithUsernameSchema,
  createAdminSchema,
  updateAdminSchema,
  resetPasswordSchema,
  deleteAdminSchema,
  getAdminsSchema,
  type LoginWithUsernameInput,
  type CreateAdminInput,
  type UpdateAdminInput,
  type ResetPasswordInput,
  type DeleteAdminInput,
} from '@/lib/validations/admin.schema'

// ===================================
// 管理員登入功能
// ===================================

/**
 * 使用帳號（username）+ 密碼登入後台
 * @param input 登入參數
 */
export async function loginWithUsername(
  input: LoginWithUsernameInput
): Promise<ActionResult> {
  try {
    // 驗證輸入
    const validatedInput = loginWithUsernameSchema.parse(input)

    const supabase = await createClient()
    const adminClient = createAdminClient()

    // 1. 使用 Admin Client 查詢 username 對應的 email（繞過 RLS）
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('email, role')
      .eq('username', validatedInput.username)
      .eq('role', 'admin')
      .single()

    if (profileError || !profile) {
      // 不區分「帳號不存在」與「密碼錯誤」，防止帳號列舉攻擊
      return { success: false, message: '帳號或密碼錯誤' }
    }

    // 2. 使用一般 Client 進行登入（建立 session cookie）
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: validatedInput.password,
    })

    if (signInError) {
      return { success: false, message: '帳號或密碼錯誤' }
    }

    // 3. 登入成功，導向後台首頁
    redirect('/admin/dashboard')
  } catch (error) {
    console.error('[loginWithUsername] 錯誤:', error)
    return { success: false, message: '登入失敗' }
  }
}

// ===================================
// 管理員 CRUD 功能
// ===================================

/**
 * 建立管理員帳號
 * @param input 管理員資料
 */
export async function createAdmin(
  input: CreateAdminInput
): Promise<ActionResult<string>> {
  try {
    // 權限檢查：僅管理員可建立管理員帳號
    await checkAuth('admin')

    // 驗證輸入
    const validatedInput = createAdminSchema.parse(input)

    const supabase = await createClient()
    const adminClient = createAdminClient()

    // 1. 檢查 username 是否已存在
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', validatedInput.username)
      .single()

    if (existingProfile) {
      return { success: false, message: '帳號已存在' }
    }

    // 2. 使用 Admin Client 建立 Auth User
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: validatedInput.email,
      password: validatedInput.password,
      email_confirm: true, // 自動確認 Email
    })

    if (authError || !authData.user) {
      console.error('[createAdmin] 建立 Auth User 失敗:', authError)
      return { success: false, message: '建立管理員失敗' }
    }

    // 3. 建立 Profile
    const { error: profileError } = await adminClient.from('profiles').insert({
      id: authData.user.id,
      email: validatedInput.email,
      username: validatedInput.username,
      display_name: validatedInput.display_name || null,
      role: 'admin',
    })

    if (profileError) {
      console.error('[createAdmin] 建立 Profile 失敗:', profileError)
      // 回滾：刪除已建立的 Auth User
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return { success: false, message: '建立管理員失敗' }
    }

    // 4. 記錄操作日誌
    await logAudit({
      target_type: 'admin',
      target_id: authData.user.id,
      action_type: 'created',
      new_values: {
        username: validatedInput.username,
        email: validatedInput.email,
        display_name: validatedInput.display_name,
      },
    })

    revalidatePath('/admin/system/admins')

    return {
      success: true,
      data: authData.user.id,
      message: '管理員建立成功',
    }
  } catch (error) {
    console.error('[createAdmin] 錯誤:', error)
    return { success: false, message: '建立管理員失敗' }
  }
}

/**
 * 查詢管理員列表
 * @param params 查詢參數
 */
export async function getAdmins(
  params: GetAdminsParams
): Promise<ActionResult<GetAdminsResponse>> {
  try {
    // 權限檢查：僅管理員可查詢管理員列表
    await checkAuth('admin')

    // 驗證輸入
    const validatedParams = getAdminsSchema.parse(params)

    const supabase = await createClient()

    // 建立查詢
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'admin')

    // 搜尋條件
    if (validatedParams.search) {
      query = query.or(
        `username.ilike.%${validatedParams.search}%,email.ilike.%${validatedParams.search}%`
      )
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
      console.error('[getAdmins] 查詢失敗:', error)
      return { success: false, message: '查詢管理員列表失敗' }
    }

    return {
      success: true,
      data: {
        admins: (data as AdminProfile[]) || [],
        total: count || 0,
        page,
        limit,
      },
    }
  } catch (error) {
    console.error('[getAdmins] 錯誤:', error)
    return { success: false, message: '查詢管理員列表失敗' }
  }
}

/**
 * 查詢單一管理員資料
 * @param adminId 管理員 ID
 */
export async function getAdminById(
  adminId: string
): Promise<ActionResult<AdminProfile>> {
  try {
    // 權限檢查：僅管理員可查詢管理員資料
    await checkAuth('admin')

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', adminId)
      .eq('role', 'admin')
      .single()

    if (error) {
      console.error('[getAdminById] 查詢失敗:', error)
      return { success: false, message: '查詢管理員資料失敗' }
    }

    return {
      success: true,
      data: data as AdminProfile,
    }
  } catch (error) {
    console.error('[getAdminById] 錯誤:', error)
    return { success: false, message: '查詢管理員資料失敗' }
  }
}

/**
 * 更新管理員資料
 * @param input 更新參數
 */
export async function updateAdmin(input: UpdateAdminInput): Promise<ActionResult> {
  try {
    // 權限檢查：僅管理員可更新管理員資料
    await checkAuth('admin')

    // 驗證輸入
    const validatedInput = updateAdminSchema.parse(input)

    const supabase = await createClient()
    const adminClient = createAdminClient()

    // 1. 查詢舊資料
    const { data: oldProfile } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', validatedInput.admin_id)
      .single()

    // 2. 更新 Profile
    const updateData: Record<string, any> = {}
    if (validatedInput.display_name !== undefined) {
      updateData.display_name = validatedInput.display_name
    }
    if (validatedInput.email) {
      updateData.email = validatedInput.email
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .update(updateData)
      .eq('id', validatedInput.admin_id)

    if (profileError) {
      console.error('[updateAdmin] 更新 Profile 失敗:', profileError)
      return { success: false, message: '更新管理員資料失敗' }
    }

    // 3. 若更新 Email，同步更新 Auth User
    if (validatedInput.email) {
      await adminClient.auth.admin.updateUserById(validatedInput.admin_id, {
        email: validatedInput.email,
      })
    }

    // 4. 記錄操作日誌
    await logAudit({
      target_type: 'admin',
      target_id: validatedInput.admin_id,
      action_type: 'updated',
      old_values: oldProfile || {},
      new_values: updateData,
    })

    revalidatePath('/admin/system/admins')

    return { success: true, message: '管理員資料更新成功' }
  } catch (error) {
    console.error('[updateAdmin] 錯誤:', error)
    return { success: false, message: '更新管理員資料失敗' }
  }
}

/**
 * 重設管理員密碼
 * @param input 重設密碼參數
 */
export async function resetPassword(
  input: ResetPasswordInput
): Promise<ActionResult> {
  try {
    // 權限檢查：僅管理員可重設密碼
    await checkAuth('admin')

    // 驗證輸入
    const validatedInput = resetPasswordSchema.parse(input)

    const adminClient = createAdminClient()

    // 使用 Admin Client 重設密碼
    const { error } = await adminClient.auth.admin.updateUserById(
      validatedInput.admin_id,
      {
        password: validatedInput.new_password,
      }
    )

    if (error) {
      console.error('[resetPassword] 重設密碼失敗:', error)
      return { success: false, message: '重設密碼失敗' }
    }

    // 記錄操作日誌
    await logAudit({
      target_type: 'admin',
      target_id: validatedInput.admin_id,
      action_type: 'updated',
      notes: '重設密碼',
    })

    revalidatePath('/admin/system/admins')

    return { success: true, message: '密碼重設成功' }
  } catch (error) {
    console.error('[resetPassword] 錯誤:', error)
    return { success: false, message: '重設密碼失敗' }
  }
}

/**
 * 刪除管理員帳號
 * @param input 刪除參數
 */
export async function deleteAdmin(input: DeleteAdminInput): Promise<ActionResult> {
  try {
    // 權限檢查：僅管理員可刪除管理員帳號
    const { user } = await checkAuth('admin')

    // 驗證輸入
    const validatedInput = deleteAdminSchema.parse(input)

    // 防止刪除自己
    if (validatedInput.admin_id === user.userId) {
      return { success: false, message: '無法刪除自己的帳號' }
    }

    const supabase = await createClient()
    const adminClient = createAdminClient()

    // 1. 查詢舊資料
    const { data: oldProfile } = await supabase
      .from('profiles')
      .select('username, email, display_name')
      .eq('id', validatedInput.admin_id)
      .single()

    // 2. 刪除 Profile（CASCADE 會自動處理相關資料）
    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', validatedInput.admin_id)

    if (profileError) {
      console.error('[deleteAdmin] 刪除 Profile 失敗:', profileError)
      return { success: false, message: '刪除管理員失敗' }
    }

    // 3. 刪除 Auth User
    const { error: authError } = await adminClient.auth.admin.deleteUser(
      validatedInput.admin_id
    )

    if (authError) {
      console.error('[deleteAdmin] 刪除 Auth User 失敗:', authError)
    }

    // 4. 記錄操作日誌
    await logAudit({
      target_type: 'admin',
      target_id: validatedInput.admin_id,
      action_type: 'deleted',
      old_values: oldProfile || {},
    })

    revalidatePath('/admin/system/admins')

    return { success: true, message: '管理員刪除成功' }
  } catch (error) {
    console.error('[deleteAdmin] 錯誤:', error)
    return { success: false, message: '刪除管理員失敗' }
  }
}
