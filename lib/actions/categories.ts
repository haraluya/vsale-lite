'use server'

/**
 * Categories Management Server Actions
 * Feature: 002-product-management
 */

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { checkAuth } from './helpers'
import { createCategorySchema, updateCategorySchema } from '@/lib/validations/category.schema'
import type { ActionResult, Category } from '@/types'

/**
 * 查詢所有商品分類（依 sort_order 排序）
 */
export async function getCategories(): Promise<Category[]> {
  try {
    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('getCategories error:', error)
      return []
    }

    return data as Category[]
  } catch (error) {
    console.error('getCategories error:', error)
    return []
  }
}

/**
 * 建立新商品分類
 */
export async function createCategory(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 2. 解析表單資料
    const rawData = {
      name: formData.get('name'),
      code: formData.get('code'),
      description: formData.get('description') || '',
    }

    // 3. 驗證輸入
    const validationResult = createCategorySchema.safeParse(rawData)

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors
      return {
        success: false,
        errors: errors as Record<string, string[]>,
        message: '驗證失敗',
      }
    }

    const data = validationResult.data

    // 4. 檢查分類名稱與代碼是否重複（使用 Admin Client）
    const adminClient = createAdminClient()

    const { data: existingCategory } = await adminClient
      .from('categories')
      .select('id')
      .eq('name', data.name)
      .single()

    if (existingCategory) {
      return {
        success: false,
        message: '此分類名稱已存在',
      }
    }

    const { data: existingCode } = await adminClient
      .from('categories')
      .select('id')
      .eq('code', data.code)
      .single()

    if (existingCode) {
      return {
        success: false,
        message: '此分類代碼已存在',
      }
    }

    // 5. 寫入資料庫
    const { data: newCategory, error } = await adminClient
      .from('categories')
      .insert({
        name: data.name,
        code: data.code,
        description: data.description || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('createCategory error:', error)
      return {
        success: false,
        message: '建立分類失敗',
      }
    }

    // 6. 重新驗證快取（使用細粒度標籤失效）
    revalidateTag('categories')
    revalidateTag('series')  // 系列有 category 關聯
    revalidateTag('products')  // 商品透過 series 關聯分類

    return {
      success: true,
      data: { id: newCategory.id },
      message: '分類建立成功',
    }
  } catch (error: unknown) {
    console.error('createCategory error:', error)
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      }
    }
    return {
      success: false,
      message: '建立分類失敗',
    }
  }
}

/**
 * 更新商品分類
 */
export async function updateCategory(
  id: string,
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 2. 解析表單資料
    const rawData = {
      name: formData.get('name'),
      code: formData.get('code'),
      description: formData.get('description') || '',
    }

    // 3. 驗證輸入
    const validationResult = updateCategorySchema.safeParse(rawData)

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors
      return {
        success: false,
        errors: errors as Record<string, string[]>,
        message: '驗證失敗',
      }
    }

    const data = validationResult.data

    // 4. 檢查分類是否存在（使用 Admin Client）
    const adminClient = createAdminClient()

    const { data: existingCategory } = await adminClient
      .from('categories')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingCategory) {
      return {
        success: false,
        message: '分類不存在',
      }
    }

    // 5. 若修改 name,檢查是否與其他分類重複
    if (data.name) {
      const { data: duplicateCategory } = await adminClient
        .from('categories')
        .select('id')
        .eq('name', data.name)
        .neq('id', id)
        .single()

      if (duplicateCategory) {
        return {
          success: false,
          message: '此分類名稱已存在',
        }
      }
    }

    // 5.5 若修改 code,檢查是否與其他分類重複
    if (data.code) {
      const { data: duplicateCode } = await adminClient
        .from('categories')
        .select('id')
        .eq('code', data.code)
        .neq('id', id)
        .single()

      if (duplicateCode) {
        return {
          success: false,
          message: '此分類代碼已存在',
        }
      }
    }

    // 6. 更新資料庫
    const { error } = await adminClient
      .from('categories')
      .update(data)
      .eq('id', id)

    if (error) {
      console.error('updateCategory error:', error)
      return {
        success: false,
        message: '更新分類失敗',
      }
    }

    // 7. 重新驗證快取（使用細粒度標籤失效）
    revalidateTag('categories')
    revalidateTag(`category:${id}`)  // 單一分類快取
    revalidateTag('series')
    revalidateTag('products')

    return {
      success: true,
      message: '分類更新成功',
    }
  } catch (error: unknown) {
    console.error('updateCategory error:', error)
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      }
    }
    return {
      success: false,
      message: '更新分類失敗',
    }
  }
}

/**
 * 刪除商品分類
 */
export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    const adminClient = createAdminClient()

    // 2. 檢查是否有系列使用此分類 (Feature 003: 商品改為關聯系列)
    const { count } = await adminClient
      .from('series')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)

    if (count && count > 0) {
      return {
        success: false,
        message: `此分類已有 ${count} 個系列使用,請先將系列遷移至其他分類後再刪除`,
      }
    }

    // 3. 執行硬刪除
    const { error } = await adminClient
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('deleteCategory error:', error)
      return {
        success: false,
        message: '刪除分類失敗',
      }
    }

    // 4. 重新驗證快取（使用細粒度標籤失效）
    revalidateTag('categories')
    revalidateTag(`category:${id}`)
    revalidateTag('series')
    revalidateTag('products')

    return {
      success: true,
      message: '分類刪除成功',
    }
  } catch (error: unknown) {
    console.error('deleteCategory error:', error)
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      }
    }
    return {
      success: false,
      message: '刪除分類失敗',
    }
  }
}

/**
 * 將某分類的所有商品批量遷移至其他分類
 */
export async function migrateCategoryProducts(
  fromCategoryId: string,
  toCategoryId: string
): Promise<ActionResult<{ count: number }>> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 2. 驗證不可為相同分類
    if (fromCategoryId === toCategoryId) {
      return {
        success: false,
        message: '來源分類與目標分類不可相同',
      }
    }

    const adminClient = createAdminClient()

    // 3. 驗證來源分類與目標分類是否存在
    const [fromCategory, toCategory] = await Promise.all([
      adminClient.from('categories').select('id, name').eq('id', fromCategoryId).single(),
      adminClient.from('categories').select('id, name').eq('id', toCategoryId).single(),
    ])

    if (!fromCategory.data) {
      return {
        success: false,
        message: '來源分類不存在',
      }
    }

    if (!toCategory.data) {
      return {
        success: false,
        message: '目標分類不存在',
      }
    }

    // 4. 批量更新商品分類
    const { data, error } = await adminClient
      .from('products')
      .update({ category_id: toCategoryId })
      .eq('category_id', fromCategoryId)
      .select()

    const count = data?.length || 0

    if (error) {
      console.error('migrateCategoryProducts error:', error)
      return {
        success: false,
        message: '遷移商品失敗',
      }
    }

    // 5. 重新驗證快取（使用細粒度標籤失效）
    revalidateTag('categories')
    revalidateTag('products')  // 商品分類變更

    return {
      success: true,
      data: { count },
      message: count > 0
        ? `已成功將 ${count} 個商品從「${fromCategory.data.name}」遷移至「${toCategory.data.name}」`
        : '此分類沒有商品需要遷移',
    }
  } catch (error: unknown) {
    console.error('migrateCategoryProducts error:', error)
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      }
    }
    return {
      success: false,
      message: '遷移商品失敗',
    }
  }
}

/**
 * 批次更新分類排序
 */
export async function updateCategoriesOrder(
  categoryOrders: Array<{ id: string; sort_order: number }>
): Promise<ActionResult> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    const adminClient = createAdminClient()

    // 2. 批次更新排序
    const updates = categoryOrders.map(({ id, sort_order }) =>
      adminClient
        .from('categories')
        .update({ sort_order })
        .eq('id', id)
    )

    const results = await Promise.all(updates)

    // 3. 檢查是否有錯誤
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error('updateCategoriesOrder errors:', errors)
      return {
        success: false,
        message: '更新排序失敗',
      }
    }

    // 4. 重新驗證快取（使用細粒度標籤失效）
    revalidateTag('categories')  // 排序變更

    return {
      success: true,
      message: '排序更新成功',
    }
  } catch (error: unknown) {
    console.error('updateCategoriesOrder error:', error)
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      }
    }
    return {
      success: false,
      message: '更新排序失敗',
    }
  }
}
