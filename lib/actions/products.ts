'use server'

/**
 * Products Management Server Actions
 * Feature: 002-product-management & 003-series-and-pricing
 * Feature 008: 整合操作日誌記錄
 */

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkAuth } from './helpers'
import { logAudit } from './audit'
import { createProductSchema, updateProductSchema, batchUpdateProductsSchema } from '@/lib/validations/product.schema'
import type { ActionResult, Product } from '@/types'

/**
 * 查詢商品列表 (含搜尋、篩選、分頁)
 * Feature 003 修改: 改為 series_id 篩選 (取代 category_id)
 * Feature 016 修改: 新增多系列篩選與排序功能
 */
export async function getProducts(params?: {
  search?: string
  series_id?: string  // 🔄 Feature 003: 改為系列篩選 (取代 category_id)
  series_ids?: string[]  // 🆕 Feature 016: 多系列篩選（陣列）
  status?: 'active' | 'inactive' | 'all'
  sort?: 'code' | 'series_name' | 'retail_price'  // 🆕 Feature 016: 排序欄位（庫存不可排序）
  order?: 'asc' | 'desc'  // 🆕 Feature 016: 排序方向
  page?: number
  limit?: number
}): Promise<{
  products: Product[]
  total: number
  page: number
  limit: number
}> {
  try {
    const {
      search = '',
      series_id,
      series_ids,
      status = 'active',
      sort = 'code',
      order = 'asc',
      page = 1,
      limit = 20
    } = params || {}

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    let query = adminClient
      .from('products')
      .select('*, series(name, color)', { count: 'exact' })  // 🆕 Feature 016: 包含系列顏色

    // 搜尋條件 (商品編號或名稱)
    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`)
    }

    // 單一系列篩選 (Feature 003)
    if (series_id) {
      query = query.eq('series_id', series_id)
    }

    // 多系列篩選 (Feature 016)
    if (series_ids && series_ids.length > 0) {
      query = query.in('series_id', series_ids)
    }

    // 狀態篩選
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // 排序 (Feature 016)
    const ascending = order === 'asc'
    if (sort === 'series_name') {
      // 系列名稱排序需要使用 foreignTable
      query = query.order('name', { ascending, foreignTable: 'series' })
    } else {
      // 其他欄位直接排序
      query = query.order(sort, { ascending })
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
      series_color: item.series?.color,  // 🆕 Feature 016: 系列顏色
      description: item.description,
      retail_price: item.retail_price,  // 🆕 Feature 003: 原價
      stock: item.stock,
      stock_status: item.stock_status,  // 🆕 Feature 003: 庫存狀態
      unit: item.unit,
      image_url: item.image_url,
      tags: item.tags || [],  // 🆕 Feature 006: 商品標籤
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
      tags: data.tags || [],  // 🆕 Feature 006: 商品標籤
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

    // 7. 記錄操作日誌 (Feature 008)
    await logAudit({
      target_type: 'product',
      target_id: newProduct.id,
      action_type: 'created',
      new_values: {
        series_id: data.series_id,
        name: data.name,
        retail_price: data.retail_price,
        stock: data.stock,
        stock_status: data.stock_status,
      },
    })

    // 8. 重新驗證快取
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

    // 4. 檢查商品是否存在並取得舊值 (用於 audit log)
    const { data: existingProduct } = await adminClient
      .from('products')
      .select('series_id, name, description, retail_price, stock, stock_status, unit, status')
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

    // 7. 記錄操作日誌 (Feature 008)
    await logAudit({
      target_type: 'product',
      target_id: id,
      action_type: 'updated',
      old_values: existingProduct,
      new_values: data,
    })

    // 8. 重新驗證快取
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

    // 2. 取得商品資料用於 audit log
    const { data: product } = await adminClient
      .from('products')
      .select('series_id, code, name, retail_price, stock')
      .eq('id', id)
      .single()

    if (!product) {
      return {
        success: false,
        message: '商品不存在',
      }
    }

    // 3. 檢查是否已有訂單記錄 (未來實作訂單功能時)
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

      // 記錄操作日誌 (Feature 008)
      await logAudit({
        target_type: 'product',
        target_id: id,
        action_type: 'updated',
        old_values: { status: 'active' },
        new_values: { status: 'inactive' },
        notes: '商品已有訂單記錄,執行軟刪除',
      })

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

      // 記錄操作日誌 (Feature 008)
      await logAudit({
        target_type: 'product',
        target_id: id,
        action_type: 'deleted',
        old_values: product,
        notes: '硬刪除商品',
      })

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

    // 3. 檢查商品是否存在並取得舊庫存 (用於 audit log)
    const { data: existingProduct } = await adminClient
      .from('products')
      .select('stock')
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

    // 5. 記錄操作日誌 (Feature 008)
    await logAudit({
      target_type: 'product',
      target_id: id,
      action_type: 'stock_adjusted',
      old_values: { stock: existingProduct.stock },
      new_values: { stock },
      notes: `庫存調整: ${existingProduct.stock} → ${stock}`,
    })

    // 6. 重新驗證快取
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

    // 5. 上傳前先刪除所有可能的舊圖片（避免不同副檔名的孤兒檔案）
    await adminClient.storage.from('products').remove([
      `${productId}/main.jpg`,
      `${productId}/main.png`,
      `${productId}/main.webp`,
    ])
    // 註: 即使檔案不存在也不會報錯

    // 6. 上傳新圖片到 Storage
    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
    const filePath = `${productId}/main.${ext}`

    const { error: uploadError } = await adminClient.storage
      .from('products')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // 已刪除舊檔案，不需要 upsert
      })

    if (uploadError) {
      console.error('uploadProductImage storage error:', uploadError)
      return {
        success: false,
        message: '圖片上傳失敗',
      }
    }

    // 7. 取得公開 URL
    const { data: urlData } = adminClient.storage.from('products').getPublicUrl(filePath)

    // 8. 更新商品的 image_url
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

    // 9. 重新驗證快取
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
 * 根據商品 ID 陣列查詢商品（用於批次標籤管理）
 * Feature: 006-ux-enhancement (US9)
 */
export async function getProductsByIds(productIds: string[]): Promise<ActionResult<Product[]>> {
  try {
    // 驗證權限
    await checkAuth('admin')

    if (!productIds || productIds.length === 0) {
      return {
        success: true,
        data: [],
      }
    }

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('products')
      .select('id, name, tags')
      .in('id', productIds)

    if (error) {
      console.error('getProductsByIds error:', error)
      return {
        success: false,
        message: '查詢商品失敗',
      }
    }

    const products: Product[] = (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      tags: item.tags || [],
      // 其他欄位不需要
    } as Product))

    return {
      success: true,
      data: products,
    }
  } catch (error: unknown) {
    console.error('getProductsByIds error:', error)
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      }
    }
    return {
      success: false,
      message: '查詢商品失敗',
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
          image_url,
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
          image_url,
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

// ============================================================
// Excel 匯入匯出功能
// ============================================================

import { productImportSchema, productExportFiltersSchema, type ProductImportRow, type ProductExportFilters } from '@/lib/validations/excel.schema'
import { jsonToExcelBuffer, excelBufferToJson, validateExcelFile, generateExcelFileName } from '@/lib/utils/excel'

/**
 * 匯出商品為 Excel 檔案
 * @param filters 選填的篩選條件
 * @returns Excel 檔案 Buffer 與檔案名稱
 */
export async function exportProducts(
  filters?: ProductExportFilters
): Promise<ActionResult<{ file_buffer: number[]; file_name: string }>> {
  try {
    // 1. 驗證管理員權限
    await checkAuth('admin')

    // 2. 驗證篩選條件
    const validatedFilters = filters ? productExportFiltersSchema.parse(filters) : {}

    const adminClient = createAdminClient()

    // 3. 查詢商品資料（含系列名稱）
    let query = adminClient
      .from('products')
      .select('code, name, series:series(name), retail_price, stock, unit, description, created_at')
      .order('created_at', { ascending: false })

    // 套用篩選條件
    if (validatedFilters.series_id) {
      query = query.eq('series_id', validatedFilters.series_id)
    }
    if (validatedFilters.status) {
      query = query.eq('status', validatedFilters.status)
    }
    if (validatedFilters.search) {
      query = query.or(`name.ilike.%${validatedFilters.search}%,code.ilike.%${validatedFilters.search}%`)
    }

    const { data: products, error } = await query

    if (error) {
      console.error('查詢商品失敗:', error)
      return { success: false, message: '查詢商品失敗' }
    }

    if (!products || products.length === 0) {
      return { success: false, message: '沒有符合條件的商品資料' }
    }

    // 4. 轉換為 Excel 格式
    const excelData = products.map((p: any) => ({
      '商品編號': p.code || '',
      '商品名稱': p.name || '',
      '所屬系列': p.series?.name || '',
      '零售價格': p.retail_price || 0,
      '庫存數量': p.stock || 0,
      '單位': p.unit || '件',
      '描述': p.description || '',
      '建立時間': new Date(p.created_at).toLocaleDateString('zh-TW'),
    }))

    // 5. 產生 Excel Buffer
    const excelBuffer = jsonToExcelBuffer(excelData, '商品資料')

    // 6. 回傳 Buffer 陣列與檔案名稱
    const fileName = generateExcelFileName('商品資料')

    return {
      success: true,
      data: {
        file_buffer: Array.from(excelBuffer),
        file_name: fileName,
      },
      message: `成功匯出 ${products.length} 筆商品資料`,
    }
  } catch (error) {
    console.error('exportProducts 錯誤:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '匯出失敗',
    }
  }
}

/**
 * 匯入商品 Excel 檔案
 * @param file Excel 檔案
 * @param options 匯入選項（試算模式、跳過錯誤）
 * @returns 匯入結果統計與錯誤明細
 */
export async function importProducts(
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
    const validRows: ProductImportRow[] = []

    // 5. 逐列驗證 Zod Schema
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]
      const rowNumber = i + 2 // Excel 第 1 列為標題

      const validatedRow = productImportSchema.safeParse(row)
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

    const allNames = validRows.map(row => row.商品名稱)

    const { data: existingProducts } = await adminClient
      .from('products')
      .select('name')
      .in('name', allNames)

    // 建立 Set 快速查詢
    const nameSet = new Set(existingProducts?.map(p => p.name) || [])

    // 查詢系列（含狀態）並建立 Map
    const { data: series } = await adminClient
      .from('series')
      .select('id, name, status')

    const seriesMap = new Map(series?.map(s => [s.name, { id: s.id, status: s.status }]) || [])

    // 7. 逐列驗證業務邏輯
    const validProducts: any[] = []

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]
      const rowNumber = i + 2

      // 檢查商品名稱重複
      if (nameSet.has(row.商品名稱)) {
        errors.push({
          row_number: rowNumber,
          field: '商品名稱',
          value: row.商品名稱,
          message: '商品名稱已存在',
        })
        continue
      }

      // 檢查系列是否存在
      const seriesInfo = seriesMap.get(row.所屬系列)
      if (!seriesInfo) {
        errors.push({
          row_number: rowNumber,
          field: '所屬系列',
          value: row.所屬系列,
          message: '系列不存在',
        })
        continue
      }

      // 檢查系列狀態
      if (seriesInfo.status !== 'active') {
        errors.push({
          row_number: rowNumber,
          field: '所屬系列',
          value: row.所屬系列,
          message: '系列已停用，無法新增商品',
        })
        continue
      }

      // 建立有效的商品資料（code 欄位由 Trigger 自動產生）
      validProducts.push({
        name: row.商品名稱,
        series_id: seriesInfo.id,
        retail_price: row.零售價格,
        stock: row.庫存數量 !== undefined ? row.庫存數量 : 0,
        unit: row.單位 || '件',
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
          success_count: validProducts.length,
          error_count: errors.length,
          errors,
          dry_run: true,
        },
        message: `試算驗證完成：${validProducts.length} 筆有效，${errors.length} 筆錯誤`,
      }
    }

    // 9. 正式匯入 - 批次 INSERT + 處理 Trigger 失敗錯誤
    if (validProducts.length === 0) {
      return {
        success: false,
        message: `沒有有效的資料可匯入（共 ${rawData.length} 筆，${errors.length} 筆錯誤）`,
      }
    }

    try {
      const { error: insertError } = await adminClient
        .from('products')
        .insert(validProducts)

      if (insertError) {
        console.error('批次匯入失敗:', insertError)

        // 檢查是否為唯一性約束違反（PostgreSQL 錯誤碼 23505）
        if (insertError.code === '23505') {
          return {
            success: false,
            message: '匯入失敗：部分商品名稱已存在（可能被其他管理員同時新增）',
          }
        }

        // 檢查是否為商品編號產生失敗
        if (insertError.message.includes('code') || insertError.message.includes('trigger')) {
          return {
            success: false,
            message: `商品編號產生失敗: ${insertError.message}，請聯絡系統管理員`,
          }
        }

        return {
          success: false,
          message: `匯入失敗: ${insertError.message}`,
        }
      }

      // 10. 更新快取
      revalidatePath('/admin/products')

      return {
        success: true,
        data: {
          total_rows: rawData.length,
          success_count: validProducts.length,
          error_count: errors.length,
          errors,
          dry_run: false,
        },
        message: `成功匯入 ${validProducts.length} 筆商品資料，請前往「價格管理」設定等級價格`,
      }
    } catch (error) {
      console.error('importProducts 異常:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : '匯入過程發生錯誤',
      }
    }
  } catch (error) {
    console.error('importProducts 錯誤:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '匯入失敗',
    }
  }
}

/**
 * 下載商品匯入範本
 * @returns Excel 檔案 Buffer 與檔案名稱
 */
export async function downloadProductTemplate(): Promise<
  ActionResult<{ file_buffer: number[]; file_name: string }>
> {
  try {
    // 1. 驗證管理員權限
    await checkAuth('admin')

    const adminClient = createAdminClient()

    // 2. 查詢第一個系列作為範例
    const { data: series } = await adminClient
      .from('series')
      .select('name')
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .limit(1)

    const firstSeries = series?.[0]

    // 3. 建立範本資料
    const templateData = [
      {
        '商品名稱': '範例商品名稱',
        '所屬系列': firstSeries?.name || '範例系列',
        '零售價格': 100,
        '庫存數量': 50,
        '單位': '件',
        '描述': '這是範例描述',
      },
    ]

    // 4. 產生 Excel Buffer
    const excelBuffer = jsonToExcelBuffer(templateData, '商品匯入範本')

    // 5. 回傳 Buffer 陣列與檔案名稱
    const fileName = '商品匯入範本.xlsx'

    return {
      success: true,
      data: {
        file_buffer: Array.from(excelBuffer),
        file_name: fileName,
      },
      message: '範本下載成功，請注意：商品編號將由系統自動產生',
    }
  } catch (error) {
    console.error('downloadProductTemplate 錯誤:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '下載範本失敗',
    }
  }
}


/**
 * 批次編輯商品
 * Feature: 016-product-management-enhancements (Phase 3)
 * 支援批次修改商品名稱、庫存、價格、單位
 */
export async function batchUpdateProducts(
  data: {
    products: {
      id: string
      name?: string
      stock?: number
      retail_price?: number | null
      unit?: string
    }[]
  }
): Promise<ActionResult<{ updated_count: number }>> {
  try {
    // 1. 驗證管理員權限
    const authContext = await checkAuth("admin")

    // 2. 驗證輸入資料
    const validation = batchUpdateProductsSchema.safeParse(data)
    if (!validation.success) {
      const errors: Record<string, string[]> = {}
      validation.error.issues.forEach((err) => {
        const path = err.path.join(".")
        if (!errors[path]) errors[path] = []
        errors[path].push(err.message)
      })
      return { success: false, errors, message: "資料驗證失敗" }
    }

    const { products } = validation.data
    const adminClient = createAdminClient()

    // 3. 批次更新商品（逐一更新以支援 RLS 與 Trigger）
    let updated_count = 0
    const errors: string[] = []

    for (const product of products) {
      try {
        // 建立更新物件（僅包含有提供的欄位）
        const updateData: Record<string, any> = {}
        if (product.name !== undefined) updateData.name = product.name
        if (product.stock !== undefined) updateData.stock = product.stock
        if (product.retail_price !== undefined) updateData.retail_price = product.retail_price
        if (product.unit !== undefined) updateData.unit = product.unit
        updateData.updated_at = new Date().toISOString()

        // 執行更新
        const { error } = await adminClient
          .from("products")
          .update(updateData)
          .eq("id", product.id)

        if (error) {
          // 檢查是否為唯一性約束違反（同系列內名稱重複）
          if (error.code === "23505" && error.message.includes("products_series_id_name_key")) {
            errors.push(`商品 ${product.id}: 同系列內已有相同名稱的商品`)
          } else {
            errors.push(`商品 ${product.id}: ${error.message}`)
          }
        } else {
          updated_count++
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "更新失敗"
        errors.push(`商品 ${product.id}: ${errMsg}`)
      }
    }

    // 4. 更新快取
    revalidatePath("/admin/products")

    // 5. 記錄操作日誌
    await logAudit({
      target_type: "product",
      target_id: "batch",
      action_type: "updated",
      new_values: { products, updated_count, errors },
      notes: `批次編輯 ${products.length} 個商品，成功 ${updated_count} 個`,
    })

    // 6. 回傳結果
    if (errors.length > 0) {
      return {
        success: true, // 部分成功
        data: { updated_count },
        message: `批次編輯完成：成功 ${updated_count} 個，失敗 ${errors.length} 個\n\n錯誤詳情：\n${errors.join("\n")}`,
      }
    }

    return {
      success: true,
      data: { updated_count },
      message: `成功更新 ${updated_count} 個商品`,
    }
  } catch (error) {
    console.error("batchUpdateProducts 錯誤:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "批次編輯失敗",
    }
  }
}
