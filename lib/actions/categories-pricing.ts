'use server'

/**
 * Categories Pricing Server Actions
 * Feature: 價格管理優化 - 分類模式
 */

import { createAdminClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import type { ActionResult } from '@/types'

/**
 * 查詢指定分類的所有商品與其等級價格資訊
 * 用於分類批量價格設定頁面
 * @param category_id 分類 ID
 */
export async function getCategoryProductsForPricing(
  category_id: string
): Promise<ActionResult<any[]>> {
  try {
    await checkAuth('admin') // 僅管理員可執行

    const adminClient = createAdminClient()

    // 1. 查詢分類下的所有系列
    const { data: seriesData, error: seriesError } = await adminClient
      .from('series')
      .select('id')
      .eq('category_id', category_id)
      .eq('status', 'active')

    if (seriesError) {
      console.error('getCategoryProductsForPricing - 查詢系列失敗:', seriesError)
      return { success: false, message: '查詢系列失敗' }
    }

    if (!seriesData || seriesData.length === 0) {
      return { success: true, data: [] }
    }

    const seriesIds = seriesData.map((s) => s.id)

    // 2. 查詢所有系列的商品（包含系列資訊）
    const { data: products, error: productsError } = await adminClient
      .from('products')
      .select(`
        *,
        series (
          id,
          name,
          sort_order
        )
      `)
      .in('series_id', seriesIds)
      .eq('status', 'active')
      .order('code', { ascending: true })

    if (productsError) {
      console.error('getCategoryProductsForPricing - 查詢商品失敗:', productsError)
      return { success: false, message: '查詢商品失敗' }
    }

    if (!products || products.length === 0) {
      return { success: true, data: [] }
    }

    // 3. 查詢所有等級
    const { data: tiersData, error: tiersError } = await adminClient
      .from('tiers')
      .select('id, name, rank, is_protected')
      .order('rank', { ascending: true })

    if (tiersError) {
      console.error('getCategoryProductsForPricing - 查詢等級失敗:', tiersError)
      return { success: false, message: '查詢等級失敗' }
    }

    // 重新排序: is_protected 的等級 (零售) 永遠在最前面
    const tiers = [...(tiersData || [])].sort((a, b) => {
      if (a.is_protected && !b.is_protected) return -1
      if (!a.is_protected && b.is_protected) return 1
      return a.rank - b.rank
    })

    // 4. 查詢所有商品的等級價格
    const productIds = products.map((p) => p.id)
    const { data: tierPrices, error: tierPricesError } = await adminClient
      .from('tier_prices')
      .select('*')
      .in('product_id', productIds)

    if (tierPricesError) {
      console.error('getCategoryProductsForPricing - 查詢價格失敗:', tierPricesError)
      return { success: false, message: '查詢價格失敗' }
    }

    // 5. 整合資料
    const result = products.map((product) => {
      const productTierPrices = tiers.map((tier) => {
        const tierPrice = (tierPrices || []).find(
          (tp) => tp.product_id === product.id && tp.tier_id === tier.id
        )
        return {
          tier_id: tier.id,
          tier_name: tier.name,
          tier_rank: tier.rank,
          price: tierPrice?.price || null,
          is_protected: tier.is_protected || false,
        }
      })

      return {
        ...product,
        tier_prices: productTierPrices,
      }
    })

    return { success: true, data: result }
  } catch (error) {
    console.error('getCategoryProductsForPricing 異常:', error)
    return { success: false, message: error instanceof Error ? error.message : '查詢失敗' }
  }
}
