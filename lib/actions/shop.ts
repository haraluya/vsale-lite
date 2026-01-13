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

    // JOIN categories 表以取得分類排序欄位
    let query = supabase
      .from('series')
      .select(`
        *,
        categories!inner (
          sort_order
        )
      `)
      .eq('status', 'active')
      .eq('categories.status', 'active')

    // 若提供 category_id,過濾分類
    if (category_id) {
      query = query.eq('category_id', category_id)
    }

    const { data, error } = await query

    if (error) {
      console.error('getActiveSeries 錯誤:', error)
      return { success: false, message: '查詢失敗' }
    }

    // 手動排序：1. 分類排序 2. 系列編號
    const sortedData = (data || [])
      .map((item: any) => ({
        ...item,
        category_sort_order: item.categories?.sort_order ?? 999,
      }))
      .sort((a, b) => {
        // 第一優先：分類排序
        if (a.category_sort_order !== b.category_sort_order) {
          return a.category_sort_order - b.category_sort_order
        }
        // 第二優先：系列編號（字母排序）
        return a.code.localeCompare(b.code, 'zh-TW')
      })
      .map(({ category_sort_order, categories, ...series }) => series) // 移除臨時欄位

    return { success: true, data: sortedData as Series[] }
  } catch (error) {
    console.error('getActiveSeries 異常:', error)
    return { success: false, message: error instanceof Error ? error.message : '查詢失敗' }
  }
}

/**
 * 查詢系列詳情頁的所有商品與當前用戶等級價格
 * @param series_id 系列 ID
 * @param filters 篩選條件（選填）
 */
export async function getSeriesProductsWithPrice(
  series_id: string | string[],
  filters?: {
    tags?: string[]
    maxItems?: number
  }
): Promise<ActionResult<ProductWithPrice[]>> {
  try {
    const supabase = await createClient()
    const auth = await checkAuth() // 取得當前用戶與 tier_id

    // 支援單一系列或多系列查詢
    const seriesIds = Array.isArray(series_id) ? series_id : [series_id]

    // 若指定系列，檢查系列是否都存在且 active（多系列查詢時跳過個別檢查）
    if (seriesIds.length === 1) {
      const { data: series } = await supabase
        .from('series')
        .select('id, status')
        .eq('id', seriesIds[0])
        .single()

      if (!series) {
        return { success: false, message: '系列不存在' }
      }

      if (series.status !== 'active') {
        return { success: false, message: '系列已下架' }
      }
    }

    // 查詢商品,並 LEFT JOIN tier_prices
    let query = supabase
      .from('products')
      .select(`
        *,
        series:series_id(name, color),
        tier_prices!left (
          price
        )
      `)
      .eq('status', 'active')
      .eq('tier_prices.tier_id', auth.tierId || '')

    // 篩選系列（支援多系列）
    if (seriesIds.length > 0) {
      query = query.in('series_id', seriesIds)
    }

    // 套用標籤篩選
    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags)
    }

    // 限制數量
    if (filters?.maxItems) {
      query = query.limit(filters.maxItems)
    }

    const { data, error } = await query

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
        series_name: product.series?.name || null,
        series_color: product.series?.color || null,
        tier_prices: undefined, // 移除 JOIN 資料
        series: undefined, // 移除 JOIN 資料
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

/**
 * 全域搜尋系列與商品
 * 搜尋範圍：系列名稱+編號、商品名稱+編號
 * @param query 搜尋關鍵字（至少 2 個字元）
 */
export async function globalSearch(
  query: string
): Promise<ActionResult<{
  series: Series[]
  products: ProductWithPrice[]
}>> {
  try {
    const supabase = await createClient()
    const auth = await checkAuth() // 驗證登入並取得 tier_id

    // 關鍵字太短，直接返回空結果
    if (query.trim().length < 2) {
      return {
        success: true,
        data: {
          series: [],
          products: [],
        },
      }
    }

    const searchTerm = query.trim()

    // 1. 搜尋系列（名稱 + 編號）JOIN 分類以取得排序
    const { data: seriesData, error: seriesError } = await supabase
      .from('series')
      .select(`
        *,
        categories!inner (
          sort_order
        )
      `)
      .eq('status', 'active')
      .eq('categories.status', 'active')
      .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
      .limit(20)

    if (seriesError) {
      console.error('globalSearch series error:', seriesError)
    }

    // 2. 搜尋商品（名稱 + 編號），包含等級價格
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select(`
        *,
        series:series_id (
          id,
          name,
          code,
          image_url
        ),
        tier_prices!left (
          price
        )
      `)
      .eq('status', 'active')
      .eq('tier_prices.tier_id', auth.tierId || '')
      .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (productsError) {
      console.error('globalSearch products error:', productsError)
    }

    // 2.5. 手動排序系列：1. 分類排序 2. 系列編號
    const sortedSeriesData = (seriesData || [])
      .map((item: any) => ({
        ...item,
        category_sort_order: item.categories?.sort_order ?? 999,
      }))
      .sort((a, b) => {
        // 第一優先：分類排序
        if (a.category_sort_order !== b.category_sort_order) {
          return a.category_sort_order - b.category_sort_order
        }
        // 第二優先：系列編號（字母排序）
        return a.code.localeCompare(b.code, 'zh-TW')
      })
      .map(({ category_sort_order, categories, ...series }) => series) // 移除臨時欄位

    // 3. 整合商品價格
    const products: ProductWithPrice[] = (productsData || []).map((product: any) => {
      const tierPrice = product.tier_prices?.[0]
      return {
        ...product,
        series_id: product.series?.id,
        series_name: product.series?.name,
        user_price: tierPrice?.price ?? product.retail_price ?? null,
        tier_prices: undefined, // 移除 JOIN 資料
      }
    })

    return {
      success: true,
      data: {
        series: sortedSeriesData as Series[],
        products,
      },
    }
  } catch (error) {
    console.error('globalSearch 異常:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '搜尋失敗',
    }
  }
}

// 移除重複的 logout 函數，統一使用 lib/actions/auth.ts 中的 logout
