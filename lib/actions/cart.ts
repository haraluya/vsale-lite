'use server'

import { createClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import type { ActionResult, CartItemWithProduct, ProductDetailInfo } from '@/types'
import type { ComboDealCartItem } from '@/stores/cart'
import { revalidatePath } from 'next/cache'

/**
 * 購物車 Server Actions
 * Feature: 004-cart-and-orders
 */

/**
 * 驗證商品是否可加入購物車
 * - 檢查商品是否存在且為 active
 * - 檢查是否有設定當前用戶等級的價格
 */
export async function validateCartItem(
  productId: string
): Promise<ActionResult<{ canAdd: boolean; message?: string }>> {
  try {
    const supabase = await createClient()
    const { userId, tierId, role } = await checkAuth()

    // 管理員無法使用購物車
    if (role === 'admin') {
      return {
        success: false,
        message: '管理員帳號無法使用購物車功能',
      }
    }

    // 檢查商品是否存在且為 active
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, status')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return {
        success: false,
        message: '商品不存在',
      }
    }

    if (product.status !== 'active') {
      return {
        success: false,
        message: '商品已停用',
      }
    }

    // 檢查是否有設定等級價格，若無則使用零售價格
    const { data: tierPrice } = await supabase
      .from('tier_prices')
      .select('price')
      .eq('product_id', productId)
      .eq('tier_id', tierId!)
      .single()

    // 若沒有等級價格，檢查是否有零售價格
    if (!tierPrice || tierPrice.price === null) {
      const { data: productData } = await supabase
        .from('products')
        .select('retail_price')
        .eq('id', productId)
        .single()

      if (!productData || productData.retail_price === null || productData.retail_price === undefined) {
        return {
          success: false,
          message: '此商品價格未設定,無法加入購物車',
        }
      }
    }

    return {
      success: true,
      data: { canAdd: true },
    }
  } catch (error) {
    console.error('validateCartItem error:', error)
    return {
      success: false,
      message: '驗證商品時發生錯誤',
    }
  }
}

/**
 * 取得購物車項目含商品資訊與價格
 * - 批次查詢商品資訊
 * - 查詢當前用戶等級價格
 * - 過濾已刪除或停用的商品
 */
export async function getCartItemsWithPrices(
  cartItems: { productId: string; quantity: number }[]
): Promise<ActionResult<CartItemWithProduct[]>> {
  try {
    if (cartItems.length === 0) {
      return { success: true, data: [] }
    }

    const supabase = await createClient()
    const { userId, tierId, role } = await checkAuth()

    // 管理員無法使用購物車
    if (role === 'admin') {
      return {
        success: false,
        message: '管理員帳號無法使用購物車功能',
      }
    }

    const productIds = cartItems.map(item => item.productId)

    // 批次查詢商品與價格（LEFT JOIN tier_prices 和 series）
    // ⚠️ 修復: 不在 SQL 層過濾 tier_id，避免過濾掉沒有等級價格的商品
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        image_url,
        retail_price,
        status,
        series_id,
        series:series_id(name),
        tier_prices!left(price, tier_id)
      `)
      .in('id', productIds)
      .eq('status', 'active')

    if (error) {
      console.error('getCartItemsWithPrices error:', error)
      return {
        success: false,
        message: '查詢購物車商品時發生錯誤',
      }
    }

    // 合併數量資訊並計算小計
    // 若沒有等級價格，則使用零售價格 (retail_price)
    // ⚠️ 修復: 在應用層過濾正確的等級價格
    const itemsWithPrices: CartItemWithProduct[] = products.map(product => {
      const cartItem = cartItems.find(item => item.productId === product.id)

      // 從所有 tier_prices 中找到符合當前等級的價格
      const tierPrices = product.tier_prices as any[] | undefined
      const tierPrice = tierPrices?.find(tp => tp.tier_id === tierId)?.price

      const price = tierPrice ?? product.retail_price ?? null
      const quantity = cartItem?.quantity || 1
      const seriesData = product.series as any

      return {
        productId: product.id,
        productName: product.name,
        seriesName: seriesData?.name || '未分類', // 系列名稱（購物車顯示用）
        imageUrl: product.image_url,
        quantity,
        price,
        subtotal: price ? price * quantity : 0,
        series_id: product.series_id, // 新增 series_id 欄位（優惠券系列限制驗證需要）
      }
    })

    return {
      success: true,
      data: itemsWithPrices,
    }
  } catch (error) {
    console.error('getCartItemsWithPrices error:', error)
    return {
      success: false,
      message: '查詢購物車商品時發生錯誤',
    }
  }
}

/**
 * 驗證購物車在結帳前的狀態
 * - 檢查所有商品仍然可用
 * - 檢查所有價格仍然有效
 * - 🆕 支援組合優惠驗證
 * - 回傳無效的商品列表
 */
export async function validateCartBeforeCheckout(
  cartItems: { productId: string; quantity: number }[],
  comboDealItems: ComboDealCartItem[] = []
): Promise<ActionResult<{
  isValid: boolean
  invalidItems: string[]
  message?: string
}>> {
  try {
    // 🆕 修復：檢查普通商品和組合優惠是否都為空
    if (cartItems.length === 0 && comboDealItems.length === 0) {
      return {
        success: false,
        message: '購物車是空的',
      }
    }

    // 🆕 如果只有組合優惠，直接通過驗證（組合優惠在 createOrder 中驗證）
    if (cartItems.length === 0 && comboDealItems.length > 0) {
      return {
        success: true,
        data: {
          isValid: true,
          invalidItems: [],
        },
      }
    }

    const supabase = await createClient()
    const { userId, tierId, role } = await checkAuth()

    // 管理員無法使用購物車
    if (role === 'admin') {
      return {
        success: false,
        message: '管理員帳號無法使用購物車功能',
      }
    }

    const productIds = cartItems.map(item => item.productId)
    const invalidItems: string[] = []

    // ✅ 優化：使用批次查詢避免 N+1 問題
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        status,
        retail_price,
        series:series_id(status),
        tier_prices!left(price, tier_id)
      `)
      .in('id', productIds)

    if (error) {
      console.error('批次查詢商品失敗:', error)
      return {
        success: false,
        message: '查詢商品資料時發生錯誤',
      }
    }

    // 在應用層進行驗證
    for (const productId of productIds) {
      const product = products?.find(p => p.id === productId)

      // 驗證 1: 商品是否存在且狀態為 active
      if (!product || product.status !== 'active') {
        invalidItems.push(productId)
        continue
      }

      // 驗證 2: 系列狀態檢查
      const series = product.series as any
      if (series && series.status !== 'active') {
        invalidItems.push(productId)
        continue
      }

      // 驗證 3: 價格檢查（優先使用等級價格，其次使用零售價格）
      const tierPrices = product.tier_prices as any[]
      const tierPrice = tierPrices?.find(tp => tp.tier_id === tierId)?.price
      const finalPrice = tierPrice ?? product.retail_price

      if (finalPrice === null || finalPrice === undefined) {
        invalidItems.push(productId)
      }
    }

    if (invalidItems.length > 0) {
      return {
        success: true,
        data: {
          isValid: false,
          invalidItems,
          message: `有 ${invalidItems.length} 個商品無法結帳(商品已停用或價格未設定)`,
        },
      }
    }

    return {
      success: true,
      data: {
        isValid: true,
        invalidItems: [],
      },
    }
  } catch (error) {
    console.error('validateCartBeforeCheckout error:', error)
    return {
      success: false,
      message: '驗證購物車時發生錯誤',
    }
  }
}

/**
 * 🆕 Feature 021 Enhancement: 取得組合優惠商品詳細資訊
 * - 批次查詢組合優惠中所有商品的完整資訊
 * - 包含系列名稱、商品名稱、商品編號、等級價格、圖片
 * - 返回 Map<product_id, ProductDetailInfo> 格式，方便快速查找
 */
export async function getComboDealProductDetails(
  comboDeals: ComboDealCartItem[]
): Promise<ActionResult<Map<string, ProductDetailInfo>>> {
  try {
    if (comboDeals.length === 0) {
      return { success: true, data: new Map() }
    }

    const supabase = await createClient()
    const { userId, tierId, role } = await checkAuth()

    // 管理員無法使用購物車
    if (role === 'admin') {
      return {
        success: false,
        message: '管理員帳號無法使用購物車功能',
      }
    }

    // 收集所有組合優惠中的商品 ID
    const productIds = new Set<string>()
    comboDeals.forEach(deal => {
      deal.selected_products.forEach(product => {
        productIds.add(product.product_id)
      })
    })

    if (productIds.size === 0) {
      return { success: true, data: new Map() }
    }

    // 批次查詢商品資訊（JOIN series 和 tier_prices）
    // ⚠️ 修復: 不在 SQL 層過濾 tier_id，避免過濾掉沒有等級價格的商品
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        code,
        image_url,
        retail_price,
        status,
        series_id,
        series:series_id(name),
        tier_prices!left(price, tier_id)
      `)
      .in('id', Array.from(productIds))
      .eq('status', 'active')

    if (error) {
      console.error('getComboDealProductDetails error:', error)
      return {
        success: false,
        message: '查詢組合優惠商品時發生錯誤',
      }
    }

    // 建立 Map 以便快速查找
    // ⚠️ 修復: 在應用層過濾正確的等級價格
    const productDetailsMap = new Map<string, ProductDetailInfo>()

    products.forEach(product => {
      const seriesData = product.series as any

      // 從所有 tier_prices 中找到符合當前等級的價格
      const tierPrices = product.tier_prices as any[] | undefined
      const tierPrice = tierPrices?.find(tp => tp.tier_id === tierId)?.price

      const unitPrice = tierPrice ?? product.retail_price ?? 0

      productDetailsMap.set(product.id, {
        product_id: product.id,
        product_name: product.name,
        product_code: product.code,
        series_id: product.series_id,
        series_name: seriesData?.name || '未分類',
        unit_price: unitPrice,
        retail_price: product.retail_price ?? unitPrice, // 🆕 零售價
        image_url: product.image_url,
      })
    })

    return {
      success: true,
      data: productDetailsMap,
    }
  } catch (error) {
    console.error('getComboDealProductDetails error:', error)
    return {
      success: false,
      message: '查詢組合優惠商品時發生錯誤',
    }
  }
}
