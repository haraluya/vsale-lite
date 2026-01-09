'use server'

/**
 * Cleanup Management Server Actions
 *
 * 系統資料清理功能
 * - 一鍵掃描並刪除未使用的系列
 */

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import type { ActionResult } from '@/types'

export interface CleanupResult {
  total_series: number
  unused_series_count: number
  deleted_count: number
  failed_count: number
  deleted_series: Array<{
    code: string
    name: string
  }>
  failed_series: Array<{
    code: string
    name: string
    error: string
  }>
}

/**
 * 一鍵清理未使用的系列
 * @returns 清理結果報告
 */
export async function cleanupUnusedSeries(): Promise<ActionResult<CleanupResult>> {
  try {
    await checkAuth('admin') // 僅管理員可執行

    const adminClient = createAdminClient()

    // 1. 查詢所有系列
    const { data: allSeries, error: seriesError } = await adminClient
      .from('series')
      .select('id, code, name, status')
      .order('created_at', { ascending: false })

    if (seriesError) {
      console.error('查詢系列失敗:', seriesError)
      return { success: false, message: '查詢系列失敗' }
    }

    if (!allSeries || allSeries.length === 0) {
      return {
        success: true,
        data: {
          total_series: 0,
          unused_series_count: 0,
          deleted_count: 0,
          failed_count: 0,
          deleted_series: [],
          failed_series: [],
        },
        message: '沒有任何系列',
      }
    }

    const totalSeries = allSeries.length
    const deletedSeries: Array<{ code: string; name: string }> = []
    const failedSeries: Array<{ code: string; name: string; error: string }> = []

    // 2. 檢查每個系列是否有商品使用
    for (const series of allSeries) {
      // 檢查商品數量
      const { count: productCount } = await adminClient
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('series_id', series.id)

      // 如果有商品使用，跳過
      if (productCount && productCount > 0) {
        continue
      }

      // 沒有商品使用，嘗試刪除
      const { error: deleteError } = await adminClient
        .from('series')
        .delete()
        .eq('id', series.id)

      if (deleteError) {
        console.error(`刪除系列失敗 (${series.name}):`, deleteError)
        failedSeries.push({
          code: series.code,
          name: series.name,
          error: deleteError.message || '刪除失敗',
        })
      } else {
        deletedSeries.push({
          code: series.code,
          name: series.name,
        })
      }
    }

    // 3. 更新快取
    if (deletedSeries.length > 0) {
      revalidatePath('/admin/series')
      revalidatePath('/store')
    }

    const result: CleanupResult = {
      total_series: totalSeries,
      unused_series_count: deletedSeries.length + failedSeries.length,
      deleted_count: deletedSeries.length,
      failed_count: failedSeries.length,
      deleted_series: deletedSeries,
      failed_series: failedSeries,
    }

    return {
      success: true,
      data: result,
      message: `清理完成：共 ${totalSeries} 個系列，刪除 ${deletedSeries.length} 個未使用的系列`,
    }
  } catch (error) {
    console.error('cleanupUnusedSeries 異常:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '清理失敗',
    }
  }
}
