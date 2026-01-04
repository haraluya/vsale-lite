'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'
import type { ActionResult, SystemSetting, ParsedSetting, SettingValueType, SettingCategory } from '@/types'

/**
 * 系統設定管理 Server Actions
 * Feature: 008-system-admin (User Story 4)
 */

/**
 * 解析設定值（TEXT → 實際型別）
 * 內部輔助函式，不需要 export
 */
function parseSettingValue(
  value: string,
  valueType: SettingValueType
): string | number | boolean | object {
  switch (valueType) {
    case 'number':
      return parseFloat(value)
    case 'boolean':
      return value === 'true'
    case 'json':
      return JSON.parse(value)
    default:
      return value
  }
}

/**
 * 序列化設定值（實際型別 → TEXT）
 * 內部輔助函式，不需要 export
 */
function serializeSettingValue(
  value: string | number | boolean | object,
  valueType: SettingValueType
): string {
  if (valueType === 'json') {
    return JSON.stringify(value)
  }
  return String(value)
}

/**
 * 驗證值類型
 */
function validateValueType(value: any, expectedType: SettingValueType): boolean {
  switch (expectedType) {
    case 'number':
      return typeof value === 'number'
    case 'boolean':
      return typeof value === 'boolean'
    case 'json':
      return typeof value === 'object'
    default:
      return typeof value === 'string'
  }
}

/**
 * T051: 查詢系統設定（管理員專用，含私密設定）
 */
export async function getSettings(
  category?: SettingCategory
): Promise<ActionResult<ParsedSetting[]>> {
  try {
    // 驗證管理員權限
    await checkAuth('admin')

    const adminClient = createAdminClient()

    let query = adminClient
      .from('system_settings')
      .select('key, value, value_type, category, description')
      .order('category', { ascending: true })
      .order('key', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }

    const { data: settings, error } = await query

    if (error) {
      console.error('[getSettings] Database error:', error)
      return {
        success: false,
        message: '查詢系統設定失敗',
      }
    }

    // 解析設定值
    const parsed: ParsedSetting[] = (settings || []).map((s) => ({
      key: s.key,
      value: parseSettingValue(s.value, s.value_type as SettingValueType),
      value_type: s.value_type as SettingValueType,
      description: s.description,
    }))

    return {
      success: true,
      data: parsed,
    }
  } catch (error) {
    console.error('[getSettings] Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢失敗',
    }
  }
}

/**
 * T052: 查詢公開設定（客戶與未登入使用者可讀）
 */
export async function getPublicSettings(): Promise<ActionResult<ParsedSetting[]>> {
  try {
    const supabase = await createClient()

    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('key, value, value_type, description')
      .eq('is_public', true)
      .order('key', { ascending: true })

    if (error) {
      console.error('[getPublicSettings] Database error:', error)
      return {
        success: false,
        message: '查詢公開設定失敗',
      }
    }

    // 解析設定值
    const parsed: ParsedSetting[] = (settings || []).map((s) => ({
      key: s.key,
      value: parseSettingValue(s.value, s.value_type as SettingValueType),
      value_type: s.value_type as SettingValueType,
      description: s.description,
    }))

    return {
      success: true,
      data: parsed,
    }
  } catch (error) {
    console.error('[getPublicSettings] Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢失敗',
    }
  }
}

/**
 * T053: 更新單一系統設定
 */
export async function updateSetting(input: {
  key: string
  value: string | number | boolean | object
}): Promise<ActionResult<{ key: string; value: string }>> {
  try {
    // 1. 驗證管理員權限
    const { userId } = await checkAuth('admin')

    // 2. 驗證 key 格式
    if (!/^[a-z0-9_]+$/.test(input.key)) {
      return {
        success: false,
        message: '設定鍵格式錯誤',
      }
    }

    const adminClient = createAdminClient()

    // 3. 查詢設定的 value_type（確保值類型正確）
    const { data: setting, error: fetchError } = await adminClient
      .from('system_settings')
      .select('value_type, value')
      .eq('key', input.key)
      .single()

    if (fetchError || !setting) {
      console.error('[updateSetting] Setting not found:', input.key)
      return {
        success: false,
        message: '設定不存在',
      }
    }

    // 4. 驗證值類型
    if (!validateValueType(input.value, setting.value_type as SettingValueType)) {
      return {
        success: false,
        message: '值類型錯誤',
      }
    }

    // 5. 轉換值為 TEXT 格式儲存
    const valueString = serializeSettingValue(
      input.value,
      setting.value_type as SettingValueType
    )

    // 6. 更新設定
    const { error: updateError } = await adminClient
      .from('system_settings')
      .update({
        value: valueString,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('key', input.key)

    if (updateError) {
      console.error('[updateSetting] Update error:', updateError)
      return {
        success: false,
        message: '更新設定失敗',
      }
    }

    // 7. 記錄操作日誌
    await logAudit({
      target_type: 'system_setting',
      target_id: input.key,
      action_type: 'updated',
      old_values: { value: setting.value },
      new_values: { value: valueString },
    })

    // 8. 執行全站重新驗證（設定變更影響全站）
    revalidatePath('/', 'layout')

    return {
      success: true,
      data: {
        key: input.key,
        value: valueString,
      },
      message: '設定更新成功',
    }
  } catch (error) {
    console.error('[updateSetting] Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新失敗',
    }
  }
}

/**
 * T054: 上傳 Logo 圖片（完整版、圖示版、Favicon）
 */
export async function uploadLogo(input: {
  logoType: 'logo' | 'logo-icon' | 'favicon'
  file: File
}): Promise<ActionResult<{ publicUrl: string }>> {
  try {
    // 1. 驗證管理員權限
    const { userId } = await checkAuth('admin')

    // 2. 檔案驗證
    const MAX_SIZE = 2 * 1024 * 1024 // 2MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']

    if (!ALLOWED_TYPES.includes(input.file.type)) {
      return {
        success: false,
        message: '僅支援 JPG、PNG、WebP、SVG 格式',
      }
    }

    if (input.file.size > MAX_SIZE) {
      return {
        success: false,
        message: '檔案大小不得超過 2MB',
      }
    }

    // 3. 上傳至 Supabase Storage
    const supabase = await createClient()
    const fileExt = input.file.name.split('.').pop()
    const filePath = `system/${input.logoType}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('products') // 使用現有的 products bucket
      .upload(filePath, input.file, {
        upsert: true, // 覆寫舊圖片
        contentType: input.file.type,
      })

    if (uploadError) {
      console.error('[uploadLogo] Upload error:', uploadError)
      return {
        success: false,
        message: '圖片上傳失敗',
      }
    }

    // 4. 取得公開 URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('products').getPublicUrl(filePath)

    // 5. 更新 system_settings 表
    const adminClient = createAdminClient()
    const settingKey = `${input.logoType.replace('-', '_')}_url` // logo-icon → logo_icon_url

    const { error: updateError } = await adminClient
      .from('system_settings')
      .update({
        value: publicUrl,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('key', settingKey)

    if (updateError) {
      console.error('[uploadLogo] Update setting error:', updateError)
      return {
        success: false,
        message: '更新設定失敗',
      }
    }

    // 6. 記錄操作日誌
    await logAudit({
      target_type: 'system_setting',
      target_id: settingKey,
      action_type: 'updated',
      old_values: null,
      new_values: { logo_url: publicUrl },
      notes: `上傳 ${input.logoType} 圖片`,
    })

    // 7. 執行全站重新驗證
    revalidatePath('/', 'layout')

    return {
      success: true,
      data: { publicUrl },
      message: 'Logo 上傳成功',
    }
  } catch (error) {
    console.error('[uploadLogo] Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '上傳失敗',
    }
  }
}

/**
 * T055: 刪除 Logo 圖片
 */
export async function deleteLogo(
  logoType: 'logo' | 'logo-icon' | 'favicon'
): Promise<ActionResult<{ logoType: string }>> {
  try {
    // 1. 驗證管理員權限
    const { userId } = await checkAuth('admin')

    const supabase = await createClient()
    const adminClient = createAdminClient()

    // 2. 查詢舊的 Logo URL（用於刪除 Storage 檔案）
    const settingKey = `${logoType.replace('-', '_')}_url`

    const { data: setting, error: fetchError } = await adminClient
      .from('system_settings')
      .select('value')
      .eq('key', settingKey)
      .single()

    if (fetchError || !setting || !setting.value) {
      return {
        success: false,
        message: 'Logo 不存在或已刪除',
      }
    }

    // 3. 從 URL 提取檔案路徑
    const urlParts = setting.value.split('/')
    const fileName = urlParts[urlParts.length - 1]
    const filePath = `system/${fileName}`

    // 4. 刪除 Supabase Storage 檔案
    const { error: deleteError } = await supabase.storage
      .from('products')
      .remove([filePath])

    // 5. 更新 system_settings 表（清空 URL）
    const { error: updateError } = await adminClient
      .from('system_settings')
      .update({
        value: '',
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('key', settingKey)

    if (updateError) {
      console.error('[deleteLogo] Update setting error:', updateError)
      return {
        success: false,
        message: '更新設定失敗',
      }
    }

    // 6. 記錄操作日誌
    await logAudit({
      target_type: 'system_setting',
      target_id: settingKey,
      action_type: 'updated',
      old_values: { logo_url: setting.value },
      new_values: { logo_url: '' },
      notes: `刪除 ${logoType} 圖片`,
    })

    // 7. 執行全站重新驗證
    revalidatePath('/', 'layout')

    return {
      success: true,
      data: { logoType },
      message: 'Logo 已刪除',
    }
  } catch (error) {
    console.error('[deleteLogo] Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '刪除失敗',
    }
  }
}
