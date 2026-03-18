'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { loginWithPhoneSchema, loginWithEmailSchema } from '@/lib/validations/auth.schema'
import { withRetry } from '@/lib/supabase/retry'
import type { ActionResult } from '@/types'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * 管理員使用 Email 登入後台
 */
export async function loginWithEmail(
  prevState: any,
  formData: FormData
): Promise<ActionResult> {
  try {
    // 1. 驗證輸入
    const validatedFields = loginWithEmailSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    })

    if (!validatedFields.success) {
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors,
        message: '驗證失敗',
      }
    }

    const supabase = await createClient()

    // 2. 呼叫 Supabase Auth 登入（帶重試機制）
    const { data: authData, error: authError } = await withRetry(
      () => supabase.auth.signInWithPassword({
        email: validatedFields.data.email,
        password: validatedFields.data.password,
      }),
      { maxRetries: 2, delayMs: 500 }
    )

    if (authError || !authData.user) {
      console.error('Supabase auth error:', authError)
      return {
        success: false,
        message: authError?.message || 'Email 或密碼錯誤',
      }
    }

    // 3. 查詢 profiles 驗證角色（使用 Admin Client 繞過 RLS）
    const adminClient = createAdminClient()
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      // 如果找不到 profile,登出並返回錯誤
      console.error('Profile query error:', profileError)
      console.log('User ID:', authData.user.id)
      await supabase.auth.signOut()
      return {
        success: false,
        message: `找不到使用者資料 (ID: ${authData.user.id})`,
      }
    }

    // 4. 驗證角色必須是 admin
    console.log('Profile role:', profile.role)
    if (profile.role !== 'admin') {
      await supabase.auth.signOut()
      return {
        success: false,
        message: `此帳號無法使用後台登入 (角色: ${profile.role})`,
      }
    }

    // 5. 登入成功,重導向至後台
    revalidatePath('/', 'layout')
  } catch (error) {
    console.error('loginWithEmail error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '登入失敗',
    }
  }

  // 6. 重導向 (必須在 try-catch 外)
  redirect('/admin/dashboard')
}

/**
 * 前台客戶使用手機號碼登入
 */
export async function loginWithPhone(
  prevState: any,
  formData: FormData
): Promise<ActionResult> {
  try {
    // 1. 驗證輸入
    const validatedFields = loginWithPhoneSchema.safeParse({
      phone: formData.get('phone'),
      password: formData.get('password'),
    })

    if (!validatedFields.success) {
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors,
        message: '驗證失敗',
      }
    }

    const supabase = await createClient()

    // 2. 呼叫 Supabase Auth 登入（使用 Email 格式: phone@temp.local，帶重試機制）
    const tempEmail = `${validatedFields.data.phone}@temp.local`
    const { data: authData, error: authError } = await withRetry(
      () => supabase.auth.signInWithPassword({
        email: tempEmail,
        password: validatedFields.data.password,
      }),
      { maxRetries: 2, delayMs: 500 }
    )

    console.log('loginWithPhone - 登入結果:', { email: tempEmail, userId: authData?.user?.id, error: authError?.message })

    if (authError || !authData.user) {
      return {
        success: false,
        message: '手機號碼或密碼錯誤',
      }
    }

    // 3. 查詢 profiles 驗證角色
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, tier_id')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      await supabase.auth.signOut()
      return {
        success: false,
        message: '找不到使用者資料',
      }
    }

    // 4. 驗證角色必須是 client
    if (profile.role !== 'client') {
      await supabase.auth.signOut()
      return {
        success: false,
        message: '此帳號無法使用前台登入',
      }
    }

    // 5. 登入成功,重導向至前台
    revalidatePath('/', 'layout')
  } catch (error) {
    console.error('loginWithPhone error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '登入失敗',
    }
  }

  // 6. 重導向 (必須在 try-catch 外)
  redirect('/store')
}

/**
 * 登出 (前後台共用)
 * 自動根據當前用戶角色導向對應的登入頁
 */
export async function logout(): Promise<void> {
  let targetLoginPage = '/login'

  try {
    const supabase = await createClient()

    // 先查詢當前用戶角色（在登出前）
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // 使用 Admin Client 繞過 RLS 查詢角色
      const adminClient = createAdminClient()
      const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // 如果是管理員，導向後台登入頁
      if (profile?.role === 'admin') {
        targetLoginPage = '/admin/login'
      }
    }

    // 執行登出
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('登出失敗:', error)
      throw new Error('登出失敗，請稍後再試')
    }

    revalidatePath('/', 'layout')
  } catch (error) {
    console.error('登出失敗:', error)
    throw error
  }

  redirect(targetLoginPage)
}
