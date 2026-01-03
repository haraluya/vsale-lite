'use server'

/**
 * Announcement Management Server Actions
 * Feature: 007-system-enhancement (US4 - 廣告輪播系統)
 */

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  deleteAnnouncementSchema,
} from '@/lib/validations/announcement.schema'
import type { ActionResult, Announcement } from '@/types'
import type {
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from '@/lib/validations/announcement.schema'

/**
 * 查詢啟用的廣告（前台）
 * - 僅返回 is_active = true 的廣告
 * - 依 sort_order 排序
 * - 最多返回 5 則
 */
export async function getActiveAnnouncements(): Promise<ActionResult<Announcement[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(5)

    if (error) {
      console.error('getActiveAnnouncements 錯誤:', error)
      return { success: false, message: '查詢廣告失敗' }
    }

    return { success: true, data: data as Announcement[] }
  } catch (error) {
    console.error('getActiveAnnouncements 異常:', error)
    return { success: false, message: '查詢廣告失敗' }
  }
}

/**
 * 查詢所有廣告（管理端）
 * - 管理員可查詢所有廣告（包含停用的）
 * - 依 sort_order 排序
 */
export async function getAllAnnouncements(): Promise<ActionResult<Announcement[]>> {
  try {
    // 1. 驗證管理員權限
    await checkAuth('admin')

    // 2. 使用 Admin Client 查詢所有廣告
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('announcements')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('getAllAnnouncements 錯誤:', error)
      return { success: false, message: '查詢廣告失敗' }
    }

    return { success: true, data: data as Announcement[] }
  } catch (error) {
    console.error('getAllAnnouncements 異常:', error)
    return { success: false, message: '查詢廣告失敗' }
  }
}

/**
 * 建立廣告（管理端）
 */
export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<ActionResult<Announcement>> {
  try {
    // 1. 驗證管理員權限
    await checkAuth('admin')

    // 2. Zod 驗證輸入
    const validated = createAnnouncementSchema.safeParse(input)

    if (!validated.success) {
      return {
        success: false,
        message: '輸入資料格式錯誤',
        errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
      }
    }

    // 3. 插入資料庫
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('announcements')
      .insert({
        title: validated.data.title,
        image_url: validated.data.imageUrl,
        link_url: validated.data.linkUrl ?? null,
        sort_order: validated.data.sortOrder,
        is_active: validated.data.isActive,
      })
      .select()
      .single()

    if (error) {
      console.error('createAnnouncement 錯誤:', error)
      return { success: false, message: '建立廣告失敗' }
    }

    // 4. 更新快取
    revalidatePath('/store') // 前台首頁
    revalidatePath('/admin/announcements') // 後台廣告列表

    return { success: true, data: data as Announcement, message: '廣告建立成功' }
  } catch (error) {
    console.error('createAnnouncement 異常:', error)
    return { success: false, message: '建立廣告失敗' }
  }
}

/**
 * 更新廣告（管理端）
 */
export async function updateAnnouncement(
  input: UpdateAnnouncementInput
): Promise<ActionResult<Announcement>> {
  try {
    // 1. 驗證管理員權限
    await checkAuth('admin')

    // 2. Zod 驗證輸入
    const validated = updateAnnouncementSchema.safeParse(input)

    if (!validated.success) {
      return {
        success: false,
        message: '輸入資料格式錯誤',
        errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
      }
    }

    // 3. 組裝更新資料（僅更新提供的欄位）
    const updateData: Partial<{
      title: string
      image_url: string
      link_url: string | null
      sort_order: number
      is_active: boolean
      updated_at: string
    }> = {
      updated_at: new Date().toISOString(),
    }

    if (validated.data.title) updateData.title = validated.data.title
    if (validated.data.imageUrl) updateData.image_url = validated.data.imageUrl
    if (validated.data.linkUrl !== undefined) updateData.link_url = validated.data.linkUrl
    if (validated.data.sortOrder !== undefined) updateData.sort_order = validated.data.sortOrder
    if (validated.data.isActive !== undefined) updateData.is_active = validated.data.isActive

    // 4. 更新資料庫
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('announcements')
      .update(updateData)
      .eq('id', validated.data.announcementId)
      .select()
      .single()

    if (error) {
      console.error('updateAnnouncement 錯誤:', error)
      return { success: false, message: '更新廣告失敗' }
    }

    if (!data) {
      return { success: false, message: '找不到此廣告' }
    }

    // 5. 更新快取
    revalidatePath('/store')
    revalidatePath('/admin/announcements')
    revalidatePath(`/admin/announcements/${validated.data.announcementId}/edit`)

    return { success: true, data: data as Announcement, message: '廣告更新成功' }
  } catch (error) {
    console.error('updateAnnouncement 異常:', error)
    return { success: false, message: '更新廣告失敗' }
  }
}

/**
 * 刪除廣告（管理端）
 * - 同時刪除 Supabase Storage 中的圖片
 */
export async function deleteAnnouncement(announcementId: string): Promise<ActionResult<void>> {
  try {
    // 1. 驗證管理員權限
    await checkAuth('admin')

    // 2. Zod 驗證輸入
    const validated = deleteAnnouncementSchema.safeParse({ announcementId })

    if (!validated.success) {
      return {
        success: false,
        message: '輸入資料格式錯誤',
        errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
      }
    }

    // 3. 查詢廣告以獲取 image_url
    const adminClient = createAdminClient()

    const { data: announcement, error: fetchError } = await adminClient
      .from('announcements')
      .select('image_url')
      .eq('id', announcementId)
      .single()

    if (fetchError || !announcement) {
      console.error('deleteAnnouncement 查詢錯誤:', fetchError)
      return { success: false, message: '找不到此廣告' }
    }

    // 4. 刪除資料庫記錄
    const { error: deleteError } = await adminClient
      .from('announcements')
      .delete()
      .eq('id', announcementId)

    if (deleteError) {
      console.error('deleteAnnouncement 刪除錯誤:', deleteError)
      return { success: false, message: '刪除廣告失敗' }
    }

    // 5. 刪除 Supabase Storage 中的圖片
    if (announcement.image_url) {
      try {
        const supabase = await createClient()
        const path = `announcements/${announcementId}/`
        await supabase.storage.from('products').remove([path])
      } catch (storageError) {
        console.warn('deleteAnnouncement 刪除圖片失敗（已忽略）:', storageError)
      }
    }

    // 6. 更新快取
    revalidatePath('/store')
    revalidatePath('/admin/announcements')

    return { success: true, message: '廣告刪除成功' }
  } catch (error) {
    console.error('deleteAnnouncement 異常:', error)
    return { success: false, message: '刪除廣告失敗' }
  }
}

/**
 * 上傳廣告圖片（管理端）
 * - 儲存路徑: announcements/{announcement_id}/main.{ext}
 * - 支援格式: JPG, PNG, WebP
 * - 大小限制: 5MB
 * - 覆寫模式: upsert = true
 */
export async function uploadAnnouncementImage(
  announcementId: string,
  file: File
): Promise<ActionResult<string>> {
  try {
    // 1. 驗證管理員權限
    await checkAuth('admin')

    // 2. 驗證檔案
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { success: false, message: '僅支援 JPG、PNG、WebP 格式' }
    }

    if (file.size > MAX_SIZE) {
      return { success: false, message: '檔案大小不得超過 5MB' }
    }

    // 3. 上傳至 Supabase Storage
    const supabase = await createClient()
    const fileExt = file.name.split('.').pop()
    const filePath = `announcements/${announcementId}/main.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      })

    if (uploadError) {
      console.error('uploadAnnouncementImage 上傳錯誤:', uploadError)
      return { success: false, message: '圖片上傳失敗' }
    }

    // 4. 取得公開 URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('products').getPublicUrl(filePath)

    // 5. 更新廣告記錄的 image_url
    const adminClient = createAdminClient()

    const { error: updateError } = await adminClient
      .from('announcements')
      .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', announcementId)

    if (updateError) {
      console.error('uploadAnnouncementImage 更新 URL 錯誤:', updateError)
      return { success: false, message: '更新圖片 URL 失敗' }
    }

    // 6. 更新快取
    revalidatePath('/store')
    revalidatePath('/admin/announcements')
    revalidatePath(`/admin/announcements/${announcementId}/edit`)

    return { success: true, data: publicUrl, message: '圖片上傳成功' }
  } catch (error) {
    console.error('uploadAnnouncementImage 異常:', error)
    return { success: false, message: '圖片上傳失敗' }
  }
}
