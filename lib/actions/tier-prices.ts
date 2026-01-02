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
 */
export async function setTierPrice(data: SetTierPriceInput): Promise<ActionResult<TierPrice>> {
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

    // UPSERT 操作 (若存在則更新,不存在則新增)
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
      console.error('setTierPrice 錯誤:', error)
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
 */
export async function batchSetTierPrices(
  data: BatchSetTierPricesInput
): Promise<ActionResult<{ updated: number }>> {
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

    // 批量 UPSERT 操作
    const { data: result, error } = await adminClient
      .from('tier_prices')
      .upsert(validation.data.prices, {
        onConflict: 'tier_id,product_id',
      })
      .select()

    if (error) {
      console.error('batchSetTierPrices 錯誤:', error)
      return { success: false, message: '批量設定價格失敗' }
    }

    // 更新快取
    revalidatePath('/admin/pricing')
    revalidatePath('/store')

    return {
      success: true,
      data: { updated: result.length },
      message: `批量設定價格成功（${result.length} 筆）`,
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
