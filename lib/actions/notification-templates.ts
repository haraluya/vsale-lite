'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'
import type { ActionResult, NotificationTemplate } from '@/types'

/**
 * 客戶通知範本管理 Server Actions
 * Feature: 多範本管理系統
 */

/**
 * 查詢所有通知範本
 */
export async function getNotificationTemplates(): Promise<
  ActionResult<NotificationTemplate[]>
> {
  try {
    await checkAuth('admin')

    const adminClient = createAdminClient()

    const { data: templates, error } = await adminClient
      .from('notification_templates')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[getNotificationTemplates] Database error:', error)
      return {
        success: false,
        message: '查詢範本失敗',
      }
    }

    return {
      success: true,
      data: templates || [],
    }
  } catch (error) {
    console.error('[getNotificationTemplates] Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢失敗',
    }
  }
}

/**
 * 查詢預設範本
 */
export async function getDefaultTemplate(): Promise<
  ActionResult<NotificationTemplate>
> {
  try {
    await checkAuth('admin')

    const adminClient = createAdminClient()

    const { data: template, error } = await adminClient
      .from('notification_templates')
      .select('*')
      .eq('is_default', true)
      .single()

    if (error || !template) {
      console.error('[getDefaultTemplate] Database error:', error)
      return {
        success: false,
        message: '查詢預設範本失敗',
      }
    }

    return {
      success: true,
      data: template,
    }
  } catch (error) {
    console.error('[getDefaultTemplate] Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢失敗',
    }
  }
}

/**
 * 建立新範本
 */
export async function createNotificationTemplate(input: {
  name: string
  template: string
  is_default?: boolean
}): Promise<ActionResult<NotificationTemplate>> {
  try {
    const { userId } = await checkAuth('admin')

    // 驗證
    if (!input.name.trim()) {
      return {
        success: false,
        message: '範本名稱不可為空',
      }
    }

    if (!input.template.trim()) {
      return {
        success: false,
        message: '範本內容不可為空',
      }
    }

    const adminClient = createAdminClient()

    // 檢查名稱是否重複
    const { data: existing } = await adminClient
      .from('notification_templates')
      .select('id')
      .eq('name', input.name.trim())
      .single()

    if (existing) {
      return {
        success: false,
        message: '範本名稱已存在',
      }
    }

    // 建立範本
    const { data: template, error } = await adminClient
      .from('notification_templates')
      .insert({
        name: input.name.trim(),
        template: input.template,
        is_default: input.is_default || false,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single()

    if (error || !template) {
      console.error('[createNotificationTemplate] Insert error:', error)
      return {
        success: false,
        message: '建立範本失敗',
      }
    }

    // 記錄操作日誌
    await logAudit({
      target_type: 'notification_template',
      target_id: template.id,
      action_type: 'created',
      old_values: null,
      new_values: { name: template.name },
    })

    revalidatePath('/admin/system/settings')

    return {
      success: true,
      data: template,
      message: '範本建立成功',
    }
  } catch (error) {
    console.error('[createNotificationTemplate] Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '建立失敗',
    }
  }
}

/**
 * 更新範本
 */
export async function updateNotificationTemplate(input: {
  id: string
  name?: string
  template?: string
  is_default?: boolean
}): Promise<ActionResult<NotificationTemplate>> {
  try {
    const { userId } = await checkAuth('admin')

    const adminClient = createAdminClient()

    // 查詢原始資料
    const { data: original, error: fetchError } = await adminClient
      .from('notification_templates')
      .select('*')
      .eq('id', input.id)
      .single()

    if (fetchError || !original) {
      return {
        success: false,
        message: '範本不存在',
      }
    }

    // 驗證
    if (input.name !== undefined && !input.name.trim()) {
      return {
        success: false,
        message: '範本名稱不可為空',
      }
    }

    if (input.template !== undefined && !input.template.trim()) {
      return {
        success: false,
        message: '範本內容不可為空',
      }
    }

    // 如果修改名稱，檢查是否重複
    if (input.name && input.name !== original.name) {
      const { data: existing } = await adminClient
        .from('notification_templates')
        .select('id')
        .eq('name', input.name.trim())
        .neq('id', input.id)
        .single()

      if (existing) {
        return {
          success: false,
          message: '範本名稱已存在',
        }
      }
    }

    // 更新資料
    const updateData: Partial<NotificationTemplate> = {
      updated_by: userId,
    }

    if (input.name !== undefined) updateData.name = input.name.trim()
    if (input.template !== undefined) updateData.template = input.template
    if (input.is_default !== undefined) updateData.is_default = input.is_default

    const { data: template, error: updateError } = await adminClient
      .from('notification_templates')
      .update(updateData)
      .eq('id', input.id)
      .select()
      .single()

    if (updateError || !template) {
      console.error('[updateNotificationTemplate] Update error:', updateError)
      return {
        success: false,
        message: '更新範本失敗',
      }
    }

    // 記錄操作日誌
    await logAudit({
      target_type: 'notification_template',
      target_id: template.id,
      action_type: 'updated',
      old_values: original,
      new_values: updateData,
    })

    revalidatePath('/admin/system/settings')

    return {
      success: true,
      data: template,
      message: '範本更新成功',
    }
  } catch (error) {
    console.error('[updateNotificationTemplate] Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新失敗',
    }
  }
}

/**
 * 刪除範本
 */
export async function deleteNotificationTemplate(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    await checkAuth('admin')

    const adminClient = createAdminClient()

    // 查詢範本
    const { data: template, error: fetchError } = await adminClient
      .from('notification_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !template) {
      return {
        success: false,
        message: '範本不存在',
      }
    }

    // 不允許刪除預設範本
    if (template.is_default) {
      return {
        success: false,
        message: '無法刪除預設範本',
      }
    }

    // 刪除範本
    const { error: deleteError } = await adminClient
      .from('notification_templates')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[deleteNotificationTemplate] Delete error:', deleteError)
      return {
        success: false,
        message: '刪除範本失敗',
      }
    }

    // 記錄操作日誌
    await logAudit({
      target_type: 'notification_template',
      target_id: id,
      action_type: 'deleted',
      old_values: template,
      new_values: null,
    })

    revalidatePath('/admin/system/settings')

    return {
      success: true,
      data: { id },
      message: '範本刪除成功',
    }
  } catch (error) {
    console.error('[deleteNotificationTemplate] Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '刪除失敗',
    }
  }
}

/**
 * 設定預設範本
 */
export async function setDefaultTemplate(
  id: string
): Promise<ActionResult<NotificationTemplate>> {
  try {
    const { userId } = await checkAuth('admin')

    const adminClient = createAdminClient()

    // 查詢範本
    const { data: template, error: fetchError } = await adminClient
      .from('notification_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !template) {
      return {
        success: false,
        message: '範本不存在',
      }
    }

    // 更新為預設範本（觸發器會自動將其他範本的 is_default 設為 false）
    const { data: updated, error: updateError } = await adminClient
      .from('notification_templates')
      .update({
        is_default: true,
        updated_by: userId,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError || !updated) {
      console.error('[setDefaultTemplate] Update error:', updateError)
      return {
        success: false,
        message: '設定預設範本失敗',
      }
    }

    // 記錄操作日誌
    await logAudit({
      target_type: 'notification_template',
      target_id: id,
      action_type: 'updated',
      old_values: { is_default: template.is_default },
      new_values: { is_default: true },
      notes: '設定為預設範本',
    })

    revalidatePath('/admin/system/settings')

    return {
      success: true,
      data: updated,
      message: '已設定為預設範本',
    }
  } catch (error) {
    console.error('[setDefaultTemplate] Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '設定失敗',
    }
  }
}

/**
 * 產生通知文字（替換變數）
 */
export function generateNotificationText(input: {
  template: string
  companyName: string
  clientName: string
  loginUrl: string
  phone: string
  password: string
}): string {
  return input.template
    .replace(/\{公司名稱\}/g, input.companyName)
    .replace(/\{客戶名稱\}/g, input.clientName)
    .replace(/\{前台網址\}/g, input.loginUrl)
    .replace(/\{登入電話\}/g, input.phone)
    .replace(/\{登入密碼\}/g, input.password)
}
