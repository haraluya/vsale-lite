'use server'

/**
 * Shop (Frontend) Server Actions
 * Feature: 003-series-and-pricing
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import type { ActionResult, Series, ProductWithPrice, CurrentUser } from '@/types'

/**
 * 查詢所有 active 系列 (前台系列列表頁面)
 * @param category_id 選填:過濾特定分類的系列
 */
export async function getActiveSeries(category_id?: string): Promise<ActionResult<Series[]>> {
  try {
    const supabase = await createClient()
    await checkAuth() // 驗證登入

    let query = supabase
      .from('series')
      .select('*')
      .eq('status', 'active')
      .order('sort_order', { ascending: true })

    // 若提供 category_id,過濾分類
    if (category_id) {
      query = query.eq('category_id', category_id)
    }

    const { data, error } = await query

    if (error) {
      console.error('getActiveSeries 錯誤:', error)
      return { success: false, message: '查詢失敗' }
    }

    return { success: true, data: data as Series[] }
  } catch (error) {
    console.error('getActiveSeries 異常:', error)
    return { success: false, message: error instanceof Error ? error.message : '查詢失敗' }
  }
}

/**
 * 查詢系列詳情頁的所有商品與當前用戶等級價格
 * @param series_id 系列 ID
 */
export async function getSeriesProductsWithPrice(
  series_id: string
): Promise<ActionResult<ProductWithPrice[]>> {
  try {
    const supabase = await createClient()
    const auth = await checkAuth() // 取得當前用戶與 tier_id

    // 檢查系列是否存在且 active
    const { data: series } = await supabase
      .from('series')
      .select('id, status')
      .eq('id', series_id)
      .single()

    if (!series) {
      return { success: false, message: '系列不存在' }
    }

    if (series.status !== 'active') {
      return { success: false, message: '系列已下架' }
    }

    // 查詢該系列下所有 active 商品,並 LEFT JOIN tier_prices
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        tier_prices!left (
          price
        )
      `)
      .eq('series_id', series_id)
      .eq('status', 'active')
      .eq('tier_prices.tier_id', auth.tierId || '')

    if (error) {
      console.error('getSeriesProductsWithPrice 錯誤:', error)
      return { success: false, message: '查詢商品失敗' }
    }

    // 整合價格資料
    // 🆕 若沒有設定等級價格，則預設使用零售價格 (retail_price)
    const products: ProductWithPrice[] = (data || []).map((product: any) => {
      const tierPrice = product.tier_prices?.[0]
      return {
        ...product,
        user_price: tierPrice?.price ?? product.retail_price ?? null,
        tier_prices: undefined, // 移除 JOIN 資料
      }
    })

    return { success: true, data: products }
  } catch (error) {
    console.error('getSeriesProductsWithPrice 異常:', error)
    return { success: false, message: error instanceof Error ? error.message : '查詢失敗' }
  }
}

/**
 * 查詢當前用戶資訊 (用於導航列顯示)
 */
export async function getCurrentUser(): Promise<ActionResult<CurrentUser>> {
  try {
    const supabase = await createClient()
    const auth = await checkAuth() // 取得當前用戶

    // JOIN profiles 與 tiers 表,取得用戶資訊與等級名稱
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        phone,
        email,
        role,
        tier_id,
        created_at,
        tiers (
          name
        )
      `)
      .eq('id', auth.userId)
      .single()

    if (error || !data) {
      return { success: false, message: '查詢用戶資訊失敗' }
    }

    const user: CurrentUser = {
      id: data.id,
      phone: data.phone,
      email: data.email,
      tier_id: data.tier_id,
      tier_name: (data.tiers as any)?.name || null,
      role: data.role as 'client' | 'admin',
      created_at: data.created_at,
    }

    return { success: true, data: user }
  } catch (error) {
    console.error('getCurrentUser 異常:', error)
    return { success: false, message: error instanceof Error ? error.message : '查詢失敗' }
  }
}

// 移除重複的 logout 函數，統一使用 lib/actions/auth.ts 中的 logout
