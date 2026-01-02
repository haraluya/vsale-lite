'use server'

/**
 * Series Management Server Actions
 * Feature: 003-series-and-pricing
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import { createSeriesSchema, updateSeriesSchema } from '@/lib/validations/series.schema'
import type { ActionResult, Series } from '@/types'
import type { CreateSeriesInput, UpdateSeriesInput } from '@/lib/validations/series.schema'

/**
 * 查詢所有系列 (管理員可見全部,客戶僅可見 active)
 * @param category_id 選填:過濾特定分類的系列
 */
export async function getSeries(category_id?: string): Promise<ActionResult<Series[]>> {
  try {
    const supabase = await createClient()
    const auth = await checkAuth() // 驗證登入

    let query = supabase
      .from('series')
      .select('*')
      .order('sort_order', { ascending: true })

    // 若提供 category_id,過濾分類
    if (category_id) {
      query = query.eq('category_id', category_id)
    }

    // 若是客戶,僅顯示 active
    if (auth.role === 'client') {
      query = query.eq('status', 'active')
    }

    const { data, error } = await query

    if (error) {
      console.error('getSeries 錯誤:', error)
      return { success: false, message: '查詢系列失敗' }
    }

    return { success: true, data: data as Series[] }
  } catch (error) {
    console.error('getSeries 異常:', error)
    return { success: false, message: error instanceof Error ? error.message : '查詢失敗' }
  }
}

/**
 * 查詢單一系列詳情
 * @param id 系列 ID
 */
export async function getSeriesById(id: string): Promise<ActionResult<Series>> {
  try {
    const supabase = await createClient()
    const auth = await checkAuth() // 驗證登入

    const { data, error } = await supabase
      .from('series')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return { success: false, message: '系列不存在' }
    }

    // 若是客戶,檢查系列是否 active
    if (auth.role === 'client' && data.status !== 'active') {
      return { success: false, message: '無權限查看此系列' }
    }

    return { success: true, data: data as Series }
  } catch (error) {
    console.error('getSeriesById 異常:', error)
    return { success: false, message: error instanceof Error ? error.message : '查詢失敗' }
  }
}

/**
 * 建立新系列 (僅管理員)
 * @param data 系列資料
 */
export async function createSeries(data: CreateSeriesInput): Promise<ActionResult<Series>> {
  try {
    const supabase = await createClient()
    await checkAuth('admin') // 僅管理員可執行

    // 驗證輸入
    const validation = createSeriesSchema.safeParse(data)
    if (!validation.success) {
      return {
        success: false,
        message: '輸入資料格式錯誤',
        errors: validation.error.flatten().fieldErrors,
      }
    }

    // 新增系列
    const { data: newSeries, error } = await supabase
      .from('series')
      .insert({
        category_id: validation.data.category_id,
        name: validation.data.name,
        description: validation.data.description || null,
        sort_order: validation.data.sort_order,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      console.error('createSeries 錯誤:', error)
      return { success: false, message: '系列建立失敗' }
    }

    // 更新快取
    revalidatePath('/admin/series')
    revalidatePath('/store')

    return {
      success: true,
      data: newSeries as Series,
      message: '系列建立成功',
    }
  } catch (error) {
    console.error('createSeries 異常:', error)
    return { success: false, message: error instanceof Error ? error.message : '建立失敗' }
  }
}

/**
 * 更新系列資訊 (僅管理員)
 * @param id 系列 ID
 * @param data 更新資料
 */
export async function updateSeries(
  id: string,
  data: UpdateSeriesInput
): Promise<ActionResult<Series>> {
  try {
    const supabase = await createClient()
    await checkAuth('admin') // 僅管理員可執行

    // 驗證輸入
    const validation = updateSeriesSchema.safeParse(data)
    if (!validation.success) {
      return {
        success: false,
        message: '輸入資料格式錯誤',
        errors: validation.error.flatten().fieldErrors,
      }
    }

    // 檢查系列是否存在
    const { data: existing } = await supabase
      .from('series')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return { success: false, message: '系列不存在' }
    }

    // 更新系列
    const { data: updated, error } = await supabase
      .from('series')
      .update(validation.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('updateSeries 錯誤:', error)
      return { success: false, message: '系列更新失敗' }
    }

    // 更新快取
    revalidatePath('/admin/series')
    revalidatePath('/store')
    revalidatePath(`/store/series/${id}`)

    return {
      success: true,
      data: updated as Series,
      message: '系列更新成功',
    }
  } catch (error) {
    console.error('updateSeries 異常:', error)
    return { success: false, message: error instanceof Error ? error.message : '更新失敗' }
  }
}

/**
 * 刪除系列 (僅管理員,需檢查是否有商品)
 * @param id 系列 ID
 */
export async function deleteSeries(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()
    await checkAuth('admin') // 僅管理員可執行

    // 檢查系列是否存在
    const { data: existing } = await supabase
      .from('series')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return { success: false, message: '系列不存在' }
    }

    // 檢查系列下是否有商品
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('series_id', id)

    if (count && count > 0) {
      return {
        success: false,
        message: '無法刪除：此系列下仍有商品,請先刪除或遷移商品',
      }
    }

    // 刪除系列
    const { error } = await supabase.from('series').delete().eq('id', id)

    if (error) {
      console.error('deleteSeries 錯誤:', error)
      return { success: false, message: '系列刪除失敗' }
    }

    // 更新快取
    revalidatePath('/admin/series')
    revalidatePath('/store')

    return {
      success: true,
      message: '系列刪除成功',
    }
  } catch (error) {
    console.error('deleteSeries 異常:', error)
    return { success: false, message: error instanceof Error ? error.message : '刪除失敗' }
  }
}

/**
 * 上傳系列主圖 (僅管理員)
 * @param series_id 系列 ID
 * @param file 圖片檔案
 */
export async function uploadSeriesImage(
  series_id: string,
  file: File
): Promise<ActionResult<{ image_url: string }>> {
  try {
    const supabase = await createClient()
    await checkAuth('admin') // 僅管理員可執行

    // 檢查系列是否存在
    const { data: existing } = await supabase
      .from('series')
      .select('id')
      .eq('id', series_id)
      .single()

    if (!existing) {
      return { success: false, message: '系列不存在' }
    }

    // 驗證檔案格式與大小
    const validFormats = ['image/jpeg', 'image/png', 'image/webp']
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!validFormats.includes(file.type)) {
      return {
        success: false,
        message: '圖片格式不支援（僅支援 JPG, PNG, WebP）',
      }
    }

    if (file.size > maxSize) {
      return {
        success: false,
        message: '圖片大小超過 5MB',
      }
    }

    // 取得檔案副檔名
    const ext = file.type.split('/')[1]
    const filePath = `series/${series_id}/main.${ext}`

    // 上傳到 Supabase Storage (覆寫模式)
    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      })

    if (uploadError) {
      console.error('上傳圖片錯誤:', uploadError)
      return { success: false, message: '圖片上傳失敗' }
    }

    // 取得公開 URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('products').getPublicUrl(filePath)

    // 更新 series.image_url 欄位
    const { error: updateError } = await supabase
      .from('series')
      .update({ image_url: publicUrl })
      .eq('id', series_id)

    if (updateError) {
      console.error('更新 image_url 錯誤:', updateError)
      return { success: false, message: '更新圖片 URL 失敗' }
    }

    // 更新快取
    revalidatePath(`/admin/series/${series_id}`)
    revalidatePath('/admin/series')
    revalidatePath('/store')

    return {
      success: true,
      data: { image_url: publicUrl },
      message: '圖片上傳成功',
    }
  } catch (error) {
    console.error('uploadSeriesImage 異常:', error)
    return { success: false, message: error instanceof Error ? error.message : '上傳失敗' }
  }
}
