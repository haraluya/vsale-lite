'use server'

import { createClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import { revalidatePath } from 'next/cache'
import {
  createOrderSchema,
  addOrderCommentSchema,
  type CreateOrderInput,
  type GetOrdersInput,
  type AddOrderCommentInput,
} from '@/lib/validations/order.schema'
import { deleteOrderSchema, type DeleteOrderInput } from '@/lib/validations/tags.schema'
import type {
  ActionResult,
  OrderWithUser,
  OrderDetail,
  GetOrdersResponse,
  CartItem,
  OrderItem,
  OrderTimelineWithActor,
} from '@/types'
import { logAudit } from './audit'

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
    // 注意：orders.user_id -> auth.users.id, profiles.id -> auth.users.id
    // 沒有直接的 FK，需要分別查詢
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 狀態篩選
    if (status) {
      query = query.eq('status', status)
    }

    // 訂單編號搜尋
    if (search && role === 'admin') {
      query = query.ilike('order_number', `%${search}%`)
    }

    const { data: orders, count, error } = await query

    if (error) {
      console.error('查詢訂單錯誤:', error)
      return {
        success: false,
        message: '查詢訂單列表時發生錯誤',
      }
    }

    if (!orders || orders.length === 0) {
      return {
        success: true,
        data: {
          orders: [],
          total: 0,
          page,
          limit,
        },
      }
    }

    // 批次查詢用戶資料
    const userIds = orders.map((order: any) => order.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, phone, display_name, tier_id, tiers(name)')
      .in('id', userIds)

    // 建立 user_id -> profile 的對應表
    const profileMap = new Map(
      (profiles || []).map((profile: any) => [profile.id, profile])
    )

    // 轉換資料格式
    const formattedOrders: OrderWithUser[] = orders.map((order: any) => {
      const profile = profileMap.get(order.user_id)
      return {
        id: order.id,
        order_number: order.order_number,
        user_id: order.user_id,
        total_amount: order.total_amount,
        status: order.status,
        notes: order.notes,
        created_at: order.created_at,
        updated_at: order.updated_at,
        user_name: profile?.display_name || profile?.phone || '未知客戶',
        user_phone: profile?.phone || '',
        tier_name: profile?.tiers?.name || '未設定',
      }
    })

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

    // 查詢訂單主表
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
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

    // 查詢訂單客戶資料 (Feature 007: 新增 address 與 admin_notes)
    // 注意：客戶端不應該看到 admin_notes
    const selectFields = role === 'admin'
      ? 'id, phone, display_name, tier_id, address, admin_notes, tiers(name)'
      : 'id, phone, display_name, tier_id, address, tiers(name)'

    const { data: profile } = await supabase
      .from('profiles')
      .select(selectFields)
      .eq('id', order.user_id)
      .single()

    // 查詢訂單明細
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    // 查詢訂單歷史
    const { data: orderTimelines } = await supabase
      .from('order_timelines')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    // 批次查詢操作者資料（用於時間軸）
    const actorIds = (orderTimelines || []).map(t => t.actor_id).filter(Boolean)
    const { data: actors } = await supabase
      .from('profiles')
      .select('id, display_name, phone')
      .in('id', actorIds)

    const actorMap = new Map((actors || []).map((actor: any) => [actor.id, actor]))

    // 格式化訂單資料
    const profileData = profile as any
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
        id: profileData?.id || order.user_id,
        name: profileData?.display_name || profileData?.phone || '未知客戶',
        phone: profileData?.phone || '',
        tier_name: profileData?.tiers?.name || '未設定',
        address: profileData?.address || null,  // 🆕 Feature 007
        admin_notes: role === 'admin' ? (profileData?.admin_notes || null) : null,  // 🆕 Feature 007: 僅管理員可見
      },
      items: (orderItems || []).map((item: any) => ({
        id: item.id,
        order_id: item.order_id,
        product_id: item.product_id,
        product_name_snapshot: item.product_name_snapshot,
        deal_price: item.deal_price,
        quantity: item.quantity,
        subtotal: item.subtotal,
        created_at: item.created_at,
      })),
      timelines: (orderTimelines || []).map((timeline: any) => {
        const actor = actorMap.get(timeline.actor_id)
        return {
          id: timeline.id,
          order_id: timeline.order_id,
          action_type: timeline.action_type,
          actor_id: timeline.actor_id,
          actor_role: timeline.actor_role,
          old_status: timeline.old_status,
          new_status: timeline.new_status,
          content: timeline.content,
          created_at: timeline.created_at,
          actor_name: actor?.display_name || actor?.phone || '系統',
        }
      }),
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

/**
 * 確認訂單並扣減庫存 (US3 - 管理員)
 * - 呼叫 PostgreSQL Function 確保原子性操作
 * - 訂單狀態從 pending → confirmed
 * - 扣減商品庫存（支援負庫存）
 * - 自動記錄操作歷史
 */
export async function confirmOrder(
  orderId: string
): Promise<ActionResult<{ orderId: string }>> {
  try {
    const supabase = await createClient()
    const { userId, role } = await checkAuth()

    // 僅管理員可確認訂單
    if (role !== 'admin') {
      return {
        success: false,
        message: '僅管理員可執行此操作',
      }
    }

    // 呼叫 PostgreSQL Function 進行原子性操作
    const { data, error } = await supabase.rpc('confirm_order_and_deduct_stock', {
      p_order_id: orderId,
      p_actor_id: userId,
    })

    if (error || !data) {
      console.error('確認訂單錯誤:', error)
      return {
        success: false,
        message: error?.message || '確認訂單時發生錯誤',
      }
    }

    // 檢查 Function 回傳結果
    const result = data as { success: boolean; error?: string; order_id?: string }
    if (!result.success) {
      return {
        success: false,
        message: result.error || '確認訂單失敗',
      }
    }

    // 重新驗證相關頁面
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/store/orders')

    return {
      success: true,
      data: { orderId: result.order_id || orderId },
      message: '訂單已確認，庫存已扣減',
    }
  } catch (error) {
    console.error('confirmOrder error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '確認訂單時發生未知錯誤',
    }
  }
}

/**
 * 更新訂單狀態 (US3 - 管理員)
 * - confirmed → shipping → completed
 * - 呼叫 PostgreSQL Function 確保原子性操作
 * - 自動記錄操作歷史
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: 'confirmed' | 'shipping' | 'completed'
): Promise<ActionResult<{ orderId: string; newStatus: string }>> {
  try {
    const supabase = await createClient()
    const { userId, role } = await checkAuth()

    // 僅管理員可更新訂單狀態
    if (role !== 'admin') {
      return {
        success: false,
        message: '僅管理員可執行此操作',
      }
    }

    // 呼叫 PostgreSQL Function 進行原子性操作
    const { data, error } = await supabase.rpc('update_order_status', {
      p_order_id: orderId,
      p_new_status: newStatus,
      p_actor_id: userId,
    })

    if (error || !data) {
      console.error('更新訂單狀態錯誤:', error)
      return {
        success: false,
        message: error?.message || '更新訂單狀態時發生錯誤',
      }
    }

    // 檢查 Function 回傳結果
    const result = data as { success: boolean; error?: string; order_id?: string; new_status?: string }
    if (!result.success) {
      return {
        success: false,
        message: result.error || '更新訂單狀態失敗',
      }
    }

    // 重新驗證相關頁面
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/store/orders')
    revalidatePath(`/store/orders/${orderId}`)

    // 狀態標籤映射
    const statusLabels: Record<string, string> = {
      pending: '待確認',
      confirmed: '已確認',
      shipping: '出貨中',
      completed: '已完成',
      cancelled: '已取消',
    }

    return {
      success: true,
      data: { orderId: result.order_id || orderId, newStatus: result.new_status || newStatus },
      message: `訂單狀態已更新為「${statusLabels[result.new_status || newStatus]}」`,
    }
  } catch (error) {
    console.error('updateOrderStatus error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新訂單狀態時發生未知錯誤',
    }
  }
}

/**
 * 取消訂單並回補庫存 (US3 - 管理員)
 * - 僅能取消 pending 或 confirmed 狀態的訂單
 * - 若訂單已確認，會自動回補庫存
 * - 呼叫 PostgreSQL Function 確保原子性操作
 * - 自動記錄操作歷史
 */
export async function cancelOrder(
  orderId: string
): Promise<ActionResult<{ orderId: string }>> {
  try {
    const supabase = await createClient()
    const { userId, role } = await checkAuth()

    // 僅管理員可取消訂單
    if (role !== 'admin') {
      return {
        success: false,
        message: '僅管理員可執行此操作',
      }
    }

    // 呼叫 PostgreSQL Function 進行原子性操作
    const { data, error } = await supabase.rpc('cancel_order_and_restore_stock', {
      p_order_id: orderId,
      p_actor_id: userId,
    })

    if (error || !data) {
      console.error('取消訂單錯誤:', error)
      return {
        success: false,
        message: error?.message || '取消訂單時發生錯誤',
      }
    }

    // 檢查 Function 回傳結果
    const result = data as { success: boolean; error?: string; order_id?: string }
    if (!result.success) {
      return {
        success: false,
        message: result.error || '取消訂單失敗',
      }
    }

    // 重新驗證相關頁面
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/store/orders')
    revalidatePath(`/store/orders/${orderId}`)

    return {
      success: true,
      data: { orderId: result.order_id || orderId },
      message: '訂單已取消，庫存已回補',
    }
  } catch (error) {
    console.error('cancelOrder error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '取消訂單時發生未知錯誤',
    }
  }
}

/**
 * 新增訂單留言 (Feature 007 - User Story 1)
 * - 客戶僅能在自己的訂單留言
 * - 管理員可在任何訂單留言
 * - 留言字數限制 500 字
 */
export async function addOrderComment(
  input: AddOrderCommentInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()
    const { userId, role } = await checkAuth()

    // 驗證輸入
    const validated = addOrderCommentSchema.safeParse(input)
    if (!validated.success) {
      return {
        success: false,
        message: '留言內容驗證失敗',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    const { orderId, content } = validated.data

    // 客戶端：驗證訂單所有權
    if (role === 'client') {
      const { data: order } = await supabase
        .from('orders')
        .select('user_id')
        .eq('id', orderId)
        .single()

      if (!order || order.user_id !== userId) {
        return {
          success: false,
          message: '您無權在此訂單留言',
        }
      }
    }

    // 插入留言到 order_timelines
    const { data, error } = await supabase
      .from('order_timelines')
      .insert({
        order_id: orderId,
        action_type: 'comment',
        content: content,
        actor_id: userId,
        actor_role: role,
      })
      .select('id')
      .single()

    if (error) {
      console.error('新增留言錯誤:', error)
      return {
        success: false,
        message: '新增留言時發生錯誤',
      }
    }

    // 記錄操作日誌 (Feature 008)
    await logAudit({
      target_type: 'order',
      target_id: orderId,
      action_type: 'comment_added',
      notes: `留言內容: ${content}`,
    })

    // 重新驗證相關頁面
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath(`/store/orders/${orderId}`)

    return {
      success: true,
      data: { id: data.id },
      message: '留言已送出',
    }
  } catch (error) {
    console.error('addOrderComment error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '新增留言時發生未知錯誤',
    }
  }
}

/**
 * 取得訂單時間軸（含留言） (Feature 007 - User Story 1)
 * - 包含操作歷史與留言記錄
 * - 依時間排序（舊 → 新）
 */
export async function getOrderTimeline(
  orderId: string
): Promise<ActionResult<OrderTimelineWithActor[]>> {
  try {
    const supabase = await createClient()
    const { userId, role } = await checkAuth()

    // 客戶端：驗證訂單所有權
    if (role === 'client') {
      const { data: order } = await supabase
        .from('orders')
        .select('user_id')
        .eq('id', orderId)
        .single()

      if (!order || order.user_id !== userId) {
        return {
          success: false,
          message: '您無權查看此訂單',
        }
      }
    }

    // 查詢訂單時間軸
    const { data, error } = await supabase
      .from('order_timelines')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('查詢訂單時間軸錯誤:', error)
      return {
        success: false,
        message: '查詢訂單時間軸時發生錯誤',
      }
    }

    // 批次查詢操作者資料
    const actorIds = (data || []).map(t => t.actor_id).filter(Boolean)
    let actorMap = new Map()

    if (actorIds.length > 0) {
      const { data: actors } = await supabase
        .from('profiles')
        .select('id, display_name, phone')
        .in('id', actorIds)

      actorMap = new Map((actors || []).map((actor: any) => [actor.id, actor]))
    }

    // 格式化回傳資料
    const timelines: OrderTimelineWithActor[] = data.map((item: any) => {
      const actor = actorMap.get(item.actor_id)
      return {
        id: item.id,
        order_id: item.order_id,
        action_type: item.action_type as OrderTimelineWithActor['action_type'],
        content: item.content,
        actor_id: item.actor_id,
        actor_role: item.actor_role as OrderTimelineWithActor['actor_role'],
        actor_name: actor?.display_name || actor?.phone || null,
        old_status: item.old_status,
        new_status: item.new_status,
        created_at: item.created_at,
      }
    })

    return {
      success: true,
      data: timelines,
    }
  } catch (error) {
    console.error('getOrderTimeline error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢訂單時間軸時發生未知錯誤',
    }
  }
}

/**
 * 刪除訂單 (Feature 006 - User Story 8)
 * - 僅允許刪除 pending 狀態的訂單
 * - 僅管理員可執行此操作
 * - 記錄刪除操作於 order_timelines
 */
export async function deleteOrder(
  input: DeleteOrderInput
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { userId, role } = await checkAuth()

    // 僅管理員可刪除訂單
    if (role !== 'admin') {
      return {
        success: false,
        message: '僅管理員可執行此操作',
      }
    }

    // 驗證輸入
    const validated = deleteOrderSchema.safeParse(input)
    if (!validated.success) {
      return {
        success: false,
        message: '刪除訂單驗證失敗',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    const { order_id, reason } = validated.data

    // 查詢訂單狀態
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, status')
      .eq('id', order_id)
      .single()

    if (fetchError || !order) {
      console.error('查詢訂單錯誤:', fetchError)
      return {
        success: false,
        message: '訂單不存在',
      }
    }

    // 僅允許刪除 pending 狀態的訂單
    if (order.status !== 'pending') {
      return {
        success: false,
        message: '僅允許刪除「待確認」狀態的訂單',
      }
    }

    // 記錄刪除操作於 order_timelines
    await supabase
      .from('order_timelines')
      .insert({
        order_id: order.id,
        action_type: 'deleted',
        content: `管理員刪除訂單 (原因: ${reason || '未提供'})`,
        actor_id: userId,
        actor_role: role,
      })

    // 刪除訂單（CASCADE 會自動刪除 order_items 與 order_timelines）
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', order_id)

    if (deleteError) {
      console.error('刪除訂單錯誤:', deleteError)
      return {
        success: false,
        message: '刪除訂單時發生錯誤',
      }
    }

    // 重新驗證相關頁面
    revalidatePath('/admin/orders')

    return {
      success: true,
      message: `訂單 ${order.order_number} 已刪除`,
    }
  } catch (error) {
    console.error('deleteOrder error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '刪除訂單時發生未知錯誤',
    }
  }
}
