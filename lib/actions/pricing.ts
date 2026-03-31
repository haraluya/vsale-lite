'use server'

/**
 * Pricing Management Server Actions
 * Feature: 007-system-enhancement (US5 - 價格管理優化)
 */

import { revalidatePath, revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import type { ActionResult } from '@/types'

/**
 * 查詢商品的價格矩陣（所有等級的價格）
 * @param productId 商品 ID
 * @returns 商品資訊與各等級價格
 */
export async function getProductPriceMatrix(
  productId: string
): Promise<ActionResult<{ product: any; prices: any[] }>> {
  try {
    // 1. 驗證管理員權限
    await checkAuth('admin')

    // 2. 查詢商品資訊
    const adminClient = createAdminClient()

    const { data: product, error: productError } = await adminClient
      .from('products')
      .select('id, code, name, retail_price, series_id, series(name)')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return { success: false, message: '找不到此商品' }
    }

    // 3. 查詢所有等級
    const { data: tiers, error: tiersError } = await adminClient
      .from('tiers')
      .select('id, name, code')
      .order('sort_order', { ascending: true })

    if (tiersError) {
      return { success: false, message: '查詢等級失敗' }
    }

    // 4. 查詢此商品的所有等級價格
    const { data: existingPrices, error: pricesError } = await adminClient
      .from('tier_prices')
      .select('tier_id, price')
      .eq('product_id', productId)

    if (pricesError) {
      return { success: false, message: '查詢價格失敗' }
    }

    // 5. 組合價格矩陣（包含未設定價格的等級）
    const priceMap = new Map(existingPrices?.map((p) => [p.tier_id, p.price]) || [])

    const prices = tiers?.map((tier) => ({
      tier_id: tier.id,
      tier_name: tier.name,
      tier_code: tier.code,
      price: priceMap.get(tier.id) || null,
    })) || []

    return {
      success: true,
      data: { product, prices },
    }
  } catch (error) {
    console.error('getProductPriceMatrix 異常:', error)
    return { success: false, message: '查詢失敗' }
  }
}

/**
 * 批次設定商品價格（UPSERT 邏輯）
 * @param productId 商品 ID
 * @param prices 等級價格對應表 { tier_id: price }
 */
export async function batchSetProductPrices(
  productId: string,
  prices: Record<string, number | null>
): Promise<ActionResult<void>> {
  try {
    // 1. 驗證管理員權限
    await checkAuth('admin')

    // 2. 分類：有價格的 UPSERT，null 的 DELETE
    const adminClient = createAdminClient()

    const toUpsert = Object.entries(prices)
      .filter(([, price]) => price !== null)
      .map(([tierId, price]) => ({
        product_id: productId,
        tier_id: tierId,
        price: price as number,
      }))

    const toDelete = Object.entries(prices)
      .filter(([, price]) => price === null)
      .map(([tierId]) => tierId)

    if (toUpsert.length === 0 && toDelete.length === 0) {
      return { success: false, message: '請至少設定一個價格' }
    }

    // 3. UPSERT 有價格的記錄
    if (toUpsert.length > 0) {
      const { error } = await adminClient
        .from('tier_prices')
        .upsert(toUpsert, {
          onConflict: 'tier_id,product_id',
        })

      if (error) {
        console.error('batchSetProductPrices UPSERT 錯誤:', error)
        return { success: false, message: '價格設定失敗' }
      }
    }

    // 4. DELETE 價格為 null 的記錄（清空價格，回退到零售價）
    if (toDelete.length > 0) {
      const { error } = await adminClient
        .from('tier_prices')
        .delete()
        .eq('product_id', productId)
        .in('tier_id', toDelete)

      if (error) {
        console.error('batchSetProductPrices DELETE 錯誤:', error)
        return { success: false, message: '清空價格失敗' }
      }
    }

    // 5. 同步零售等級價格到 products.retail_price
    const { data: retailTier } = await adminClient
      .from('tiers')
      .select('id')
      .eq('is_protected', true)
      .single()

    if (retailTier) {
      const retailEntry = toUpsert.find(p => p.tier_id === retailTier.id)
      if (retailEntry) {
        await adminClient
          .from('products')
          .update({ retail_price: retailEntry.price })
          .eq('id', productId)
      }
    }

    // 6. 更新快取
    revalidatePath('/admin/pricing')
    revalidateTag('tier-prices')
    revalidateTag('products')

    return { success: true, message: '價格設定成功' }
  } catch (error) {
    console.error('batchSetProductPrices 異常:', error)
    return { success: false, message: '價格設定失敗' }
  }
}

/**
 * 查詢商品列表（用於下拉選單）
 * - 依分類 > 系列分組排序
 * - 包含分類名稱與顏色
 */
export async function getProductsForPricing(): Promise<ActionResult<any[]>> {
  try {
    // 1. 驗證管理員權限
    await checkAuth('admin')

    // 2. 查詢商品列表
    const adminClient = createAdminClient()

    const { data: productsData, error: productsError } = await adminClient
      .from('products')
      .select('id, code, name, series_id')
      .eq('status', 'active')
      .order('code', { ascending: true })

    if (productsError) {
      console.error('getProductsForPricing 錯誤:', JSON.stringify(productsError, null, 2))
      return { success: false, message: `查詢商品失敗: ${productsError.message || JSON.stringify(productsError)}` }
    }

    if (!productsData || productsData.length === 0) {
      return { success: true, data: [] }
    }

    // 3. 查詢系列資料
    const seriesIds = [...new Set(productsData.map((p: any) => p.series_id).filter(Boolean))]
    const seriesMap = new Map<string, any>()

    if (seriesIds.length > 0) {
      const { data: seriesData } = await adminClient
        .from('series')
        .select('id, name, category_id')
        .in('id', seriesIds)

      if (seriesData && seriesData.length > 0) {
        // 4. 查詢分類資料
        const categoryIds = [...new Set(seriesData.map((s: any) => s.category_id).filter(Boolean))]
        const categoriesMap = new Map<string, any>()

        if (categoryIds.length > 0) {
          const { data: categoriesData } = await adminClient
            .from('categories')
            .select('id, name')
            .in('id', categoryIds)

          if (categoriesData) {
            categoriesData.forEach((cat: any) => {
              categoriesMap.set(cat.id, { name: cat.name })
            })
          }
        }

        // 組合系列與分類資料
        seriesData.forEach((s: any) => {
          seriesMap.set(s.id, {
            id: s.id,
            name: s.name,
            category_id: s.category_id,
            categories: s.category_id ? categoriesMap.get(s.category_id) || null : null
          })
        })
      }
    }

    // 5. 組合最終資料
    const processedData = productsData.map((p: any) => ({
      ...p,
      series: p.series_id ? seriesMap.get(p.series_id) || null : null
    }))

    // 6. 排序
    const sortedData = processedData.sort((a: any, b: any) => {
      const categoryA = a.series?.categories?.name || '未分類'
      const categoryB = b.series?.categories?.name || '未分類'
      const seriesA = a.series?.name || '未分類'
      const seriesB = b.series?.name || '未分類'

      // 先按分類排序
      if (categoryA !== categoryB) {
        return categoryA.localeCompare(categoryB, 'zh-TW')
      }

      // 再按系列排序
      if (seriesA !== seriesB) {
        return seriesA.localeCompare(seriesB, 'zh-TW')
      }

      // 最後按商品代碼排序
      return a.code.localeCompare(b.code)
    })

    return { success: true, data: sortedData }
  } catch (error) {
    console.error('getProductsForPricing 異常:', error)
    return { success: false, message: '查詢商品失敗' }
  }
}
