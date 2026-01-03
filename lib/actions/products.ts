'use server'

/**
 * Products Management Server Actions
 * Feature: 002-product-management & 003-series-and-pricing
 */

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkAuth } from './helpers'
import { createProductSchema, updateProductSchema } from '@/lib/validations/product.schema'
import type { ActionResult, Product } from '@/types'

/**
 * 查詢商品列表 (含搜尋、篩選、分頁)
 * Feature 003 修改: 改為 series_id 篩選 (取代 category_id)
 */
export async function getProducts(params?: {
  search?: string
  series_id?: string  // 🔄 Feature 003: 改為系列篩選 (取代 category_id)
  status?: 'active' | 'inactive' | 'all'
  page?: number
  limit?: number
}): Promise<{
  products: Product[]
  total: number
  page: number
  limit: number
}> {
  try {
    const { search = '', series_id, status = 'active', page = 1, limit = 20 } = params || {}

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    let query = adminClient
      .from('products')
      .select('*, series(name)', { count: 'exact' })  // 🔄 Feature 003: JOIN series 表 (取代 categories)
      .order('created_at', { ascending: false })

    // 搜尋條件 (商品編號或名稱)
    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`)
    }

    // 系列篩選 (Feature 003)
    if (series_id) {
      query = query.eq('series_id', series_id)
    }

    // 狀態篩選
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // 分頁
    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('getProducts error:', error)
      return { products: [], total: 0, page, limit }
    }

    // 轉換資料格式
    const products: Product[] = (data || []).map((item: any) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      series_id: item.series_id,  // 🔄 Feature 003: 改為 series_id
      series_name: item.series?.name,  // 🔄 Feature 003: 改為 series_name
      description: item.description,
      retail_price: item.retail_price,  // 🆕 Feature 003: 原價
      stock: item.stock,
      stock_status: item.stock_status,  // 🆕 Feature 003: 庫存狀態
      unit: item.unit,
      image_url: item.image_url,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }))

    return {
      products,
      total: count || 0,
      page,
      limit,
    }
  } catch (error) {
    console.error('getProducts error:', error)
    return { products: [], total: 0, page: 1, limit: 20 }
  }
}

/**
 * 取得單一商品詳細資料
 * Feature 003 修改: 改為 JOIN series 表 (取代 categories)
 */
export async function getProduct(id: string): Promise<Product | null> {
  try {
    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('products')
      .select('*, series(name)')  // 🔄 Feature 003: JOIN series 表
      .eq('id', id)
      .single()

    if (error || !data) {
      console.error('getProduct error:', error)
      return null
    }

    return {
      id: data.id,
      code: data.code,
      name: data.name,
      series_id: data.series_id,  // 🔄 Feature 003: 改為 series_id
      series_name: data.series?.name,  // 🔄 Feature 003: 改為 series_name
      description: data.description,
      retail_price: data.retail_price,  // 🆕 Feature 003: 原價
      stock: data.stock,
      stock_status: data.stock_status,  // 🆕 Feature 003: 庫存狀態
      unit: data.unit,
      image_url: data.image_url,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
    } as Product
  } catch (error) {
    console.error('getProduct error:', error)
    return null
  }
}

/**
 * 建立新商品
 * Feature 003 修改: 改用 series_id, 移除 code 欄位 (自動產生), 新增 retail_price 與 stock_status
 */
export async function createProduct(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 2. 解析表單資料
    const rawData = {
      series_id: formData.get('series_id'),  // 🔄 Feature 003: 改為 series_id
      name: formData.get('name'),
      description: formData.get('description') || '',
      retail_price: formData.get('retail_price') || null,  // 🆕 Feature 003: 原價
      stock: formData.get('stock') || '0',
      stock_status: formData.get('stock_status') || 'sufficient',  // 🆕 Feature 003: 庫存狀態
      unit: formData.get('unit') || '件',
      status: formData.get('status') || 'active',
      // 🔄 Feature 003: code 欄位移除 (由 PostgreSQL Trigger 自動產生)
    }

    // 3. 驗證輸入
    const validationResult = createProductSchema.safeParse(rawData)

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors
      return {
        success: false,
        errors: errors as Record<string, string[]>,
        message: '驗證失敗',
      }
    }

    const data = validationResult.data

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 4. 驗證系列是否存在 (Feature 003)
    const { data: series } = await adminClient
      .from('series')
      .select('id')
      .eq('id', data.series_id)
      .single()

    if (!series) {
      return {
        success: false,
        message: '選擇的系列不存在',
      }
    }

    // 5. 寫入資料庫 (商品編號由 Trigger 自動產生)
    const { data: newProduct, error } = await adminClient
      .from('products')
      .insert({
        series_id: data.series_id,  // 🔄 Feature 003: 改為 series_id
        name: data.name,
        description: data.description || null,
        retail_price: data.retail_price,  // 🆕 Feature 003: 原價
        stock: data.stock,
        stock_status: data.stock_status,  // 🆕 Feature 003: 庫存狀態
        unit: data.unit,
        status: data.status,
        // code 欄位由 PostgreSQL Trigger 自動產生
      })
      .select('id')
      .single()

    if (error) {
      console.error('createProduct error:', error)
      return {
        success: false,
        message: '建立商品失敗',
      }
    }

    // 6. 自動建立零售價格記錄 (Feature 003 Enhancement)
    try {
      // 查詢零售等級 ID (is_protected = true)
      const { data: retailTier } = await adminClient
        .from('tiers')
        .select('id')
        .eq('is_protected', true)
        .single()

      if (retailTier) {
        // 建立零售價格記錄
        await adminClient
          .from('tier_prices')
          .insert({
            product_id: newProduct.id,
            tier_id: retailTier.id,
            price: data.retail_price,
          })
      }
    } catch (tierPriceError) {
      console.warn('建立零售價格記錄失敗 (非致命錯誤):', tierPriceError)
      // 不中斷商品建立流程
    }

    // 7. 重新驗證快取
    revalidatePath('/admin/products')
    revalidatePath('/store')

    return {
      success: true,
      data: { id: newProduct.id },
      message: '商品建立成功',
    }
  } catch (error: unknown) {
    console.error('createProduct error:', error)
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      }
    }
    return {
      success: false,
      message: '建立商品失敗',
    }
  }
}

/**
 * 更新商品資料
 * Feature 003 修改: 改用 series_id, 新增 retail_price 與 stock_status
 */
export async function updateProduct(
  id: string,
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 2. 解析表單資料 (注意: code 不可修改)
    const rawData = {
      series_id: formData.get('series_id'),  // 🔄 Feature 003: 改為 series_id
      name: formData.get('name'),
      description: formData.get('description') || '',
      retail_price: formData.get('retail_price') || null,  // 🆕 Feature 003: 原價
      stock: formData.get('stock'),
      stock_status: formData.get('stock_status'),  // 🆕 Feature 003: 庫存狀態
      unit: formData.get('unit'),
      status: formData.get('status'),
    }

    // 3. 驗證輸入
    const validationResult = updateProductSchema.safeParse(rawData)

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors
      return {
        success: false,
        errors: errors as Record<string, string[]>,
        message: '驗證失敗',
      }
    }

    const data = validationResult.data

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 4. 檢查商品是否存在
    const { data: existingProduct } = await adminClient
      .from('products')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingProduct) {
      return {
        success: false,
        message: '商品不存在',
      }
    }

    // 5. 若修改系列,驗證新系列是否存在 (Feature 003)
    if (data.series_id) {
      const { data: series } = await adminClient
        .from('series')
        .select('id')
        .eq('id', data.series_id)
        .single()

      if (!series) {
        return {
          success: false,
          message: '選擇的系列不存在',
        }
      }
    }

    // 6. 更新資料庫
    const { error } = await adminClient
      .from('products')
      .update(data)
      .eq('id', id)

    if (error) {
      console.error('updateProduct error:', error)
      return {
        success: false,
        message: '更新商品失敗',
      }
    }

    // 7. 重新驗證快取
    revalidatePath('/admin/products')
    revalidatePath(`/admin/products/${id}`)

    return {
      success: true,
      message: '商品更新成功',
    }
  } catch (error: unknown) {
    console.error('updateProduct error:', error)
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      }
    }
    return {
      success: false,
      message: '更新商品失敗',
    }
  }
}

/**
 * 刪除商品 (混合策略: 有訂單軟刪除,無訂單硬刪除)
 */
export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 2. 檢查是否已有訂單記錄 (未來實作訂單功能時)
    // const { count } = await adminClient
    //   .from('order_items')
    //   .select('*', { count: 'exact', head: true })
    //   .eq('product_id', id)

    // 目前先假設無訂單,執行硬刪除
    const count = 0

    if (count && count > 0) {
      // 軟刪除 (改為 inactive)
      const { error } = await adminClient
        .from('products')
        .update({ status: 'inactive' })
        .eq('id', id)

      if (error) {
        console.error('deleteProduct (soft) error:', error)
        return {
          success: false,
          message: '停用商品失敗',
        }
      }

      revalidatePath('/admin/products')

      return {
        success: true,
        message: '此商品已有訂單記錄,已改為「停用」狀態',
      }
    } else {
      // 硬刪除
      // 1. 刪除圖片 (所有可能的副檔名)
      await adminClient.storage.from('products').remove([
        `${id}/main.jpg`,
        `${id}/main.png`,
        `${id}/main.webp`,
      ])
      // 註: 不檢查錯誤,因為圖片可能不存在

      // 2. 刪除商品記錄
      const { error } = await adminClient.from('products').delete().eq('id', id)

      if (error) {
        console.error('deleteProduct (hard) error:', error)
        return {
          success: false,
          message: '刪除商品失敗',
        }
      }

      revalidatePath('/admin/products')

      return {
        success: true,
        message: '商品刪除成功',
      }
    }
  } catch (error: unknown) {
    console.error('deleteProduct error:', error)
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      }
    }
    return {
      success: false,
      message: '刪除商品失敗',
    }
  }
}

/**
 * 快速更新商品庫存
 * 用於在商品列表頁面直接調整庫存數量
 */
export async function updateProductStock(
  id: string,
  stock: number
): Promise<ActionResult> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 2. 驗證庫存數量為整數
    if (!Number.isInteger(stock)) {
      return {
        success: false,
        message: '庫存必須為整數',
      }
    }

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 3. 檢查商品是否存在
    const { data: existingProduct } = await adminClient
      .from('products')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingProduct) {
      return {
        success: false,
        message: '商品不存在',
      }
    }

    // 4. 更新庫存
    const { error } = await adminClient
      .from('products')
      .update({ stock })
      .eq('id', id)

    if (error) {
      console.error('updateProductStock error:', error)
      return {
        success: false,
        message: '更新庫存失敗',
      }
    }

    // 5. 重新驗證快取
    revalidatePath('/admin/products')

    return {
      success: true,
      message: '庫存更新成功',
    }
  } catch (error: unknown) {
    console.error('updateProductStock error:', error)
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      }
    }
    return {
      success: false,
      message: '更新庫存失敗',
    }
  }
}

/**
 * 上傳商品圖片
 * Feature: 002-product-management (US4)
 */
export async function uploadProductImage(
  productId: string,
  file: File
): Promise<ActionResult<{ url: string }>> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 2. 驗證檔案格式
    const validFormats = ['image/jpeg', 'image/png', 'image/webp']
    if (!validFormats.includes(file.type)) {
      return {
        success: false,
        message: '僅支援 JPG, PNG, WebP 格式',
      }
    }

    // 3. 驗證檔案大小 (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return {
        success: false,
        message: '檔案大小不可超過 5MB',
      }
    }

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 4. 檢查商品是否存在
    const { data: product } = await adminClient
      .from('products')
      .select('id')
      .eq('id', productId)
      .single()

    if (!product) {
      return {
        success: false,
        message: '商品不存在',
      }
    }

    // 5. 上傳到 Storage (覆寫模式)
    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
    const filePath = `${productId}/main.${ext}`

    const { error: uploadError } = await adminClient.storage
      .from('products')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // 覆寫舊檔案
      })

    if (uploadError) {
      console.error('uploadProductImage storage error:', uploadError)
      return {
        success: false,
        message: '圖片上傳失敗',
      }
    }

    // 6. 取得公開 URL
    const { data: urlData } = adminClient.storage.from('products').getPublicUrl(filePath)

    // 7. 更新商品的 image_url
    const { error: updateError } = await adminClient
      .from('products')
      .update({ image_url: urlData.publicUrl })
      .eq('id', productId)

    if (updateError) {
      console.error('uploadProductImage update error:', updateError)
      return {
        success: false,
        message: '更新商品圖片欄位失敗',
      }
    }

    // 8. 重新驗證快取
    revalidatePath('/admin/products')
    revalidatePath(`/admin/products/${productId}`)

    return {
      success: true,
      data: { url: urlData.publicUrl },
      message: '圖片上傳成功',
    }
  } catch (error: unknown) {
    console.error('uploadProductImage error:', error)
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      }
    }
    return {
      success: false,
      message: '圖片上傳失敗',
    }
  }
}

/**
 * 前台全域搜尋商品
 * Feature: 006-ux-enhancement (US1)
 * 支援商品名稱、商品編號模糊搜尋，並回傳包含用戶等級價格的商品列表
 */
export async function searchProducts(query: string): Promise<ActionResult<Product[]>> {
  try {
    // 1. 取得當前用戶資訊 (含等級)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return {
        success: false,
        message: '請先登入',
      }
    }

    // 2. 取得用戶 profile (含 tier_id)
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier_id')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.tier_id) {
      return {
        success: false,
        message: '無法取得用戶等級資訊',
      }
    }

    // 3. 搜尋商品 (限制結果筆數以優化效能)
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        code,
        name,
        description,
        retail_price,
        stock,
        stock_status,
        unit,
        image_url,
        series:series_id (
          id,
          name,
          default_image_url,
          category:category_id (id, name)
        ),
        tier_prices!inner (
          price
        ),
        tags
      `)
      .eq('status', 'active')
      .eq('tier_prices.tier_id', profile.tier_id)
      .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
      .limit(50)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('searchProducts error:', error)
      return {
        success: false,
        message: '搜尋失敗',
      }
    }

    // 4. 轉換資料格式
    const result: Product[] = (products || []).map((item: any) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      series_id: item.series?.id,
      series_name: item.series?.name,
      category_name: item.series?.category?.name,
      description: item.description,
      retail_price: item.retail_price,
      user_price: item.tier_prices[0]?.price, // 用戶等級價格
      stock: item.stock,
      stock_status: item.stock_status,
      unit: item.unit,
      image_url: item.image_url || item.series?.default_image_url,
      tags: item.tags || [],
      status: 'active',
      created_at: item.created_at,
      updated_at: item.updated_at,
    }))

    return {
      success: true,
      data: result,
      message: `找到 ${result.length} 筆商品`,
    }
  } catch (error: unknown) {
    console.error('searchProducts error:', error)
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      }
    }
    return {
      success: false,
      message: '搜尋失敗',
    }
  }
}

/**
 * 前台篩選商品
 * Feature: 006-ux-enhancement (US2)
 * 支援類別與標籤快速篩選，支援多選組合篩選
 */
export async function filterProducts(params: {
  category_ids?: string[]
  tags?: string[]
  limit?: number
}): Promise<ActionResult<Product[]>> {
  try {
    const { category_ids = [], tags = [], limit = 100 } = params

    // 1. 取得當前用戶資訊 (含等級)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return {
        success: false,
        message: '請先登入',
      }
    }

    // 2. 取得用戶 profile (含 tier_id)
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier_id')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.tier_id) {
      return {
        success: false,
        message: '無法取得用戶等級資訊',
      }
    }

    // 3. 建立查詢
    let query = supabase
      .from('products')
      .select(`
        id,
        code,
        name,
        description,
        retail_price,
        stock,
        stock_status,
        unit,
        image_url,
        series:series_id (
          id,
          name,
          default_image_url,
          category:category_id (id, name)
        ),
        tier_prices!inner (
          price
        ),
        tags
      `)
      .eq('status', 'active')
      .eq('tier_prices.tier_id', profile.tier_id)
      .limit(limit)
      .order('updated_at', { ascending: false })

    // 4. 套用類別篩選
    if (category_ids.length > 0) {
      // 需要先查詢該類別下的所有系列 ID
      const { data: seriesData } = await supabase
        .from('series')
        .select('id')
        .in('category_id', category_ids)
        .eq('status', 'active')

      if (seriesData && seriesData.length > 0) {
        const seriesIds = seriesData.map(s => s.id)
        query = query.in('series_id', seriesIds)
      } else {
        // 沒有符合的系列，直接回傳空結果
        return {
          success: true,
          data: [],
          message: '找到 0 筆商品',
        }
      }
    }

    // 5. 套用標籤篩選 (包含任一標籤)
    if (tags.length > 0) {
      // PostgreSQL 陣列交集查詢: tags && ARRAY['tag1', 'tag2']
      query = query.overlaps('tags', tags)
    }

    // 6. 執行查詢
    const { data: products, error } = await query

    if (error) {
      console.error('filterProducts error:', error)
      return {
        success: false,
        message: '篩選失敗',
      }
    }

    // 7. 轉換資料格式
    const result: Product[] = (products || []).map((item: any) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      series_id: item.series?.id,
      series_name: item.series?.name,
      category_name: item.series?.category?.name,
      description: item.description,
      retail_price: item.retail_price,
      user_price: item.tier_prices[0]?.price,
      stock: item.stock,
      stock_status: item.stock_status,
      unit: item.unit,
      image_url: item.image_url || item.series?.default_image_url,
      tags: item.tags || [],
      status: 'active',
      created_at: item.created_at,
      updated_at: item.updated_at,
    }))

    return {
      success: true,
      data: result,
      message: `找到 ${result.length} 筆商品`,
    }
  } catch (error: unknown) {
    console.error('filterProducts error:', error)
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      }
    }
    return {
      success: false,
      message: '篩選失敗',
    }
  }
}

/**
 * 取得所有啟用的分類（用於篩選）
 * Feature: 006-ux-enhancement (US2)
 */
export async function getActiveCategories(): Promise<ActionResult<{ id: string; name: string }[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('status', 'active')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('getActiveCategories error:', error)
      return {
        success: false,
        message: '取得分類列表失敗',
      }
    }

    return {
      success: true,
      data: data || [],
    }
  } catch (error: unknown) {
    console.error('getActiveCategories error:', error)
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      }
    }
    return {
      success: false,
      message: '取得分類列表失敗',
    }
  }
}

/**
 * 取得所有使用中的標籤（用於篩選）
 * Feature: 006-ux-enhancement (US2)
 */
export async function getAvailableTags(): Promise<ActionResult<string[]>> {
  try {
    const supabase = await createClient()

    // 查詢所有啟用商品的標籤，並去重
    const { data, error } = await supabase
      .from('products')
      .select('tags')
      .eq('status', 'active')
      .not('tags', 'is', null)

    if (error) {
      console.error('getAvailableTags error:', error)
      return {
        success: false,
        message: '取得標籤列表失敗',
      }
    }

    // 將所有標籤展平並去重
    const allTags = new Set<string>()
    data?.forEach((item: any) => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => allTags.add(tag))
      }
    })

    return {
      success: true,
      data: Array.from(allTags).sort(),
    }
  } catch (error: unknown) {
    console.error('getAvailableTags error:', error)
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      }
    }
    return {
      success: false,
      message: '取得標籤列表失敗',
    }
  }
}

/**
 * 刪除商品圖片
 * Feature: 002-product-management (US4)
 */
export async function deleteProductImage(productId: string): Promise<ActionResult> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 2. 檢查商品是否存在
    const { data: product } = await adminClient
      .from('products')
      .select('id, image_url')
      .eq('id', productId)
      .single()

    if (!product) {
      return {
        success: false,
        message: '商品不存在',
      }
    }

    // 3. 刪除 Storage 圖片 (所有可能的副檔名)
    // 註: 不檢查錯誤,因為圖片可能不存在
    await adminClient.storage.from('products').remove([
      `${productId}/main.jpg`,
      `${productId}/main.png`,
      `${productId}/main.webp`,
    ])

    // 4. 更新商品的 image_url 為 NULL
    const { error: updateError } = await adminClient
      .from('products')
      .update({ image_url: null })
      .eq('id', productId)

    if (updateError) {
      console.error('deleteProductImage error:', updateError)
      return {
        success: false,
        message: '刪除商品圖片欄位失敗',
      }
    }

    // 5. 重新驗證快取
    revalidatePath('/admin/products')
    revalidatePath(`/admin/products/${productId}`)

    return {
      success: true,
      message: '圖片刪除成功',
    }
  } catch (error: unknown) {
    console.error('deleteProductImage error:', error)
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      }
    }
    return {
      success: false,
      message: '圖片刪除失敗',
    }
  }
}
