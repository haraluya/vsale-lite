'use server'

/**
 * Cleanup Management Server Actions
 *
 * 系統資料清理功能
 * - 掃描未使用的系列（預覽模式）
 * - 刪除未使用的系列（確認後執行）
 */

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import type { ActionResult } from '@/types'

export interface UnusedSeries {
  id: string
  code: string
  name: string
  status: string
  created_at: string
}

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
 * 掃描未使用的系列（預覽模式）
 * @returns 未使用的系列清單
 */
export async function scanUnusedSeries(): Promise<ActionResult<UnusedSeries[]>> {
  try {
    await checkAuth('admin') // 僅管理員可執行

    const adminClient = createAdminClient()

    // 1. 查詢所有系列
    const { data: allSeries, error: seriesError } = await adminClient
      .from('series')
      .select('id, code, name, status, created_at')
      .order('created_at', { ascending: false })

    if (seriesError) {
      console.error('查詢系列失敗:', seriesError)
      return { success: false, message: '查詢系列失敗' }
    }

    if (!allSeries || allSeries.length === 0) {
      return {
        success: true,
        data: [],
        message: '沒有任何系列',
      }
    }

    const unusedSeries: UnusedSeries[] = []

    // 2. 檢查每個系列是否有商品使用
    for (const series of allSeries) {
      const { count: productCount } = await adminClient
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('series_id', series.id)

      // 如果沒有商品使用，加入清單
      if (!productCount || productCount === 0) {
        unusedSeries.push({
          id: series.id,
          code: series.code,
          name: series.name,
          status: series.status,
          created_at: series.created_at,
        })
      }
    }

    return {
      success: true,
      data: unusedSeries,
      message: `找到 ${unusedSeries.length} 個未使用的系列代碼`,
    }
  } catch (error) {
    console.error('scanUnusedSeries 異常:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '掃描失敗',
    }
  }
}

/**
 * 批次刪除指定的系列
 * @param seriesIds 要刪除的系列 ID 陣列
 * @returns 清理結果報告
 */
export async function batchDeleteSeries(seriesIds: string[]): Promise<ActionResult<CleanupResult>> {
  try {
    await checkAuth('admin') // 僅管理員可執行

    if (!seriesIds || seriesIds.length === 0) {
      return { success: false, message: '請選擇至少一個系列' }
    }

    const adminClient = createAdminClient()

    const deletedSeries: Array<{ code: string; name: string }> = []
    const failedSeries: Array<{ code: string; name: string; error: string }> = []

    // 逐一刪除指定的系列
    for (const seriesId of seriesIds) {
      // 查詢系列資訊
      const { data: series } = await adminClient
        .from('series')
        .select('id, name, code')
        .eq('id', seriesId)
        .single()

      if (!series) {
        failedSeries.push({
          code: '未知',
          name: '未知',
          error: '系列不存在',
        })
        continue
      }

      // 再次檢查是否有商品使用（雙重確認）
      const { count: productCount } = await adminClient
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('series_id', seriesId)

      if (productCount && productCount > 0) {
        failedSeries.push({
          code: series.code,
          name: series.name,
          error: `有 ${productCount} 個商品正在使用`,
        })
        continue
      }

      // 刪除系列
      const { error: deleteError } = await adminClient
        .from('series')
        .delete()
        .eq('id', seriesId)

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

    // 更新快取（確保新增系列頁面也會重新驗證）
    if (deletedSeries.length > 0) {
      revalidatePath('/admin/series')
      revalidatePath('/admin/series/new')
      revalidatePath('/store')
    }

    const result: CleanupResult = {
      total_series: seriesIds.length,
      unused_series_count: seriesIds.length,
      deleted_count: deletedSeries.length,
      failed_count: failedSeries.length,
      deleted_series: deletedSeries,
      failed_series: failedSeries,
    }

    return {
      success: true,
      data: result,
      message: `清理完成：成功刪除 ${deletedSeries.length} 個系列，失敗 ${failedSeries.length} 個`,
    }
  } catch (error) {
    console.error('batchDeleteSeries 異常:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '刪除失敗',
    }
  }
}
