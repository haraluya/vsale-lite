'use server'

/**
 * Tags Management Server Actions
 * Feature: 006-ux-enhancement (US9)
 */

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkAuth } from './helpers'
import {
  updateProductTagsSchema,
  batchUpdateProductTagsSchema,
  type UpdateProductTagsInput,
  type BatchUpdateProductTagsInput,
} from '@/lib/validations/tags.schema'
import type { ActionResult } from '@/types'

/**
 * 更新單一商品標籤
 * Feature: 006-ux-enhancement (US9 - T065)
 */
export async function updateProductTags(
  input: UpdateProductTagsInput
): Promise<ActionResult> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 2. 驗證輸入
    const validationResult = updateProductTagsSchema.safeParse(input)

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors
      return {
        success: false,
        errors: errors as Record<string, string[]>,
        message: '驗證失敗',
      }
    }

    const { product_id, tags } = validationResult.data

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 3. 檢查商品是否存在
    const { data: product, error: productError } = await adminClient
      .from('products')
      .select('id')
      .eq('id', product_id)
      .single()

    if (productError || !product) {
      return {
        success: false,
        message: '商品不存在',
      }
    }

    // 4. 更新標籤
    const { error } = await adminClient
      .from('products')
      .update({ tags })
      .eq('id', product_id)

    if (error) {
      console.error('updateProductTags error:', error)
      return {
        success: false,
        message: '更新標籤失敗',
      }
    }

    // 5. 重新驗證快取
    revalidatePath('/admin/products')
    revalidatePath('/store')

    return {
      success: true,
      message: '標籤更新成功',
    }
  } catch (error: unknown) {
    console.error('updateProductTags error:', error)
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      }
    }
    return {
      success: false,
      message: '更新標籤失敗',
    }
  }
}

/**
 * 批次更新商品標籤
 * Feature: 006-ux-enhancement (US9 - T066)
 */
export async function batchUpdateProductTags(
  input: BatchUpdateProductTagsInput
): Promise<ActionResult> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 2. 驗證輸入
    const validationResult = batchUpdateProductTagsSchema.safeParse(input)

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors
      return {
        success: false,
        errors: errors as Record<string, string[]>,
        message: '驗證失敗',
      }
    }

    const { product_ids, operation, tags } = validationResult.data

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 3. 查詢所有商品的當前標籤
    const { data: products, error: fetchError } = await adminClient
      .from('products')
      .select('id, tags')
      .in('id', product_ids)

    if (fetchError || !products) {
      console.error('batchUpdateProductTags fetch error:', fetchError)
      return {
        success: false,
        message: '查詢商品失敗',
      }
    }

    // 4. 根據操作類型更新標籤
    const updates = products.map((product) => {
      const currentTags = product.tags || []
      let newTags: string[]

      if (operation === 'add') {
        // 新增標籤（去重）
        const combinedTags = [...currentTags, ...tags]
        newTags = Array.from(new Set(combinedTags)).slice(0, 5) // 限制最多 5 個
      } else {
        // 移除標籤
        newTags = currentTags.filter((tag) => !tags.includes(tag))
      }

      return {
        id: product.id,
        tags: newTags,
      }
    })

    // 5. 批次更新
    for (const update of updates) {
      const { error } = await adminClient
        .from('products')
        .update({ tags: update.tags })
        .eq('id', update.id)

      if (error) {
        console.error(`Failed to update product ${update.id}:`, error)
        // 繼續處理其他商品，不中斷整個批次操作
      }
    }

    // 6. 重新驗證快取
    revalidatePath('/admin/products')
    revalidatePath('/store')

    return {
      success: true,
      message: `成功更新 ${products.length} 個商品的標籤`,
    }
  } catch (error: unknown) {
    console.error('batchUpdateProductTags error:', error)
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      }
    }
    return {
      success: false,
      message: '批次更新標籤失敗',
    }
  }
}

/**
 * 取得所有使用中的標籤（用於自動完成）
 * Feature: 006-ux-enhancement (US9 - T067)
 *
 * 注意: getAvailableTags 已經在 products.ts 中實作，此處保留以符合 API 合約
 */
export async function getAvailableTags(): Promise<ActionResult<string[]>> {
  try {
    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 查詢所有啟用商品的標籤
    const { data, error } = await adminClient
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
    data?.forEach((item: { tags?: string[] | null }) => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => allTags.add(tag))
      }
    })

    // 按字母順序排序
    const sortedTags = Array.from(allTags).sort()

    return {
      success: true,
      data: sortedTags,
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
