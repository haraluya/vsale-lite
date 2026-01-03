'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

/**
 * 更新會員等級排序
 */
export async function reorderTiers(items: Array<{ id: string; rank: number }>): Promise<ActionResult> {
  try {
    await checkAuth('admin')

    const adminClient = createAdminClient()

    // 批次更新排序
    for (const item of items) {
      const { error } = await adminClient
        .from('tiers')
        .update({ rank: item.rank })
        .eq('id', item.id)

      if (error) {
        console.error('更新會員等級排序失敗:', error)
        return {
          success: false,
          message: '更新排序失敗',
        }
      }
    }

    revalidatePath('/admin/tiers')

    return {
      success: true,
      message: '排序更新成功',
    }
  } catch (error) {
    console.error('reorderTiers error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新排序失敗',
    }
  }
}

/**
 * 更新分類排序
 */
export async function reorderCategories(items: Array<{ id: string; sort_order: number }>): Promise<ActionResult> {
  try {
    await checkAuth('admin')

    const adminClient = createAdminClient()

    // 批次更新排序
    for (const item of items) {
      const { error } = await adminClient
        .from('categories')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)

      if (error) {
        console.error('更新分類排序失敗:', error)
        return {
          success: false,
          message: '更新排序失敗',
        }
      }
    }

    revalidatePath('/admin/categories')

    return {
      success: true,
      message: '排序更新成功',
    }
  } catch (error) {
    console.error('reorderCategories error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新排序失敗',
    }
  }
}

/**
 * 更新系列排序
 */
export async function reorderSeries(items: Array<{ id: string; sort_order: number }>): Promise<ActionResult> {
  try {
    await checkAuth('admin')

    const adminClient = createAdminClient()

    // 批次更新排序
    for (const item of items) {
      const { error } = await adminClient
        .from('series')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)

      if (error) {
        console.error('更新系列排序失敗:', error)
        return {
          success: false,
          message: '更新排序失敗',
        }
      }
    }

    revalidatePath('/admin/series')

    return {
      success: true,
      message: '排序更新成功',
    }
  } catch (error) {
    console.error('reorderSeries error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新排序失敗',
    }
  }
}
