'use server'

/**
 * Quotation Server Actions
 * Feature: 價格管理優化 - 報價功能
 */

import { createAdminClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import type { ActionResult } from '@/types'

/**
 * 查詢系列列表 (用於報價功能)
 * 包含分類資訊用於分組顯示
 */
export async function getSeriesForQuotation(): Promise<ActionResult<any[]>> {
  try {
    await checkAuth('admin')

    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('series')
      .select(`
        id,
        name,
        code,
        status,
        sort_order,
        category_id,
        categories (
          id,
          name,
          sort_order
        )
      `)
      .eq('status', 'active')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('getSeriesForQuotation - 查詢系列失敗:', error)
      return { success: false, message: '查詢系列失敗' }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('getSeriesForQuotation 異常:', error)
    return { success: false, message: error instanceof Error ? error.message : '查詢系列失敗' }
  }
}

/**
 * 查詢報價資料
 * @param tier_id 等級 ID
 * @param series_ids 系列 ID 陣列
 */
export async function getQuotationData(
  tier_id: string,
  series_ids: string[]
): Promise<ActionResult<any[]>> {
  try {
    await checkAuth('admin')

    if (series_ids.length === 0) {
      return { success: false, message: '請至少選擇一個系列' }
    }

    const adminClient = createAdminClient()

    // 1. 查詢系列資訊
    const { data: seriesData, error: seriesError } = await adminClient
      .from('series')
      .select('id, name, sort_order')
      .in('id', series_ids)
      .order('sort_order', { ascending: true })

    if (seriesError) {
      console.error('getQuotationData - 查詢系列失敗:', seriesError)
      return { success: false, message: '查詢系列失敗' }
    }

    // 2. 查詢所有系列的商品
    const { data: products, error: productsError } = await adminClient
      .from('products')
      .select('id, code, name, series_id, retail_price')
      .in('series_id', series_ids)
      .eq('status', 'active')
      .order('code', { ascending: true })

    if (productsError) {
      console.error('getQuotationData - 查詢商品失敗:', productsError)
      return { success: false, message: '查詢商品失敗' }
    }

    if (!products || products.length === 0) {
      return { success: false, message: '所選系列沒有商品' }
    }

    // 3. 查詢該等級的所有商品價格
    const productIds = products.map((p) => p.id)
    const { data: tierPrices, error: tierPricesError } = await adminClient
      .from('tier_prices')
      .select('product_id, price')
      .eq('tier_id', tier_id)
      .in('product_id', productIds)

    if (tierPricesError) {
      console.error('getQuotationData - 查詢價格失敗:', tierPricesError)
      return { success: false, message: '查詢價格失敗' }
    }

    // 建立價格對應表
    const priceMap = new Map((tierPrices || []).map((p) => [p.product_id, p.price]))

    // 4. 整合資料 (依系列分組)
    const result = (seriesData || []).map((series) => {
      const seriesProducts = products
        .filter((p) => p.series_id === series.id)
        .map((p) => ({
          code: p.code,
          name: p.name,
          price: priceMap.get(p.id) || p.retail_price || null,
          retail_price: p.retail_price,
          tier_price: priceMap.get(p.id) || null,
        }))

      return {
        series_id: series.id,
        series_name: series.name,
        products: seriesProducts,
      }
    })

    return { success: true, data: result }
  } catch (error) {
    console.error('getQuotationData 異常:', error)
    return { success: false, message: error instanceof Error ? error.message : '查詢失敗' }
  }
}
