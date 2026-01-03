'use server'

import { createClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import { revalidatePath } from 'next/cache'
import {
  createOrderSchema,
  type CreateOrderInput,
  type GetOrdersInput,
} from '@/lib/validations/order.schema'
import type {
  ActionResult,
  OrderWithUser,
  OrderDetail,
  GetOrdersResponse,
  CartItem,
  OrderItem,
} from '@/types'

/**
 * 訂單管理 Server Actions
 * Feature: 004-cart-and-orders
 */

/**
 * 建立訂單 (US2)
 * - 驗證購物車項目
 * - 查詢商品價格並建立價格快照
 * - 產生訂單編號
 * - 建立訂單與訂單明細
 * - 建立訂單歷史記錄
 */
export async function createOrder(
  input: CreateOrderInput
): Promise<ActionResult<{ orderId: string; orderNumber: string }>> {
  try {
    const supabase = await createClient()
    const { userId, role, tierId } = await checkAuth()

    // 管理員無法建立訂單
    if (role === 'admin') {
      return {
        success: false,
        message: '管理員帳號無法建立訂單',
      }
    }

    // 驗證輸入
    const validated = createOrderSchema.safeParse(input)
    if (!validated.success) {
      return {
        success: false,
        message: '訂單資料驗證失敗',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    const { items, notes } = validated.data

    // 1. 批次查詢商品與價格
    const productIds = items.map(item => item.productId)
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        status,
        tier_prices!inner(price)
      `)
      .in('id', productIds)
      .eq('tier_prices.tier_id', tierId!)
      .eq('status', 'active')

    if (productsError) {
      console.error('查詢商品錯誤:', productsError)
      return {
        success: false,
        message: '查詢商品資訊時發生錯誤',
      }
    }

    // 2. 驗證所有商品都有價格
    if (products.length !== items.length) {
      return {
        success: false,
        message: '部分商品不存在、已停用或未設定價格',
      }
    }

    // 3. 計算訂單總金額與建立訂單明細資料
    let totalAmount = 0
    const orderItemsData: Array<{
      product_id: string
      product_name_snapshot: string
      deal_price: number
      quantity: number
      subtotal: number
    }> = []

    for (const item of items) {
      const product = products.find(p => p.id === item.productId)
      if (!product) {
        return {
          success: false,
          message: `商品 ${item.productId} 不存在或已停用`,
        }
      }

      const price = (product.tier_prices as any)[0]?.price
      if (price === null || price === undefined) {
        return {
          success: false,
          message: `商品「${product.name}」未設定您的等級價格`,
        }
      }

      const subtotal = price * item.quantity
      totalAmount += subtotal

      orderItemsData.push({
        product_id: product.id,
        product_name_snapshot: product.name,
        deal_price: price,
        quantity: item.quantity,
        subtotal,
      })
    }

    // 4. 產生訂單編號 (呼叫 PostgreSQL Function)
    const { data: orderNumberData, error: orderNumberError } = await supabase
      .rpc('generate_order_number')

    if (orderNumberError || !orderNumberData) {
      console.error('產生訂單編號錯誤:', orderNumberError)
      return {
        success: false,
        message: '產生訂單編號時發生錯誤',
      }
    }

    const orderNumber = orderNumberData as string

    // 5. 建立訂單主表
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        total_amount: totalAmount,
        status: 'pending',
        notes: notes || null,
      })
      .select('id, order_number')
      .single()

    if (orderError || !order) {
      console.error('建立訂單錯誤:', orderError)

      // 檢查是否為訂單編號衝突 (極端情況)
      if (orderError?.code === '23505') {
        // Unique constraint violation - 重試機制可在此處實作
        return {
          success: false,
          message: '訂單編號衝突,請稍後再試',
        }
      }

      return {
        success: false,
        message: '建立訂單時發生錯誤',
      }
    }

    // 6. 建立訂單明細
    const orderItems = orderItemsData.map(item => ({
      order_id: order.id,
      ...item,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('建立訂單明細錯誤:', itemsError)
      // 回滾訂單 (刪除剛建立的訂單)
      await supabase.from('orders').delete().eq('id', order.id)
      return {
        success: false,
        message: '建立訂單明細時發生錯誤',
      }
    }

    // 7. 建立訂單歷史記錄
    const { error: timelineError } = await supabase
      .from('order_timelines')
      .insert({
        order_id: order.id,
        action_type: 'created',
        actor_id: userId,
        actor_role: 'client',
        new_status: 'pending',
      })

    if (timelineError) {
      console.error('建立訂單歷史錯誤:', timelineError)
      // 不回滾,僅記錄錯誤 (歷史記錄失敗不應阻止訂單建立)
    }

    // 8. 重新驗證相關頁面
    revalidatePath('/store/orders')
    revalidatePath('/admin/orders')

    return {
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
      },
      message: `訂單建立成功!訂單編號: ${order.order_number}`,
    }
  } catch (error) {
    console.error('createOrder error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '建立訂單時發生未知錯誤',
    }
  }
}

/**
 * 查詢訂單列表 (US2, US3, US4)
 * - 客戶只能查看自己的訂單 (RLS 自動過濾)
 * - 管理員可查看所有訂單
 * - 支援狀態篩選與搜尋
 */
export async function getOrders(
  params?: GetOrdersInput
): Promise<ActionResult<GetOrdersResponse>> {
  try {
    const supabase = await createClient()
    const { userId, role } = await checkAuth()

    const { status, search, page = 1, limit = 20 } = params || {}
    const offset = (page - 1) * limit

    // 建立基礎查詢
    let query = supabase
      .from('orders')
      .select(`
        *,
        profiles!inner(
          id,
          phone,
          display_name,
          tier_id,
          tiers(name)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 狀態篩選
    if (status) {
      query = query.eq('status', status)
    }

    // 管理員搜尋功能 (訂單編號或客戶名稱/手機)
    if (search && role === 'admin') {
      query = query.or(
        `order_number.ilike.%${search}%,profiles.phone.ilike.%${search}%,profiles.display_name.ilike.%${search}%`
      )
    }

    const { data: orders, count, error } = await query

    if (error) {
      console.error('查詢訂單錯誤:', error)
      return {
        success: false,
        message: '查詢訂單列表時發生錯誤',
      }
    }

    // 轉換資料格式
    const formattedOrders: OrderWithUser[] = (orders || []).map((order: any) => ({
      id: order.id,
      order_number: order.order_number,
      user_id: order.user_id,
      total_amount: order.total_amount,
      status: order.status,
      notes: order.notes,
      created_at: order.created_at,
      updated_at: order.updated_at,
      user_name: order.profiles?.display_name || order.profiles?.phone || '未知客戶',
      user_phone: order.profiles?.phone || '',
      tier_name: order.profiles?.tiers?.name || '未設定',
    }))

    return {
      success: true,
      data: {
        orders: formattedOrders,
        total: count || 0,
        page,
        limit,
      },
    }
  } catch (error) {
    console.error('getOrders error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢訂單列表時發生未知錯誤',
    }
  }
}

/**
 * 查詢訂單詳情 (US2, US3, US4)
 * - 包含訂單明細與操作歷史
 * - 客戶只能查看自己的訂單 (RLS 過濾)
 * - 管理員可查看所有訂單
 */
export async function getOrderById(
  orderId: string
): Promise<ActionResult<OrderDetail>> {
  try {
    const supabase = await createClient()
    const { userId, role } = await checkAuth()

    // 查詢訂單主表與關聯資料
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!inner(
          id,
          phone,
          display_name,
          tiers(name)
        ),
        order_items(
          id,
          product_id,
          product_name_snapshot,
          deal_price,
          quantity,
          subtotal,
          created_at
        ),
        order_timelines(
          id,
          action_type,
          actor_id,
          actor_role,
          old_status,
          new_status,
          notes,
          created_at,
          profiles(display_name, phone)
        )
      `)
      .eq('id', orderId)
      .single()

    if (error) {
      console.error('查詢訂單詳情錯誤:', error)

      if (error.code === 'PGRST116') {
        return {
          success: false,
          message: '訂單不存在或您無權查看',
        }
      }

      return {
        success: false,
        message: '查詢訂單詳情時發生錯誤',
      }
    }

    // 格式化訂單資料
    const orderDetail: OrderDetail = {
      id: order.id,
      order_number: order.order_number,
      user_id: order.user_id,
      total_amount: order.total_amount,
      status: order.status,
      notes: order.notes,
      created_at: order.created_at,
      updated_at: order.updated_at,
      user: {
        id: (order.profiles as any)?.id || '',
        name: (order.profiles as any)?.display_name || (order.profiles as any)?.phone || '未知客戶',
        phone: (order.profiles as any)?.phone || '',
        tier_name: (order.profiles as any)?.tiers?.name || '未設定',
      },
      items: ((order.order_items as any[]) || []).map((item: any) => ({
        id: item.id,
        order_id: order.id,
        product_id: item.product_id,
        product_name_snapshot: item.product_name_snapshot,
        deal_price: item.deal_price,
        quantity: item.quantity,
        subtotal: item.subtotal,
        created_at: item.created_at,
      })),
      timelines: ((order.order_timelines as any[]) || [])
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((timeline: any) => ({
          id: timeline.id,
          order_id: order.id,
          action_type: timeline.action_type,
          actor_id: timeline.actor_id,
          actor_role: timeline.actor_role,
          old_status: timeline.old_status,
          new_status: timeline.new_status,
          notes: timeline.notes,
          created_at: timeline.created_at,
          actor_name: timeline.profiles?.display_name || timeline.profiles?.phone || '系統',
        })),
    }

    return {
      success: true,
      data: orderDetail,
    }
  } catch (error) {
    console.error('getOrderById error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢訂單詳情時發生未知錯誤',
    }
  }
}
