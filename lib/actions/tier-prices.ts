'use server'

/**
 * Tier Prices Management Server Actions
 * Feature: 003-series-and-pricing
 */

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import { setTierPriceSchema, batchSetTierPricesSchema } from '@/lib/validations/tier-price.schema'
import type { ActionResult, TierPrice, TierWithPrice } from '@/types'
import type { SetTierPriceInput, BatchSetTierPricesInput } from '@/lib/validations/tier-price.schema'

/**
 * 查詢所有會員等級與特定商品的價格 (管理員用於價格設定表格)
 * @param product_id 選填:若提供,回傳該商品的所有等級價格;若不提供,回傳所有等級(價格為 null)
 */
export async function getAllTiersWithPrices(
  product_id?: string
): Promise<ActionResult<TierWithPrice[]>> {
  try {
    await checkAuth('admin') // 僅管理員可執行

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    if (product_id) {
      // 查詢該商品的所有等級價格
      const { data, error } = await adminClient
        .from('tiers')
        .select(`
          id,
          name,
          rank,
          tier_prices (
            id,
            price
          )
        `)
        .order('rank', { ascending: true })

      if (error) {
        console.error('getAllTiersWithPrices 錯誤:', error)
        return { success: false, message: '查詢失敗' }
      }

      // 整合資料
      const result: TierWithPrice[] = data.map((tier: any) => {
        const tierPrice = tier.tier_prices?.find((tp: any) => tp.product_id === product_id)
        return {
          tier_id: tier.id,
          tier_name: tier.name,
          tier_rank: tier.rank,
          price: tierPrice?.price || null,
          price_id: tierPrice?.id || null,
        }
      })

      return { success: true, data: result }
    } else {
      // 僅查詢所有等級
      const { data, error } = await adminClient
        .from('tiers')
        .select('id, name, rank')
        .order('rank', { ascending: true })

      if (error) {
        console.error('getAllTiersWithPrices 錯誤:', error)
        return { success: false, message: '查詢失敗' }
      }

      const result: TierWithPrice[] = data.map((tier) => ({
        tier_id: tier.id,
        tier_name: tier.name,
        tier_rank: tier.rank,
        price: null,
        price_id: null,
      }))

      return { success: true, data: result }
    }
  } catch (error) {
    console.error('getAllTiersWithPrices 異常:', error)
    return { success: false, message: error instanceof Error ? error.message : '查詢失敗' }
  }
}

/**
 * 設定或更新單一商品在特定等級的價格 (僅管理員)
 * @param data 價格資料 { product_id, tier_id, price }
 *
 * 邏輯說明：
 * - 若 price 不為 null：UPSERT 操作（新增或更新）
 * - 若 price 為 null：DELETE 操作（刪除該筆價格記錄，客戶端將自動使用零售價）
 */
export async function setTierPrice(data: SetTierPriceInput): Promise<ActionResult<TierPrice | null>> {
  try {
    await checkAuth('admin') // 僅管理員可執行

    // 驗證輸入
    const validation = setTierPriceSchema.safeParse(data)
    if (!validation.success) {
      return {
        success: false,
        message: '輸入資料格式錯誤',
        errors: validation.error.flatten().fieldErrors,
      }
    }

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 檢查商品是否存在
    const { data: product } = await adminClient
      .from('products')
      .select('id')
      .eq('id', validation.data.product_id)
      .single()

    if (!product) {
      return { success: false, message: '商品不存在' }
    }

    // 檢查等級是否存在
    const { data: tier } = await adminClient
      .from('tiers')
      .select('id')
      .eq('id', validation.data.tier_id)
      .single()

    if (!tier) {
      return { success: false, message: '等級不存在' }
    }

    // 若 price 為 null，執行 DELETE 操作
    if (validation.data.price === null) {
      const { error } = await adminClient
        .from('tier_prices')
        .delete()
        .eq('product_id', validation.data.product_id)
        .eq('tier_id', validation.data.tier_id)

      if (error) {
        console.error('setTierPrice DELETE 錯誤:', error)
        return { success: false, message: '移除價格失敗' }
      }

      // 更新快取
      revalidatePath('/admin/pricing')
      revalidatePath(`/store/series/*`) // 更新所有系列詳情頁

      return {
        success: true,
        data: null,
        message: '價格已移除（將自動使用零售價格）',
      }
    }

    // 若 price 不為 null，執行 UPSERT 操作
    const { data: result, error } = await adminClient
      .from('tier_prices')
      .upsert(
        {
          product_id: validation.data.product_id,
          tier_id: validation.data.tier_id,
          price: validation.data.price,
        },
        {
          onConflict: 'tier_id,product_id',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('setTierPrice UPSERT 錯誤:', error)
      return { success: false, message: '價格設定失敗' }
    }

    // 更新快取
    revalidatePath('/admin/pricing')
    revalidatePath(`/store/series/*`) // 更新所有系列詳情頁

    return {
      success: true,
      data: result as TierPrice,
      message: '價格設定成功',
    }
  } catch (error) {
    console.error('setTierPrice 異常:', error)
    return { success: false, message: error instanceof Error ? error.message : '設定失敗' }
  }
}

/**
 * 批量設定多個商品在所有等級的價格 (僅管理員)
 * @param data 批量價格資料 { prices: [{ product_id, tier_id, price }, ...] }
 *
 * 邏輯說明：
 * - 若 price 不為 null：UPSERT 操作（新增或更新）
 * - 若 price 為 null：DELETE 操作（刪除該筆價格記錄，客戶端將自動使用零售價）
 */
export async function batchSetTierPrices(
  data: BatchSetTierPricesInput
): Promise<ActionResult<{ updated: number; deleted: number }>> {
  try {
    await checkAuth('admin') // 僅管理員可執行

    // 驗證輸入
    const validation = batchSetTierPricesSchema.safeParse(data)
    if (!validation.success) {
      return {
        success: false,
        message: '輸入資料格式錯誤',
        errors: validation.error.flatten().fieldErrors,
      }
    }

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 分類資料：需要 UPSERT 的（price 不為 null）與需要 DELETE 的（price 為 null）
    const toUpsert = validation.data.prices.filter(p => p.price !== null)
    const toDelete = validation.data.prices.filter(p => p.price === null)

    let upsertedCount = 0
    let deletedCount = 0

    // 1. 批量 UPSERT 操作（僅處理有價格的）
    if (toUpsert.length > 0) {
      const { data: result, error } = await adminClient
        .from('tier_prices')
        .upsert(toUpsert, {
          onConflict: 'tier_id,product_id',
        })
        .select()

      if (error) {
        console.error('batchSetTierPrices UPSERT 錯誤:', error)
        return { success: false, message: '批量設定價格失敗' }
      }

      upsertedCount = result.length
    }

    // 2. 批量 DELETE 操作（處理價格為 null 的）
    if (toDelete.length > 0) {
      for (const item of toDelete) {
        const { error } = await adminClient
          .from('tier_prices')
          .delete()
          .eq('product_id', item.product_id)
          .eq('tier_id', item.tier_id)

        if (error) {
          console.error('batchSetTierPrices DELETE 錯誤:', error)
          // 不中斷，繼續刪除其他記錄
        } else {
          deletedCount++
        }
      }
    }

    // 更新快取
    revalidatePath('/admin/pricing')
    revalidatePath('/store')

    return {
      success: true,
      data: { updated: upsertedCount, deleted: deletedCount },
      message: `批量設定價格成功（更新 ${upsertedCount} 筆，移除 ${deletedCount} 筆）`,
    }
  } catch (error) {
    console.error('batchSetTierPrices 異常:', error)
    return { success: false, message: error instanceof Error ? error.message : '設定失敗' }
  }
}

/**
 * 查詢單一商品在所有等級的價格 (管理員用於價格設定頁面)
 * @param product_id 商品 ID
 */
export async function getProductTierPrices(
  product_id: string
): Promise<ActionResult<TierPrice[]>> {
  try {
    await checkAuth('admin') // 僅管理員可執行

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('tier_prices')
      .select(`
        *,
        tiers (
          name
        )
      `)
      .eq('product_id', product_id)

    if (error) {
      console.error('getProductTierPrices 錯誤:', error)
      return { success: false, message: '查詢失敗' }
    }

    return { success: true, data: data as TierPrice[] }
  } catch (error) {
    console.error('getProductTierPrices 異常:', error)
    return { success: false, message: error instanceof Error ? error.message : '查詢失敗' }
  }
}

/**
 * 查詢指定系列的所有商品與其等級價格資訊 (Feature 003 Enhancement)
 * 用於系列批量價格設定頁面
 * @param series_id 系列 ID
 */
export async function getSeriesProductsForPricing(
  series_id: string
): Promise<ActionResult<any[]>> {
  try {
    await checkAuth('admin') // 僅管理員可執行

    // 使用 Admin Client 繞過 RLS
    const adminClient = createAdminClient()

    // 1. 查詢系列所有商品
    const { data: products, error: productsError } = await adminClient
      .from('products')
      .select('*')
      .eq('series_id', series_id)
      .order('code', { ascending: true })

    if (productsError) {
      console.error('getSeriesProductsForPricing 商品查詢錯誤:', productsError)
      return { success: false, message: '查詢商品失敗' }
    }

    if (!products || products.length === 0) {
      return { success: true, data: [] }
    }

    // 2. 查詢所有等級 (包含 is_protected)
    const { data: tiersData, error: tiersError } = await adminClient
      .from('tiers')
      .select('id, name, rank, is_protected')
      .order('rank', { ascending: true })

    if (tiersError) {
      console.error('getSeriesProductsForPricing 等級查詢錯誤:', tiersError)
      return { success: false, message: '查詢等級失敗' }
    }

    // 2.1 重新排序：is_protected 的等級（零售）永遠在最前面
    const tiers = [...(tiersData || [])].sort((a, b) => {
      if (a.is_protected && !b.is_protected) return -1
      if (!a.is_protected && b.is_protected) return 1
      return a.rank - b.rank
    })

    // 3. 查詢該系列所有商品的等級價格
    const productIds = products.map((p) => p.id)
    const { data: tierPrices, error: tierPricesError } = await adminClient
      .from('tier_prices')
      .select('*')
      .in('product_id', productIds)

    if (tierPricesError) {
      console.error('getSeriesProductsForPricing 價格查詢錯誤:', tierPricesError)
      console.error('  - 系列 ID:', series_id)
      console.error('  - 商品數量:', products.length)
      console.error('  - 商品 IDs:', productIds)
      return { success: false, message: '查詢價格失敗' }
    }

    // 3.1 如果沒有任何價格資料，記錄警告（可能是正常情況）
    if (!tierPrices || tierPrices.length === 0) {
      console.warn('⚠️ getSeriesProductsForPricing: 該系列商品尚無價格設定')
      console.warn('  - 系列 ID:', series_id)
      console.warn('  - 商品數量:', products.length)
      // 繼續執行，返回空價格
    }

    // 4. 整合資料
    const result = products.map((product) => {
      const productTierPrices = (tiers || []).map((tier) => {
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
    console.error('getSeriesProductsForPricing 異常:', error)
    return { success: false, message: error instanceof Error ? error.message : '查詢失敗' }
  }
}
