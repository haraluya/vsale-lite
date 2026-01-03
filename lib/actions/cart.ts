'use server'

import { createClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import type { ActionResult, CartItemWithProduct } from '@/types'
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

    // 檢查是否有設定等級價格
    const { data: tierPrice } = await supabase
      .from('tier_prices')
      .select('price')
      .eq('product_id', productId)
      .eq('tier_id', tierId!)
      .single()

    if (!tierPrice || tierPrice.price === null) {
      return {
        success: false,
        message: '此商品價格未設定,無法加入購物車',
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

    // 批次查詢商品與價格
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        image_url,
        status,
        tier_prices!inner(price)
      `)
      .in('id', productIds)
      .eq('tier_prices.tier_id', tierId!)
      .eq('status', 'active')

    if (error) {
      console.error('getCartItemsWithPrices error:', error)
      return {
        success: false,
        message: '查詢購物車商品時發生錯誤',
      }
    }

    // 合併數量資訊並計算小計
    const itemsWithPrices: CartItemWithProduct[] = products.map(product => {
      const cartItem = cartItems.find(item => item.productId === product.id)
      const price = (product.tier_prices as any)[0]?.price || null
      const quantity = cartItem?.quantity || 1

      return {
        productId: product.id,
        productName: product.name,
        imageUrl: product.image_url,
        quantity,
        price,
        subtotal: price ? price * quantity : 0,
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
 * - 回傳無效的商品列表
 */
export async function validateCartBeforeCheckout(
  cartItems: { productId: string; quantity: number }[]
): Promise<ActionResult<{
  isValid: boolean
  invalidItems: string[]
  message?: string
}>> {
  try {
    if (cartItems.length === 0) {
      return {
        success: false,
        message: '購物車是空的',
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

    // 逐一檢查每個商品
    for (const productId of productIds) {
      const { data: product } = await supabase
        .from('products')
        .select(`
          id,
          name,
          status,
          tier_prices!inner(price)
        `)
        .eq('id', productId)
        .eq('tier_prices.tier_id', tierId!)
        .single()

      if (!product || product.status !== 'active') {
        invalidItems.push(productId)
        continue
      }

      const price = (product.tier_prices as any)[0]?.price
      if (price === null || price === undefined) {
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
