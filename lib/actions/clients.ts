'use server'

import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { createClientSchema, updateClientSchema } from '@/lib/validations/user.schema'
import type { ActionResult, Client } from '@/types'
import { checkAuth } from './helpers'
import { revalidatePath } from 'next/cache'

/**
 * 產生預設密碼 (使用電話號碼後6碼)
 */
function generatePassword(phone: string): string {
  return phone.slice(-6)
}

/**
 * 快速開戶:建立新客戶 (自動產生密碼)
 */
export async function createClient(
  prevState: any,
  formData: FormData
): Promise<ActionResult<{ id: string; password: string; phone: string }>> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 2. 驗證輸入
    const validatedFields = createClientSchema.safeParse({
      phone: formData.get('phone'),
      tier_id: formData.get('tier_id'),
      display_name: formData.get('display_name') || undefined,
      notes: formData.get('notes') || undefined,
    })

    if (!validatedFields.success) {
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors,
        message: '驗證失敗',
      }
    }

    const supabase = await createSupabaseClient()

    // 3. 檢查手機號碼是否已存在
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', validatedFields.data.phone)
      .single()

    if (existingUser) {
      return {
        success: false,
        message: '此手機號碼已被使用',
      }
    }

    // 4. 產生預設密碼 (電話後6碼)
    const password = generatePassword(validatedFields.data.phone)

    // 5. 建立 Auth 使用者
    // 使用 Email 註冊 (手機號碼@temp.local)
    const tempEmail = `${validatedFields.data.phone}@temp.local`
    console.log('嘗試建立使用者:', { tempEmail, phone: validatedFields.data.phone })

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: tempEmail,
      password,
      options: {
        data: {
          role: 'client',
          phone: validatedFields.data.phone, // 將手機號碼放在 metadata 中
        },
        emailRedirectTo: undefined,
      },
    })

    console.log('Auth 註冊結果:', { user: authData?.user?.id, error: authError })

    // 如果錯誤是因為 Email 已存在 (表示手機號碼重複)
    if (authError?.message?.includes('already registered')) {
      return {
        success: false,
        message: '此手機號碼已被使用',
      }
    }

    if (authError || !authData.user) {
      console.error('建立 Auth 使用者失敗:', authError)
      return {
        success: false,
        message: authError?.message || '建立失敗,請稍後再試',
      }
    }

    // 6. 手動建立 profile (不依賴 trigger,因為我們用 Email 註冊,phone 欄位會是 null)
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        phone: validatedFields.data.phone,
        role: 'client',
        tier_id: validatedFields.data.tier_id,
        display_name: validatedFields.data.display_name,
        notes: validatedFields.data.notes,
      })

    if (insertError) {
      console.error('建立 profile 失敗:', insertError)
      // 如果是重複建立,改用 update
      if (insertError.code === '23505') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            phone: validatedFields.data.phone,
            role: 'client',
            tier_id: validatedFields.data.tier_id,
            display_name: validatedFields.data.display_name,
            notes: validatedFields.data.notes,
          })
          .eq('id', authData.user.id)

        if (updateError) {
          console.error('更新 profile 失敗:', updateError)
          return {
            success: false,
            message: `使用者已建立但資料更新失敗: ${updateError.message}`,
          }
        }
      } else {
        return {
          success: false,
          message: `建立客戶資料失敗: ${insertError.message}`,
        }
      }
    }

    console.log('Profile 建立成功:', authData.user.id)

    // 9. Revalidate
    revalidatePath('/admin/clients')

    return {
      success: true,
      data: {
        id: authData.user.id,
        password, // 返回密碼供管理員複製
        phone: validatedFields.data.phone, // 返回手機號碼
      },
      message: '客戶建立成功',
    }
  } catch (error) {
    console.error('createClient error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '建立失敗',
    }
  }
}

/**
 * 更新客戶資料 (主要用於變更等級)
 */
export async function updateClient(
  id: string,
  prevState: any,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 2. 驗證輸入
    const validatedFields = updateClientSchema.safeParse({
      tier_id: formData.get('tier_id') || undefined,
      display_name: formData.get('display_name') || undefined,
      notes: formData.get('notes') || undefined,
    })

    if (!validatedFields.success) {
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors,
        message: '驗證失敗',
      }
    }

    const supabase = await createSupabaseClient()

    // 3. 檢查客戶是否存在
    const { data: existingClient } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', id)
      .single()

    if (!existingClient) {
      return {
        success: false,
        message: '客戶不存在',
      }
    }

    if (existingClient.role !== 'client') {
      return {
        success: false,
        message: '此帳號不是客戶',
      }
    }

    // 4. 更新客戶資料
    const { error } = await supabase
      .from('profiles')
      .update(validatedFields.data)
      .eq('id', id)

    if (error) {
      console.error('更新客戶失敗:', error)
      return {
        success: false,
        message: '更新失敗,請稍後再試',
      }
    }

    // 5. Revalidate
    revalidatePath('/admin/clients')

    return {
      success: true,
      data: { id },
      message: '客戶更新成功',
    }
  } catch (error) {
    console.error('updateClient error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新失敗',
    }
  }
}

/**
 * 查詢客戶列表 (含搜尋與分頁)
 */
export async function getClients(params?: {
  search?: string
  tier_id?: string
  page?: number
  limit?: number
}): Promise<{
  clients: Client[]
  total: number
  page: number
  limit: number
}> {
  const { search = '', tier_id, page = 1, limit = 20 } = params || {}

  const supabase = await createSupabaseClient()

  // 建立查詢
  let query = supabase
    .from('profiles')
    .select('*, tiers(name)', { count: 'exact' })
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  // 搜尋條件 (手機號碼或顯示名稱)
  if (search) {
    query = query.or(`phone.ilike.%${search}%,display_name.ilike.%${search}%`)
  }

  // 等級篩選
  if (tier_id) {
    query = query.eq('tier_id', tier_id)
  }

  // 分頁
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('查詢客戶列表失敗:', error)
    return { clients: [], total: 0, page, limit }
  }

  // 轉換資料格式
  const clients: Client[] = (data || []).map((item: any) => ({
    id: item.id,
    phone: item.phone,
    display_name: item.display_name,
    role: item.role,
    tier_id: item.tier_id,
    tier_name: item.tiers?.name,
    notes: item.notes,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }))

  return {
    clients,
    total: count || 0,
    page,
    limit,
  }
}

/**
 * 刪除客戶
 */
export async function deleteClient(id: string): Promise<ActionResult> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    const supabase = await createSupabaseClient()

    // 2. 檢查客戶是否存在
    const { data: existingClient } = await supabase
      .from('profiles')
      .select('id, role, phone')
      .eq('id', id)
      .single()

    if (!existingClient) {
      return {
        success: false,
        message: '客戶不存在',
      }
    }

    if (existingClient.role !== 'client') {
      return {
        success: false,
        message: '此帳號不是客戶',
      }
    }

    // 3. 刪除 profile 資料
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (profileError) {
      console.error('刪除客戶資料失敗:', profileError)
      return {
        success: false,
        message: '刪除失敗,請稍後再試',
      }
    }

    // 4. 刪除 Auth 使用者 (需要 admin 權限)
    const { error: authError } = await supabase.auth.admin.deleteUser(id)

    if (authError) {
      console.error('刪除 Auth 使用者失敗:', authError)
      // Profile 已刪除,Auth 失敗時記錄錯誤但仍返回成功
      console.warn(`客戶 ${existingClient.phone} 的 profile 已刪除,但 auth 刪除失敗`)
    }

    // 5. Revalidate
    revalidatePath('/admin/clients')

    return {
      success: true,
      message: '客戶刪除成功',
    }
  } catch (error) {
    console.error('deleteClient error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '刪除失敗',
    }
  }
}
