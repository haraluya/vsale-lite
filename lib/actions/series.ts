'use server'

/**
 * Series Management Server Actions
 * Feature: 003-series-and-pricing
 */

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import { createSeriesSchema, updateSeriesSchema } from '@/lib/validations/series.schema'
import type { ActionResult, Series } from '@/types'
import type { CreateSeriesInput, UpdateSeriesInput } from '@/lib/validations/series.schema'
import { uploadWithRetry, formatUploadError } from '@/lib/utils/upload-helpers'

/**
 * 查詢所有系列 (管理員可見全部,客戶僅可見 active)
 * @param options.category_id 選填:過濾特定分類的系列
 * @param options.search 選填:搜尋系列代碼或名稱
 * @param options.sort 選填:排序欄位 (code | category_name)
 * @param options.order 選填:排序方向 (asc | desc)
 */
export async function getSeries(options?: {
  category_id?: string
  search?: string
  sort?: 'code' | 'category_name'
  order?: 'asc' | 'desc'
}): Promise<ActionResult<Series[]>> {
  try {
    const auth = await checkAuth() // 驗證登入

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 1. 查詢系列資料
    let seriesQuery = adminClient
      .from('series')
      .select('*')

    // 若提供 category_id,過濾分類
    if (options?.category_id) {
      seriesQuery = seriesQuery.eq('category_id', options.category_id)
    }

    // 若提供 search,搜尋代碼或名稱
    if (options?.search) {
      seriesQuery = seriesQuery.or(`code.ilike.%${options.search}%,name.ilike.%${options.search}%`)
    }

    // 若是客戶,僅顯示 active
    if (auth.role === 'client') {
      seriesQuery = seriesQuery.eq('status', 'active')
    }

    // 若提供排序參數,使用指定排序;否則使用 sort_order
    if (options?.sort === 'code') {
      seriesQuery = seriesQuery.order('code', { ascending: options.order !== 'desc' })
    } else {
      seriesQuery = seriesQuery.order('sort_order', { ascending: true })
    }

    const { data: seriesData, error: seriesError } = await seriesQuery

    if (seriesError) {
      console.error('getSeries 錯誤:', JSON.stringify(seriesError, null, 2))
      return { success: false, message: `查詢系列失敗: ${seriesError.message || JSON.stringify(seriesError)}` }
    }

    if (!seriesData || seriesData.length === 0) {
      return { success: true, data: [] }
    }

    // 2. 查詢分類資料 (批次查詢所有需要的分類)
    const categoryIds = [...new Set(seriesData.map((s: any) => s.category_id).filter(Boolean))]

    let categoriesMap = new Map<string, any>()
    if (categoryIds.length > 0) {
      const { data: categoriesData, error: categoriesError } = await adminClient
        .from('categories')
        .select('id, name')
        .in('id', categoryIds)

      if (categoriesError) {
        console.error('getSeries 查詢分類錯誤:', categoriesError)
      }

      if (categoriesData) {
        categoriesData.forEach((cat: any) => {
          categoriesMap.set(cat.id, { name: cat.name })
        })
      }
    }

    // 3. 組合資料
    let processedData = seriesData.map((s: any) => ({
      ...s,
      categories: s.category_id ? categoriesMap.get(s.category_id) || null : null
    }))

    // 4. 若依分類名稱排序,需在記憶體中處理（因為分類是 JOIN 後的資料）
    if (options?.sort === 'category_name') {
      processedData.sort((a, b) => {
        const nameA = a.categories?.name || '未分類'
        const nameB = b.categories?.name || '未分類'
        const comparison = nameA.localeCompare(nameB, 'zh-TW')
        return options.order === 'desc' ? -comparison : comparison
      })
    }

    return { success: true, data: processedData as Series[] }
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
    const auth = await checkAuth() // 驗證登入

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
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

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 檢查系列代碼是否已存在
    const { data: existingCode, error: codeCheckError } = await adminClient
      .from('series')
      .select('id')
      .eq('code', validation.data.code)
      .maybeSingle()  // 使用 maybeSingle() 避免 PGRST116 錯誤

    // 忽略「沒有找到資料」的錯誤
    if (codeCheckError && codeCheckError.code !== 'PGRST116') {
      console.error('檢查系列代碼錯誤:', codeCheckError)
      return { success: false, message: '檢查系列代碼失敗' }
    }

    if (existingCode) {
      return {
        success: false,
        message: `系列代碼「${validation.data.code}」已存在，請使用其他代碼`,
        errors: { code: ['系列代碼已存在'] },
      }
    }

    // 檢查系列名稱是否已存在
    const { data: existingName, error: nameCheckError } = await adminClient
      .from('series')
      .select('id')
      .eq('name', validation.data.name)
      .maybeSingle()  // 使用 maybeSingle() 避免 PGRST116 錯誤

    // 忽略「沒有找到資料」的錯誤
    if (nameCheckError && nameCheckError.code !== 'PGRST116') {
      console.error('檢查系列名稱錯誤:', nameCheckError)
      return { success: false, message: '檢查系列名稱失敗' }
    }

    if (existingName) {
      return {
        success: false,
        message: `系列名稱「${validation.data.name}」已存在，請使用其他名稱`,
        errors: { name: ['系列名稱已存在'] },
      }
    }

    // 新增系列
    const { data: newSeries, error } = await adminClient
      .from('series')
      .insert({
        category_id: validation.data.category_id,
        code: validation.data.code,
        name: validation.data.name,
        description: validation.data.description || null,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      console.error('createSeries 錯誤:', error)

      // 處理資料庫約束違反錯誤（PostgreSQL 錯誤碼 23505）
      if (error.code === '23505') {
        if (error.message.includes('series_code_unique')) {
          return {
            success: false,
            message: `系列代碼「${validation.data.code}」已存在（可能被其他管理員同時新增）`,
            errors: { code: ['系列代碼已存在'] },
          }
        }
        if (error.message.includes('series_name_unique')) {
          return {
            success: false,
            message: `系列名稱「${validation.data.name}」已存在（可能被其他管理員同時新增）`,
            errors: { name: ['系列名稱已存在'] },
          }
        }
        return {
          success: false,
          message: '系列代碼或名稱已存在，請使用其他值',
        }
      }

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

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 檢查系列是否存在
    const { data: existing } = await adminClient
      .from('series')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return { success: false, message: '系列不存在' }
    }

    // 更新系列
    const { data: updated, error } = await adminClient
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
    await checkAuth('admin') // 僅管理員可執行

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 檢查系列是否存在並取得系列資訊
    const { data: existing } = await adminClient
      .from('series')
      .select('id, name, code')
      .eq('id', id)
      .single()

    if (!existing) {
      return { success: false, message: '系列不存在' }
    }

    // 檢查系列下是否有商品，並取得商品清單
    const { data: products, count } = await adminClient
      .from('products')
      .select('name, code')
      .eq('series_id', id)
      .limit(10) // 最多顯示 10 個商品

    if (count && count > 0) {
      // 建立商品清單訊息
      const productList = products
        ?.map((p) => `  • ${p.name} (${p.code})`)
        .join('\n') || ''

      const moreProducts = count > 10 ? `\n  ... 以及其他 ${count - 10} 個商品` : ''

      return {
        success: false,
        message: `無法刪除系列「${existing.name}」(${existing.code})：\n\n此系列下有 ${count} 個商品正在使用：\n${productList}${moreProducts}\n\n請先刪除或將這些商品遷移到其他系列。`,
      }
    }

    // 刪除系列
    const { error } = await adminClient.from('series').delete().eq('id', id)

    if (error) {
      console.error('deleteSeries 錯誤:', error)
      return { success: false, message: '系列刪除失敗' }
    }

    // 更新快取
    revalidatePath('/admin/series')
    revalidatePath('/store')

    return {
      success: true,
      message: `系列「${existing.name}」刪除成功`,
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
    await checkAuth('admin') // 僅管理員可執行

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 檢查系列是否存在
    const { data: existing } = await adminClient
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

    // 上傳前先刪除所有可能的舊圖片（避免不同副檔名的孤兒檔案）
    const { error: removeError } = await adminClient.storage.from('products').remove([
      `series/${series_id}/main.jpg`,
      `series/${series_id}/main.png`,
      `series/${series_id}/main.webp`,
    ])

    // 取得檔案副檔名
    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
    const filePath = `series/${series_id}/main.${ext}`

    // 如果刪除失敗，使用 upsert 模式覆寫；否則使用 upsert: false
    const shouldUpsert = !!removeError

    if (removeError) {
      console.warn('刪除舊圖片失敗，將使用覆寫模式上傳:', removeError)
    }

    // 使用帶重試機制的上傳函式
    const uploadResult = await uploadWithRetry(
      () =>
        adminClient.storage.from('products').upload(filePath, file, {
          upsert: shouldUpsert, // 刪除失敗時允許覆寫
          contentType: file.type,
        }),
      3, // 最多重試 3 次
      30000 // 單次上傳超時 30 秒
    )

    if (uploadResult.error) {
      console.error('上傳圖片錯誤:', uploadResult.error, `(嘗試 ${uploadResult.attempts} 次)`)
      return {
        success: false,
        message: formatUploadError(uploadResult.error, uploadResult.attempts),
      }
    }

    // 取得公開 URL
    const {
      data: { publicUrl },
    } = adminClient.storage.from('products').getPublicUrl(filePath)

    // 更新 series.image_url 欄位
    const { error: updateError } = await adminClient
      .from('series')
      .update({ image_url: publicUrl })
      .eq('id', series_id)

    if (updateError) {
      console.error('更新 image_url 錯誤:', updateError)
      return {
        success: false,
        message: '圖片已上傳，但資料庫同步失敗，請重新整理頁面或聯絡管理員',
      }
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

/**
 * 刪除系列圖片
 * @param series_id 系列 ID
 */
export async function deleteSeriesImage(series_id: string): Promise<ActionResult<void>> {
  try {
    await checkAuth('admin') // 僅管理員可執行

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 檢查系列是否存在
    const { data: existing } = await adminClient
      .from('series')
      .select('id, image_url')
      .eq('id', series_id)
      .single()

    if (!existing) {
      return { success: false, message: '系列不存在' }
    }

    // 刪除 Storage 中的圖片檔案（所有可能的副檔名）
    const { error: removeError } = await adminClient.storage.from('products').remove([
      `series/${series_id}/main.jpg`,
      `series/${series_id}/main.png`,
      `series/${series_id}/main.webp`,
    ])

    if (removeError) {
      console.warn('刪除 Storage 圖片失敗（可能不存在）:', removeError)
      // 繼續執行，不影響資料庫更新
    }

    // 清空資料庫的 image_url 欄位
    const { error: updateError } = await adminClient
      .from('series')
      .update({ image_url: null })
      .eq('id', series_id)

    if (updateError) {
      console.error('清空 image_url 錯誤:', updateError)
      return { success: false, message: '刪除圖片失敗' }
    }

    // 更新快取
    revalidatePath(`/admin/series/${series_id}`)
    revalidatePath('/admin/series')
    revalidatePath('/store')

    return {
      success: true,
      message: '圖片已刪除',
    }
  } catch (error) {
    console.error('deleteSeriesImage 異常:', error)
    return { success: false, message: error instanceof Error ? error.message : '刪除失敗' }
  }
}

// ============================================================
// Excel 匯入匯出功能
// ============================================================

import { seriesImportSchema, seriesExportFiltersSchema, type SeriesImportRow, type SeriesExportFilters } from '@/lib/validations/excel.schema'
import { jsonToExcelBuffer, excelBufferToJson, validateExcelFile, generateExcelFileName } from '@/lib/utils/excel'

/**
 * 匯出系列為 Excel 檔案
 * @param filters 選填的篩選條件
 * @returns Excel 檔案 Buffer 與檔案名稱
 */
export async function exportSeries(
  filters?: SeriesExportFilters
): Promise<ActionResult<{ file_buffer: number[]; file_name: string }>> {
  try {
    // 1. 驗證管理員權限
    await checkAuth('admin')

    // 2. 驗證篩選條件
    const validatedFilters = filters ? seriesExportFiltersSchema.parse(filters) : {}

    const adminClient = createAdminClient()

    // 3. 查詢系列資料（含分類名稱）
    let query = adminClient
      .from('series')
      .select('name, code, category:categories(name), sort_order, description, created_at')
      .order('sort_order', { ascending: true })

    // 套用篩選條件
    if (validatedFilters.category_id) {
      query = query.eq('category_id', validatedFilters.category_id)
    }
    if (validatedFilters.status) {
      query = query.eq('status', validatedFilters.status)
    }

    const { data: series, error } = await query

    if (error) {
      console.error('查詢系列失敗:', error)
      return { success: false, message: '查詢系列失敗' }
    }

    if (!series || series.length === 0) {
      return { success: false, message: '沒有符合條件的系列資料' }
    }

    // 4. 轉換為 Excel 格式
    const excelData = series.map((s: any) => ({
      '系列名稱': s.name || '',
      '系列代碼': s.code || '',
      '所屬分類': s.category?.name || '',
      '排序': s.sort_order || 0,
      '描述': s.description || '',
      '建立時間': new Date(s.created_at).toLocaleDateString('zh-TW'),
    }))

    // 5. 產生 Excel Buffer
    const excelBuffer = jsonToExcelBuffer(excelData, '系列資料')

    // 6. 回傳 Buffer 陣列與檔案名稱
    const fileName = generateExcelFileName('系列資料')

    return {
      success: true,
      data: {
        file_buffer: Array.from(excelBuffer),
        file_name: fileName,
      },
      message: `成功匯出 ${series.length} 筆系列資料`,
    }
  } catch (error) {
    console.error('exportSeries 錯誤:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '匯出失敗',
    }
  }
}

/**
 * 匯入系列 Excel 檔案
 * @param file Excel 檔案
 * @param options 匯入選項（試算模式、跳過錯誤）
 * @returns 匯入結果統計與錯誤明細
 */
export async function importSeries(
  file: File,
  options?: { dry_run?: boolean; skip_errors?: boolean }
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
    // 1. 驗證管理員權限
    await checkAuth('admin')

    // 2. 驗證檔案格式與大小
    const fileValidation = validateExcelFile(file)
    if (!fileValidation.valid) {
      return { success: false, message: fileValidation.error! }
    }

    // 3. 解析 Excel 為 JSON
    const arrayBuffer = await file.arrayBuffer()
    let rawData = await excelBufferToJson(arrayBuffer)

    if (!rawData || rawData.length === 0) {
      return { success: false, message: 'Excel 檔案為空' }
    }

    // 4. 檢查資料筆數上限（最多 1000 筆，超過自動截取並警告）
    if (rawData.length > 1000) {
      console.warn(`檔案包含 ${rawData.length} 筆資料，僅匯入前 1000 筆`)
      rawData = rawData.slice(0, 1000)
    }

    const errors: Array<{
      row_number: number
      field: string
      value: any
      message: string
    }> = []
    const validRows: SeriesImportRow[] = []

    // 5. 逐列驗證 Zod Schema
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]
      const rowNumber = i + 2 // Excel 第 1 列為標題

      const validatedRow = seriesImportSchema.safeParse(row)
      if (!validatedRow.success) {
        const zodErrors = validatedRow.error.flatten().fieldErrors
        for (const [field, messages] of Object.entries(zodErrors)) {
          errors.push({
            row_number: rowNumber,
            field,
            value: row[field],
            message: messages?.[0] || '格式錯誤',
          })
        }
        continue
      }

      validRows.push(validatedRow.data)
    }

    // 6. 批次查詢現有資料（效能優化，避免 N+1 查詢）
    const adminClient = createAdminClient()

    const allNames = validRows.map(row => row.系列名稱)
    const allCodes = validRows.map(row => row.系列代碼)

    const { data: existingSeries } = await adminClient
      .from('series')
      .select('name, code')
      .or(`name.in.(${allNames.join(',')}),code.in.(${allCodes.join(',')})`)

    // 建立 Set 快速查詢
    const nameSet = new Set(existingSeries?.map(s => s.name) || [])
    const codeSet = new Set(existingSeries?.map(s => s.code) || [])

    // 查詢分類並建立 Map
    const { data: categories } = await adminClient
      .from('categories')
      .select('id, name')
      .eq('status', 'active')

    const categoryMap = new Map(categories?.map(c => [c.name, c.id]) || [])

    // 7. 逐列驗證業務邏輯
    const validSeries: any[] = []

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]
      const rowNumber = i + 2

      // 檢查系列名稱重複
      if (nameSet.has(row.系列名稱)) {
        errors.push({
          row_number: rowNumber,
          field: '系列名稱',
          value: row.系列名稱,
          message: '系列名稱已存在',
        })
        continue
      }

      // 檢查系列代碼重複
      if (codeSet.has(row.系列代碼)) {
        errors.push({
          row_number: rowNumber,
          field: '系列代碼',
          value: row.系列代碼,
          message: '系列代碼已存在',
        })
        continue
      }

      // 檢查分類是否存在
      let categoryId: string | null = null
      if (row.所屬分類) {
        categoryId = categoryMap.get(row.所屬分類) || null
        if (!categoryId) {
          errors.push({
            row_number: rowNumber,
            field: '所屬分類',
            value: row.所屬分類,
            message: '分類不存在或已停用',
          })
          continue
        }
      }

      // 建立有效的系列資料
      validSeries.push({
        name: row.系列名稱,
        code: row.系列代碼,
        category_id: categoryId,
        description: row.描述 || null,
        status: 'active',
      })
    }

    // 8. 試算模式 - 僅驗證不寫入
    if (options?.dry_run) {
      return {
        success: true,
        data: {
          total_rows: rawData.length,
          success_count: validSeries.length,
          error_count: errors.length,
          errors,
          dry_run: true,
        },
        message: `試算驗證完成：${validSeries.length} 筆有效，${errors.length} 筆錯誤`,
      }
    }

    // 9. 正式匯入 - 批次 INSERT + 處理資料庫約束違反錯誤
    if (validSeries.length === 0) {
      return {
        success: false,
        message: `沒有有效的資料可匯入（共 ${rawData.length} 筆，${errors.length} 筆錯誤）`,
      }
    }

    const { error: insertError } = await adminClient
      .from('series')
      .insert(validSeries)

    if (insertError) {
      console.error('批次匯入失敗:', insertError)

      // 檢查是否為唯一性約束違反（PostgreSQL 錯誤碼 23505）
      if (insertError.code === '23505') {
        return {
          success: false,
          message: '匯入失敗：部分系列名稱或代碼已存在（可能被其他管理員同時新增）',
        }
      }

      return {
        success: false,
        message: `匯入失敗: ${insertError.message}`,
      }
    }

    // 10. 更新快取
    revalidatePath('/admin/series')

    return {
      success: true,
      data: {
        total_rows: rawData.length,
        success_count: validSeries.length,
        error_count: errors.length,
        errors,
        dry_run: false,
      },
      message: `成功匯入 ${validSeries.length} 筆系列資料`,
    }
  } catch (error) {
    console.error('importSeries 錯誤:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '匯入失敗',
    }
  }
}

/**
 * 下載系列匯入範本
 * @returns Excel 檔案 Buffer 與檔案名稱
 */
export async function downloadSeriesTemplate(): Promise<
  ActionResult<{ file_buffer: number[]; file_name: string }>
> {
  try {
    // 1. 驗證管理員權限
    await checkAuth('admin')

    const adminClient = createAdminClient()

    // 2. 查詢第一個分類作為範例
    const { data: categories } = await adminClient
      .from('categories')
      .select('name')
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .limit(1)

    const firstCategory = categories?.[0]

    // 3. 建立範本資料
    const templateData = [
      {
        '系列名稱': '範例系列名稱',
        '系列代碼': 'EXAMPLE',
        '所屬分類': firstCategory?.name || '',  // 允許空值（未分類）
        '描述': '這是範例描述',
      },
    ]

    // 4. 產生 Excel Buffer
    const excelBuffer = jsonToExcelBuffer(templateData, '系列匯入範本')

    // 5. 回傳 Buffer 陣列與檔案名稱
    const fileName = '系列匯入範本.xlsx'

    return {
      success: true,
      data: {
        file_buffer: Array.from(excelBuffer),
        file_name: fileName,
      },
      message: '範本下載成功',
    }
  } catch (error) {
    console.error('downloadSeriesTemplate 錯誤:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '下載範本失敗',
    }
  }
}
