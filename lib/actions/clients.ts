'use server'

import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { createClientSchema, updateClientSchema } from '@/lib/validations/user.schema'
import type { ActionResult, Client } from '@/types'
import { checkAuth } from './helpers'
import { revalidatePath } from 'next/cache'

/**
 * 產生隨機密碼 (8 碼英數混合)
 */
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

/**
 * 快速開戶:建立新客戶 (自動產生密碼)
 */
export async function createClient(
  prevState: any,
  formData: FormData
): Promise<ActionResult<{ id: string; password: string }>> {
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

    // 4. 產生隨機密碼
    const password = generatePassword()

    // 5. 建立 Auth 使用者
    // 使用 Email 註冊 (手機號碼@temp.local)
    const tempEmail = `${validatedFields.data.phone}@temp.local`
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: tempEmail,
      password,
      phone: validatedFields.data.phone,
      options: {
        data: {
          role: 'client',
        },
        emailRedirectTo: undefined,
      },
    })

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

    // 6. 更新 profiles (由 trigger 自動建立,這裡只更新額外資訊)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        tier_id: validatedFields.data.tier_id,
        display_name: validatedFields.data.display_name,
        notes: validatedFields.data.notes,
      })
      .eq('id', authData.user.id)

    if (updateError) {
      console.error('更新 profile 失敗:', updateError)
      // 不返回錯誤,因為使用者已建立成功
    }

    // 7. Revalidate
    revalidatePath('/admin/clients')

    return {
      success: true,
      data: {
        id: authData.user.id,
        password, // 返回密碼供管理員複製
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
