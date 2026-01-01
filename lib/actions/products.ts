'use server'

/**
 * Products Management Server Actions
 * Feature: 002-product-management
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkAuth } from './helpers'
import { createProductSchema, updateProductSchema } from '@/lib/validations/product.schema'
import type { ActionResult, Product } from '@/types'

/**
 * 查詢商品列表 (含搜尋、篩選、分頁)
 */
export async function getProducts(params?: {
  search?: string
  category_id?: string
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
    const { search = '', category_id, status = 'active', page = 1, limit = 20 } = params || {}

    const supabase = await createClient()

    let query = supabase
      .from('products')
      .select('*, categories(name)', { count: 'exact' })
      .order('created_at', { ascending: false })

    // 搜尋條件 (商品編號或名稱)
    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`)
    }

    // 分類篩選
    if (category_id) {
      query = query.eq('category_id', category_id)
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
      category_id: item.category_id,
      category_name: item.categories?.name,
      description: item.description,
      stock: item.stock,
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
 */
export async function getProduct(id: string): Promise<Product | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
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
      category_id: data.category_id,
      category_name: data.categories?.name,
      description: data.description,
      stock: data.stock,
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
      code: formData.get('code'),
      name: formData.get('name'),
      category_id: formData.get('category_id'),
      description: formData.get('description') || '',
      stock: formData.get('stock') || '0',
      unit: formData.get('unit') || '件',
      status: formData.get('status') || 'active',
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

    const supabase = await createClient()

    // 4. 檢查商品編號是否重複
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('code', data.code)
      .single()

    if (existingProduct) {
      return {
        success: false,
        message: '此商品編號已存在',
      }
    }

    // 5. 驗證分類是否存在
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('id', data.category_id)
      .single()

    if (!category) {
      return {
        success: false,
        message: '選擇的分類不存在',
      }
    }

    // 6. 寫入資料庫
    const { data: newProduct, error } = await supabase
      .from('products')
      .insert({
        code: data.code,
        name: data.name,
        category_id: data.category_id,
        description: data.description || null,
        stock: data.stock,
        unit: data.unit,
        status: data.status,
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

    // 7. 重新驗證快取
    revalidatePath('/admin/products')

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
      name: formData.get('name'),
      category_id: formData.get('category_id'),
      description: formData.get('description') || '',
      stock: formData.get('stock'),
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

    const supabase = await createClient()

    // 4. 檢查商品是否存在
    const { data: existingProduct } = await supabase
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

    // 5. 若修改分類,驗證新分類是否存在
    if (data.category_id) {
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('id', data.category_id)
        .single()

      if (!category) {
        return {
          success: false,
          message: '選擇的分類不存在',
        }
      }
    }

    // 6. 更新資料庫
    const { error } = await supabase
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

    const supabase = await createClient()

    // 2. 檢查是否已有訂單記錄 (未來實作訂單功能時)
    // const { count } = await supabase
    //   .from('order_items')
    //   .select('*', { count: 'exact', head: true })
    //   .eq('product_id', id)

    // 目前先假設無訂單,執行硬刪除
    const count = 0

    if (count && count > 0) {
      // 軟刪除 (改為 inactive)
      const { error } = await supabase
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
      await supabase.storage.from('products').remove([
        `${id}/main.jpg`,
        `${id}/main.png`,
        `${id}/main.webp`,
      ])
      // 註: 不檢查錯誤,因為圖片可能不存在

      // 2. 刪除商品記錄
      const { error } = await supabase.from('products').delete().eq('id', id)

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

    const supabase = await createClient()

    // 3. 檢查商品是否存在
    const { data: existingProduct } = await supabase
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
    const { error } = await supabase
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

    const supabase = await createClient()

    // 4. 檢查商品是否存在
    const { data: product } = await supabase
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

    const { error: uploadError } = await supabase.storage
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
    const { data: urlData } = supabase.storage.from('products').getPublicUrl(filePath)

    // 7. 更新商品的 image_url
    const { error: updateError } = await supabase
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
 * 刪除商品圖片
 * Feature: 002-product-management (US4)
 */
export async function deleteProductImage(productId: string): Promise<ActionResult> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    const supabase = await createClient()

    // 2. 檢查商品是否存在
    const { data: product } = await supabase
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
    await supabase.storage.from('products').remove([
      `${productId}/main.jpg`,
      `${productId}/main.png`,
      `${productId}/main.webp`,
    ])

    // 4. 更新商品的 image_url 為 NULL
    const { error: updateError } = await supabase
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
