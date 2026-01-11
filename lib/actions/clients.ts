'use server'

import { createClient as createSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { createClientSchema, updateClientSchema, updatePasswordSchema } from '@/lib/validations/user.schema'
import { updateClientSchema as updateClientSchemaV2 } from '@/lib/validations/client.schema'
import type { ActionResult, Client, Profile, Tier } from '@/types'
import { checkAuth } from './helpers'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

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
): Promise<ActionResult<{ id: string; password: string; phone: string; display_name?: string }>> {
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

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 3. 檢查手機號碼是否已存在
    const { data: existingUser } = await adminClient
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

    // 5. 使用 Admin Client 建立 Auth 使用者 (避免自動登入)
    const tempEmail = `${validatedFields.data.phone}@temp.local`
    console.log('嘗試建立使用者:', { tempEmail, phone: validatedFields.data.phone })

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: tempEmail,
      password,
      email_confirm: true, // 自動確認 Email (跳過驗證流程)
      user_metadata: {
        role: 'client',
        phone: validatedFields.data.phone,
      },
    })

    console.log('Auth 註冊結果:', { user: authData?.user?.id, error: authError })

    // 如果錯誤是因為 Email 已存在 (表示手機號碼重複)
    if (authError?.message?.includes('already registered') || authError?.code === '23505') {
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
    // 使用 Admin Client 繞過 RLS
    const { error: insertError } = await adminClient
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
        const { error: updateError } = await adminClient
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

    // 9. 記錄操作日誌 (Feature 008)
    await logAudit({
      target_type: 'client',
      target_id: authData.user.id,
      action_type: 'created',
      new_values: {
        phone: validatedFields.data.phone,
        tier_id: validatedFields.data.tier_id,
        display_name: validatedFields.data.display_name,
      },
    })

    // 10. Revalidate
    revalidatePath('/admin/clients')

    return {
      success: true,
      data: {
        id: authData.user.id,
        password, // 返回密碼供管理員複製
        phone: validatedFields.data.phone, // 返回手機號碼
        display_name: validatedFields.data.display_name, // 返回顯示名稱
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

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 3. 檢查客戶是否存在
    const { data: existingClient } = await adminClient
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
    const { error } = await adminClient
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

  // 使用 Admin Client 繞過 RLS
  const adminClient = createAdminClient()

  // 建立查詢
  let query = adminClient
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

  // 轉換資料格式 (Feature 007: 新增 address 與 admin_notes 摘要)
  const clients: Client[] = (data || []).map((item: any) => ({
    id: item.id,
    phone: item.phone,
    display_name: item.display_name,
    role: item.role,
    tier_id: item.tier_id,
    tier_name: item.tiers?.name,
    notes: item.notes,
    address: item.address,  // 🆕 Feature 007
    admin_notes: item.admin_notes,  // 🆕 Feature 007
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
 * 篩選客戶列表 (Feature 006 - US6: 客戶管理快速切換與搜尋)
 * 支援等級篩選與關鍵字搜尋 (手機號碼、顯示名稱)
 */
export async function filterClients(params?: {
  tier_ids?: string[]  // 等級 ID 陣列 (多選)
  search?: string      // 搜尋關鍵字 (手機號碼或顯示名稱)
  limit?: number       // 回傳筆數上限
  offset?: number      // 分頁偏移量
}): Promise<ActionResult<{
  clients: Client[]
  total_count: number
  applied_filters: {
    tiers: Tier[]
    search: string
  }
}>> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    const { tier_ids = [], search = '', limit = 100, offset = 0 } = params || {}

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 2. 建立查詢
    let query = adminClient
      .from('profiles')
      .select('*, tiers(id, name)', { count: 'exact' })
      .eq('role', 'client')

    // 等級篩選 (OR 邏輯: 符合任一等級即可)
    if (tier_ids.length > 0) {
      query = query.in('tier_id', tier_ids)
    }

    // 搜尋條件 (手機號碼或顯示名稱)
    if (search) {
      query = query.or(`phone.ilike.%${search}%,display_name.ilike.%${search}%`)
    }

    // 排序與分頁
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('篩選客戶失敗:', error)
      return {
        success: false,
        message: '篩選失敗，請稍後再試',
      }
    }

    // 3. 轉換客戶資料格式
    const clients: Client[] = (data || []).map((item: any) => ({
      id: item.id,
      phone: item.phone,
      display_name: item.display_name,
      role: item.role,
      tier_id: item.tier_id,
      tier_name: item.tiers?.name,
      notes: item.notes,
      address: item.address,
      admin_notes: item.admin_notes,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }))

    // 4. 查詢已套用的等級資訊
    let appliedTiers: Tier[] = []
    if (tier_ids.length > 0) {
      const { data: tierData } = await adminClient
        .from('tiers')
        .select('id, name, rank, created_at, updated_at')
        .in('id', tier_ids)
        .order('rank', { ascending: true })

      appliedTiers = tierData || []
    }

    return {
      success: true,
      data: {
        clients,
        total_count: count || 0,
        applied_filters: {
          tiers: appliedTiers,
          search,
        },
      },
    }
  } catch (error) {
    console.error('filterClients error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '篩選失敗',
    }
  }
}

/**
 * 刪除客戶
 */
export async function deleteClient(id: string): Promise<ActionResult> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 2. 檢查客戶是否存在
    const { data: existingClient } = await adminClient
      .from('profiles')
      .select('id, role, phone, display_name')
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

    // 3. 使用 Admin Client 刪除 Auth 使用者
    // 注意：刪除客戶時，相關訂單的 user_id 會自動設為 NULL（ON DELETE SET NULL）
    // 優惠券記錄會自動刪除（user_coupons 使用 ON DELETE CASCADE）
    const { error: authError } = await adminClient.auth.admin.deleteUser(id)

    if (authError) {
      console.error('刪除 Auth 使用者失敗:', authError)
      return {
        success: false,
        message: `刪除失敗: ${authError.message}`,
      }
    }

    // 4. 再刪除 profile 資料 (cascade delete)
    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', id)

    if (profileError) {
      console.error('刪除客戶資料失敗:', profileError)
      // Auth 已刪除,Profile 失敗時記錄錯誤
      console.warn(`客戶 ${existingClient.phone} 的 auth 已刪除,但 profile 刪除失敗`)
      return {
        success: false,
        message: `Auth 已刪除但資料清理失敗: ${profileError.message}`,
      }
    }

    // 5. 記錄操作日誌
    await logAudit({
      target_type: 'client',
      target_id: id,
      action_type: 'deleted',
      old_values: {
        phone: existingClient.phone,
        display_name: existingClient.display_name,
      },
    })

    // 6. Revalidate
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

/**
 * 修改客戶密碼
 */
export async function updateClientPassword(
  id: string,
  prevState: any,
  formData: FormData
): Promise<ActionResult> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 2. 驗證輸入
    const validatedFields = updatePasswordSchema.safeParse({
      newPassword: formData.get('newPassword'),
      confirmPassword: formData.get('confirmPassword'),
    })

    if (!validatedFields.success) {
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors,
        message: '驗證失敗',
      }
    }

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 3. 檢查客戶是否存在
    const { data: existingClient } = await adminClient
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

    // 4. 使用 Admin Client 更新密碼
    const { error } = await adminClient.auth.admin.updateUserById(id, {
      password: validatedFields.data.newPassword,
    })

    if (error) {
      console.error('更新密碼失敗:', error)
      return {
        success: false,
        message: `更新密碼失敗: ${error.message}`,
      }
    }

    return {
      success: true,
      message: '密碼更新成功',
    }
  } catch (error) {
    console.error('updateClientPassword error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新密碼失敗',
    }
  }
}

// ===================================
// Feature 006: Excel 匯入/匯出功能 (US7)
// ===================================

/**
 * 匯出客戶資料為 Excel 檔案
 * Feature 006 - User Story 7
 */
export async function exportClients(filters?: {
  tier_id?: string
  search?: string
  created_after?: string
}): Promise<ActionResult<{
  file_name: string
  file_buffer: number[] // Changed from Buffer to number[]
  row_count: number
  columns: string[]
}>> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 2. 驗證篩選條件
    const { clientExportFiltersSchema } = await import('@/lib/validations/excel.schema')
    const validatedFilters = clientExportFiltersSchema.safeParse(filters || {})

    if (!validatedFilters.success) {
      return {
        success: false,
        errors: validatedFilters.error.flatten().fieldErrors,
        message: '篩選條件驗證失敗',
      }
    }

    const adminClient = createAdminClient()

    // 3. 查詢客戶資料
    let query = adminClient
      .from('profiles')
      .select('phone, display_name, tier:tiers(name), address, admin_notes, created_at')
      .eq('role', 'client')
      .order('created_at', { ascending: false })

    // 套用篩選條件
    if (validatedFilters.data.tier_id) {
      query = query.eq('tier_id', validatedFilters.data.tier_id)
    }

    if (validatedFilters.data.search) {
      query = query.or(`phone.ilike.%${validatedFilters.data.search}%,display_name.ilike.%${validatedFilters.data.search}%`)
    }

    if (validatedFilters.data.created_after) {
      query = query.gte('created_at', validatedFilters.data.created_after)
    }

    const { data: clients, error } = await query

    if (error) {
      console.error('查詢客戶資料失敗:', error)
      return {
        success: false,
        message: '查詢客戶資料失敗',
      }
    }

    if (!clients || clients.length === 0) {
      return {
        success: false,
        message: '無符合條件的客戶資料',
      }
    }

    // 4. 轉換為 Excel 格式
    const excelData = clients.map((c: any) => ({
      '手機號碼': c.phone || '',
      '姓名': c.display_name || '',
      '會員等級': c.tier?.name || '',
      '常用地址': c.address || '',
      '備註': c.admin_notes || '',
      '建立時間': new Date(c.created_at).toLocaleDateString('zh-TW'),
    }))

    // 5. 產生 Excel 檔案
    const { jsonToExcelBuffer, generateExcelFileName } = await import('@/lib/utils/excel')
    const excelBuffer = jsonToExcelBuffer(excelData, '客戶列表')
    const fileName = generateExcelFileName('客戶資料')

    return {
      success: true,
      data: {
        file_name: fileName,
        file_buffer: Array.from(excelBuffer), // Convert Buffer to number array
        row_count: clients.length,
        columns: ['手機號碼', '姓名', '會員等級', '常用地址', '備註', '建立時間'],
      },
      message: `成功匯出 ${clients.length} 筆客戶資料`,
    }
  } catch (error) {
    console.error('exportClients error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '匯出失敗',
    }
  }
}

/**
 * 匯入客戶資料 (批次建立)
 * Feature 006 - User Story 7
 */
export async function importClients(
  file: File,
  options?: {
    dry_run?: boolean
    skip_errors?: boolean
  }
): Promise<ActionResult<{
  total_rows: number
  success_count: number
  error_count: number
  errors: Array<{
    row_number: number
    field: string
    value: any
    message: string
  }>
  dry_run: boolean
}>> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 2. 驗證檔案格式與大小
    const { validateExcelFile } = await import('@/lib/utils/excel')
    const fileValidation = validateExcelFile(file)

    if (!fileValidation.valid) {
      return {
        success: false,
        message: fileValidation.error || '檔案驗證失敗',
      }
    }

    // 3. 解析 Excel 檔案
    const buffer = await file.arrayBuffer()
    const { excelBufferToJson, isExcelDataEmpty } = await import('@/lib/utils/excel')
    const rawData = await excelBufferToJson(buffer)

    if (isExcelDataEmpty(rawData)) {
      return {
        success: false,
        message: 'Excel 檔案為空',
      }
    }

    if (rawData.length > 1000) {
      return {
        success: false,
        message: '單次匯入最多 1000 筆資料',
      }
    }

    // 4. 驗證資料格式
    const { clientImportSchema } = await import('@/lib/validations/excel.schema')
    const errors: Array<{
      row_number: number
      field: string
      value: any
      message: string
    }> = []
    const validClients: Array<{
      phone: string
      name: string
      tier_id: string
      address?: string
      admin_notes?: string
      password: string
    }> = []

    const adminClient = createAdminClient()

    // 先查詢所有會員等級 (避免重複查詢)
    const { data: tiers } = await adminClient
      .from('tiers')
      .select('id, name')

    const tierMap = new Map((tiers || []).map((t: any) => [t.name, t.id]))

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]
      const rowNumber = i + 2 // Excel 第 1 列為標題

      try {
        // 驗證資料格式
        const validatedRow = clientImportSchema.safeParse(row)

        if (!validatedRow.success) {
          const firstError = validatedRow.error.issues[0]
          errors.push({
            row_number: rowNumber,
            field: firstError.path[0] as string,
            value: row[firstError.path[0] as string],
            message: firstError.message,
          })
          continue
        }

        // 驗證會員等級是否存在
        const tierId = tierMap.get(row['會員等級'])
        if (!tierId) {
          errors.push({
            row_number: rowNumber,
            field: '會員等級',
            value: row['會員等級'],
            message: '會員等級不存在',
          })
          continue
        }

        // 檢查手機號碼是否已存在
        const { data: existingClient } = await adminClient
          .from('profiles')
          .select('id')
          .eq('phone', row['手機號碼'])
          .single()

        if (existingClient) {
          errors.push({
            row_number: rowNumber,
            field: '手機號碼',
            value: row['手機號碼'],
            message: '手機號碼已存在',
          })
          continue
        }

        validClients.push({
          phone: row['手機號碼'],
          name: row['姓名'],
          tier_id: tierId,
          address: row['常用地址'] || undefined,
          admin_notes: row['備註'] || undefined,
          password: row['密碼'] || row['手機號碼'].slice(-6), // 預設密碼為手機後 6 碼
        })
      } catch (error) {
        errors.push({
          row_number: rowNumber,
          field: '未知',
          value: null,
          message: error instanceof Error ? error.message : '驗證失敗',
        })
      }
    }

    // 5. 試算模式 (不寫入)
    if (options?.dry_run) {
      return {
        success: true,
        data: {
          total_rows: rawData.length,
          success_count: validClients.length,
          error_count: errors.length,
          errors,
          dry_run: true,
        },
        message: `試算完成: ${validClients.length} 筆有效，${errors.length} 筆錯誤`,
      }
    }

    // 6. 批次寫入資料庫
    let successCount = 0
    for (const client of validClients) {
      try {
        // 建立 Auth 使用者
        const tempEmail = `${client.phone}@temp.local`
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: tempEmail,
          password: client.password,
          email_confirm: true,
          user_metadata: {
            role: 'client',
            phone: client.phone,
          },
        })

        if (authError || !authData.user) {
          errors.push({
            row_number: 0,
            field: 'database',
            value: client.phone,
            message: `建立使用者失敗: ${authError?.message}`,
          })
          continue
        }

        // 建立 profile
        const { error: insertError } = await adminClient
          .from('profiles')
          .insert({
            id: authData.user.id,
            phone: client.phone,
            role: 'client',
            tier_id: client.tier_id,
            display_name: client.name,
            address: client.address,
            admin_notes: client.admin_notes,
          })

        if (insertError) {
          errors.push({
            row_number: 0,
            field: 'database',
            value: client.phone,
            message: `建立客戶資料失敗: ${insertError.message}`,
          })
          continue
        }

        successCount++
      } catch (error) {
        errors.push({
          row_number: 0,
          field: 'database',
          value: client.phone,
          message: `寫入失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        })
      }
    }

    // 7. Revalidate
    revalidatePath('/admin/clients')

    return {
      success: true,
      data: {
        total_rows: rawData.length,
        success_count: successCount,
        error_count: errors.length,
        errors,
        dry_run: false,
      },
      message: `匯入完成: ${successCount} 筆成功，${errors.length} 筆失敗`,
    }
  } catch (error) {
    console.error('importClients error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '匯入失敗',
    }
  }
}

/**
 * 下載客戶匯入範本
 * Feature 006 - User Story 7
 */
export async function downloadClientTemplate(): Promise<ActionResult<{
  file_name: string
  file_buffer: number[] // Changed from Buffer to number[]
  row_count: number
  columns: string[]
}>> {
  try {
    // 驗證權限
    await checkAuth('admin')

    const adminClient = createAdminClient()

    // 查詢第一個會員等級作為範例
    const { data: tiers } = await adminClient
      .from('tiers')
      .select('name')
      .order('rank', { ascending: true })
      .limit(1)

    const exampleTierName = tiers?.[0]?.name || '批發'

    // 建立範本資料
    const templateData = [
      {
        '手機號碼': '0912345678',
        '姓名': '範例姓名',
        '會員等級': exampleTierName,
        '常用地址': '台北市信義區信義路五段7號',
        '備註': '這是管理員備註',
        '密碼': '123456',
      },
    ]

    // 產生 Excel 檔案
    const { jsonToExcelBuffer } = await import('@/lib/utils/excel')
    const excelBuffer = jsonToExcelBuffer(templateData, '客戶列表')

    return {
      success: true,
      data: {
        file_name: '客戶匯入範本.xlsx',
        file_buffer: Array.from(excelBuffer), // Convert Buffer to number array
        row_count: 1,
        columns: ['手機號碼', '姓名', '會員等級', '常用地址', '備註', '密碼'],
      },
      message: '範本下載成功',
    }
  } catch (error) {
    console.error('downloadClientTemplate error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '下載範本失敗',
    }
  }
}

// ===================================
// Feature 007: 客戶資訊完整化管理
// ===================================

/**
 * 查詢客戶資料 (客戶端) - 排除 admin_notes
 * Feature 007 - User Story 2
 */
export async function getClientProfile(clientId: string): Promise<ActionResult<Omit<Profile, 'admin_notes'>>> {
  try {
    // 1. 驗證權限 (僅客戶可查詢自己的資料)
    const authContext = await checkAuth('client')

    // 2. 權限檢查 - 客戶僅能查詢自己的資料
    if (authContext.role === 'client' && authContext.userId !== clientId) {
      return {
        success: false,
        message: '您無權查詢此客戶資料',
      }
    }

    const supabase = await createSupabaseClient()

    // 3. 查詢客戶資料 (明確排除 admin_notes)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, phone, email, role, tier_id, display_name, notes, address, created_at')
      .eq('id', clientId)
      .single()

    if (error) {
      console.error('查詢客戶資料失敗:', error)
      return {
        success: false,
        message: '查詢失敗',
      }
    }

    if (!data) {
      return {
        success: false,
        message: '客戶不存在',
      }
    }

    return {
      success: true,
      data: data as Omit<Profile, 'admin_notes'>,
    }
  } catch (error) {
    console.error('getClientProfile error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢失敗',
    }
  }
}

/**
 * 查詢客戶資料 (管理端) - 包含 admin_notes
 * Feature 007 - User Story 2
 */
export async function getAdminClientProfile(clientId: string): Promise<ActionResult<Profile>> {
  try {
    // 1. 驗證權限 (僅管理員)
    await checkAuth('admin')

    const adminClient = createAdminClient()

    // 2. 查詢客戶資料 (包含所有欄位)
    const { data, error } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', clientId)
      .single()

    if (error) {
      console.error('查詢客戶資料失敗:', error)
      return {
        success: false,
        message: '查詢失敗',
      }
    }

    if (!data) {
      return {
        success: false,
        message: '客戶不存在',
      }
    }

    return {
      success: true,
      data: data as Profile,
    }
  } catch (error) {
    console.error('getAdminClientProfile error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢失敗',
    }
  }
}

/**
 * 更新客戶資料 V2 (管理端) - 支援 address 與 admin_notes
 * Feature 007 - User Story 2
 */
export async function updateClientV2(
  input: {
    clientId: string
    displayName?: string
    tierId?: string
    address?: string | null
    adminNotes?: string | null
  }
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 2. 驗證輸入
    const validatedFields = updateClientSchemaV2.safeParse(input)

    if (!validatedFields.success) {
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors,
        message: '驗證失敗',
      }
    }

    const adminClient = createAdminClient()

    // 3. 檢查客戶是否存在並取得舊值 (用於 audit log)
    const { data: existingClient } = await adminClient
      .from('profiles')
      .select('id, role, display_name, tier_id, address, admin_notes')
      .eq('id', input.clientId)
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

    // 4. 準備更新資料
    const updateData: any = {}
    if (validatedFields.data.displayName !== undefined) updateData.display_name = validatedFields.data.displayName
    if (validatedFields.data.tierId !== undefined) updateData.tier_id = validatedFields.data.tierId
    if (validatedFields.data.address !== undefined) updateData.address = validatedFields.data.address
    if (validatedFields.data.adminNotes !== undefined) updateData.admin_notes = validatedFields.data.adminNotes

    // 5. 更新客戶資料
    const { error } = await adminClient
      .from('profiles')
      .update(updateData)
      .eq('id', input.clientId)

    if (error) {
      console.error('更新客戶失敗:', error)
      return {
        success: false,
        message: '更新失敗,請稍後再試',
      }
    }

    // 6. 記錄操作日誌 (Feature 008)
    await logAudit({
      target_type: 'client',
      target_id: input.clientId,
      action_type: 'updated',
      old_values: {
        display_name: existingClient.display_name,
        tier_id: existingClient.tier_id,
        address: existingClient.address,
        admin_notes: existingClient.admin_notes,
      },
      new_values: updateData,
    })

    // 7. Revalidate
    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${input.clientId}`)

    return {
      success: true,
      data: { id: input.clientId },
      message: '客戶更新成功',
    }
  } catch (error) {
    console.error('updateClientV2 error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新失敗',
    }
  }
}

/**
 * 快速更新客戶備註與地址 (用於訂單詳情頁面快速編輯)
 * Feature: 訂單詳情頁面客戶資訊快速查看與編輯
 */
export async function updateClientQuickInfo(
  id: string,
  data: {
    address?: string | null
    admin_notes?: string | null
  }
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. 驗證權限
    const { userId } = await checkAuth('admin')

    // 2. 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 3. 檢查客戶是否存在
    const { data: existingClient } = await adminClient
      .from('profiles')
      .select('id, role, phone, display_name')
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
    const { error } = await adminClient
      .from('profiles')
      .update({
        address: data.address,
        admin_notes: data.admin_notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('更新客戶快速資訊失敗:', error)
      return {
        success: false,
        message: '更新失敗,請稍後再試',
      }
    }

    // 5. 記錄操作日誌
    await logAudit({
      action_type: 'updated',
      target_type: 'client',
      target_id: id,
      new_values: {
        address: data.address,
        admin_notes: data.admin_notes,
      },
      notes: '快速更新客戶備註與地址',
    })

    // 6. Revalidate
    revalidatePath('/admin/clients')
    revalidatePath('/admin/orders')

    return {
      success: true,
      data: { id },
      message: '客戶資料已更新',
    }
  } catch (error) {
    console.error('updateClientQuickInfo error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新失敗',
    }
  }
}
