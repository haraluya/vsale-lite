'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import { revalidatePath, revalidateTag } from 'next/cache'
import {
  createOrderSchema,
  addOrderCommentSchema,
  orderModificationsSchema,
  type CreateOrderInput,
  type GetOrdersInput,
  type AddOrderCommentInput,
  type OrderModificationsInput,
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
import { createComboDealSnapshot } from '@/lib/utils/combo-deal-snapshot'
import type { ComboDealSnapshot } from '@/types/combo-deals'
import { calculateOrderAmounts } from '@/lib/pricing/order-calculator'
import type { RegularItemInput, ComboDealInput } from '@/lib/pricing/order-calculator'

/**
 * 訂單管理 Server Actions
 * Feature: 004-cart-and-orders
 * Feature: 021-combo-deals (Phase 7 - T064-T065)
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
    let supabase = await createClient()
    const { userId: authUserId, role, tierId: authTierId } = await checkAuth()

    // 驗證輸入（提前，因為需要讀取 onBehalfOfUserId）
    const validated = createOrderSchema.safeParse(input)
    if (!validated.success) {
      return {
        success: false,
        message: '訂單資料驗證失敗',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    // 判斷是否為代客下單
    const isOnBehalf = !!validated.data.onBehalfOfUserId

    if (isOnBehalf) {
      // 代客下單：必須是管理員
      if (role !== 'admin') {
        return {
          success: false,
          message: '只有管理員可以代客下單',
        }
      }
    } else {
      // 一般下單：管理員不可下單
      if (role === 'admin') {
        return {
          success: false,
          message: '管理員帳號無法建立訂單',
        }
      }
    }

    // 決定訂單歸屬的客戶
    let userId: string
    let tierId: string | undefined

    if (isOnBehalf) {
      // 代客下單：查詢目標客戶的等級
      const { data: targetProfile, error: targetError } = await supabase
        .from('profiles')
        .select('id, role, tier_id')
        .eq('id', validated.data.onBehalfOfUserId!)
        .single()

      if (targetError || !targetProfile) {
        return {
          success: false,
          message: '目標客戶不存在',
        }
      }

      if (targetProfile.role !== 'client') {
        return {
          success: false,
          message: '只能為客戶身份的使用者代客下單',
        }
      }

      userId = targetProfile.id
      tierId = targetProfile.tier_id || undefined

      if (!tierId) {
        return {
          success: false,
          message: '目標客戶未設定等級，無法建立訂單',
        }
      }

      // 代客下單使用 adminClient 繞過 RLS（管理員可能無法通過 RLS 查詢商品等資料）
      supabase = createAdminClient()
    } else {
      userId = authUserId
      tierId = authTierId
    }

    const { items, notes, userCouponId, comboDealItems = [] } = validated.data

    // 1. 驗證並查詢優惠券（如果有）
    let couponData: {
      code: string
      discount_type: string
      discount_value: number
      discount_amount: number
      min_order_amount: number | null
      series_restrictions: string[]
      userCouponId: string
    } | null = null

    if (userCouponId) {
      // 查詢 user_coupon 與關聯的優惠券資訊
      const { data: userCoupon, error: userCouponError } = await supabase
        .from('user_coupons')
        .select(`
          id,
          used_at,
          coupon:coupons(id, code_normalized, discount_type, discount_value, min_order_amount, status, coupon_series_restrictions(series_id))
        `)
        .eq('id', userCouponId)
        .eq('user_id', userId)
        .single()

      if (userCouponError || !userCoupon || !userCoupon.coupon) {
        return {
          success: false,
          message: userCouponError
            ? `查詢優惠券時發生錯誤: ${userCouponError.message}`
            : '優惠券不存在或無效',
        }
      }

      const coupon = userCoupon.coupon as any

      if (coupon.status !== 'active') {
        return {
          success: false,
          message: '優惠券已失效',
        }
      }

      if (userCoupon.used_at) {
        return {
          success: false,
          message: '此優惠券已使用過',
        }
      }

      couponData = {
        code: coupon.code_normalized,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        discount_amount: 0, // 稍後計算
        min_order_amount: coupon.min_order_amount ?? null,
        series_restrictions: coupon.coupon_series_restrictions?.map((r: any) => r.series_id) || [],
        userCouponId: userCoupon.id,
      }
    }

    // 2. 批次查詢商品與價格（LEFT JOIN tier_prices，未設定價格時使用零售價）
    const productIds = items.map(item => item.productId)
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        series_id,
        status,
        retail_price,
        tier_prices(price, tier_id),
        series:series_id(name)
      `)
      .in('id', productIds)
      .eq('status', 'active')

    if (productsError) {
      return {
        success: false,
        message: '查詢商品資訊時發生錯誤',
      }
    }

    // 3. 驗證所有商品都存在且為啟用狀態
    if (products.length !== items.length) {
      return {
        success: false,
        message: '部分商品不存在或已停用',
      }
    }

    // 4. 計算訂單總金額與建立訂單明細資料
    const regularItemInputs: RegularItemInput[] = []
    let totalAmount = 0
    const orderItemsData: Array<{
      product_id: string
      series_id_snapshot: string | null
      series_name_snapshot: string | null
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

      // 優先使用等級價格，若未設定則使用零售價格
      // 🔴 修正：從所有 tier_prices 中過濾出該等級的價格
      const tierPriceData = (product.tier_prices as any)?.find((tp: any) => tp.tier_id === tierId)
      const tierPrice = tierPriceData?.price
      const price = tierPrice !== null && tierPrice !== undefined ? tierPrice : product.retail_price

      // 檢查是否有有效價格
      if (price === null || price === undefined) {
        return {
          success: false,
          message: `商品「${product.name}」未設定價格`,
        }
      }

      const subtotal = price * item.quantity
      totalAmount += subtotal

      regularItemInputs.push({
        retailPrice: product.retail_price ?? price,
        tierPrice: price,
        quantity: item.quantity,
        seriesId: (product as any).series_id || undefined,
      })

      orderItemsData.push({
        product_id: product.id,
        series_id_snapshot: (product as any).series_id || null,
        series_name_snapshot: (product as any).series?.name || null,  // 🆕 系列名稱快照
        product_name_snapshot: product.name,
        deal_price: price,
        quantity: item.quantity,
        subtotal,
      })
    }

    // 🆕 Phase 7: 計算組合優惠總額
    let comboDealTotalAmount = 0
    const comboDealSnapshotsData: Array<{
      comboDealId: string
      snapshot: ComboDealSnapshot
      originalPrice: number
      discountedPrice: number
      discountAmount: number
      productIds: string[]
    }> = []

    // 處理組合優惠項目
    for (const comboDealItem of comboDealItems) {
      // 查詢組合優惠詳情（用於建立快照）
      const { data: comboDeal, error: comboDealError } = await supabase
        .from('combo_deals')
        .select(`
          id,
          name,
          combo_mode,
          discount_type,
          discount_value,
          combo_deal_series(
            series_id,
            required_quantity,
            display_order,
            series:series(name)
          )
        `)
        .eq('id', comboDealItem.comboDealId)
        .single()

      if (comboDealError || !comboDeal) {
        return {
          success: false,
          message: `組合優惠「${comboDealItem.comboDealName}」不存在或已失效`,
        }
      }

      // 查詢任選模式配置（如果適用）
      let mixMatchTotalQuantity: number | undefined
      if (comboDeal.combo_mode === 'mix_match') {
        const { data: mixMatchConfig } = await supabase
          .from('combo_deal_mix_match_config')
          .select('total_quantity')
          .eq('combo_deal_id', comboDeal.id)
          .single()

        mixMatchTotalQuantity = mixMatchConfig?.total_quantity
      }

      // 建立商品價格對照表（用於快照）
      const selectedProductIds = comboDealItem.selectedProducts.map(p => p.product_id)
      const { data: selectedProductsData } = await supabase
        .from('products')
        .select(`
          id,
          name,
          code,
          series_id,
          retail_price,
          tier_prices(price, tier_id)
        `)
        .in('id', selectedProductIds)

      const tierPrices = new Map<string, number>()
      selectedProductsData?.forEach(product => {
        const tierPriceData = (product.tier_prices as any)?.find((tp: any) => tp.tier_id === tierId)
        const price = tierPriceData?.price ?? product.retail_price
        if (price !== null && price !== undefined) {
          tierPrices.set(product.id, price)
        }
      })

      // 轉換為 ComboDealWithDetails 格式（簡化版）
      const comboDealWithDetails = {
        id: comboDeal.id,
        name: comboDeal.name,
        combo_mode: comboDeal.combo_mode,
        discount_type: comboDeal.discount_type,
        discount_value: comboDeal.discount_value,
        series: (comboDeal.combo_deal_series as any[]).map(cds => ({
          series_id: cds.series_id,
          series_name: (cds.series as any)?.name || '',
          required_quantity: cds.required_quantity,
          display_order: cds.display_order,
          products: selectedProductsData
            ?.filter(p => p.series_id === cds.series_id)
            .map(p => ({
              product_id: p.id,
              product_name: p.name,
              product_code: (p as any).code,
            })) || [],
        })),
        mix_match_total_quantity: mixMatchTotalQuantity,
      }

      // 轉換 selectedProducts 格式
      const selectedProducts = comboDealItem.selectedProducts.map(sp => {
        const product = selectedProductsData?.find(p => p.id === sp.product_id)
        return {
          product_id: sp.product_id,
          series_id: sp.series_id,
          quantity: sp.quantity,
          product_name: product?.name || '',
          unit_price: tierPrices.get(sp.product_id) || 0,
        }
      })

      // 建立快照
      const snapshot = createComboDealSnapshot(
        comboDealWithDetails as any,
        selectedProducts as any,
        tierPrices,
        {
          originalPrice: comboDealItem.originalPrice,
          discountedPrice: comboDealItem.discountedPrice,
          discountAmount: comboDealItem.discountAmount,
        }
      )

      // 累加組合優惠金額（使用優惠後價格）
      comboDealTotalAmount += comboDealItem.discountedPrice

      // 儲存快照資料（稍後插入資料庫）
      comboDealSnapshotsData.push({
        comboDealId: comboDeal.id,
        snapshot,
        originalPrice: comboDealItem.originalPrice,
        discountedPrice: comboDealItem.discountedPrice,
        discountAmount: comboDealItem.discountAmount,
        productIds: selectedProductIds,
      })
    }

    // 5. 計算優惠券折扣（使用統一計算模組）
    if (couponData) {
      const comboDealInputs: ComboDealInput[] = comboDealSnapshotsData.map(d => ({
        name: '',
        retailTotal: 0,
        originalPrice: d.originalPrice,
        discountedPrice: d.discountedPrice,
        discountAmount: d.discountAmount,
      }))

      const calcResult = calculateOrderAmounts({
        regularItems: regularItemInputs,
        comboDeals: comboDealInputs,
        coupon: {
          code: couponData.code || '',
          discountType: couponData.discount_type as 'fixed' | 'percentage',
          discountValue: couponData.discount_value,
          minOrderAmount: couponData.min_order_amount,
          seriesRestrictions: couponData.series_restrictions || [],
        },
      })
      couponData.discount_amount = calcResult.couponDiscount
    }

    // 6. 產生訂單編號 (呼叫 PostgreSQL Function)
    const { data: orderNumberData, error: orderNumberError } = await supabase
      .rpc('generate_order_number')

    if (orderNumberError || !orderNumberData) {
      return {
        success: false,
        message: '產生訂單編號時發生錯誤',
      }
    }

    const orderNumber = orderNumberData as string

    // 7. 計算運費（使用原始商品金額 + 組合優惠優惠後金額，不扣除優惠券折扣）
    const subtotalForShipping = totalAmount + comboDealTotalAmount

    const { data: shippingFeeData, error: shippingFeeError } = await supabase
      .rpc('calculate_shipping_fee', {
        p_user_id: userId,
        p_subtotal: subtotalForShipping, // 🆕 包含組合優惠
      })

    if (shippingFeeError) {
      return {
        success: false,
        message: '計算運費時發生錯誤',
      }
    }

    const shippingFee = (shippingFeeData as number) || 0

    // 8. 建立訂單主表（訂單總額 = 商品金額 + 組合優惠金額 - 優惠券折扣 + 運費）
    const finalTotalAmount = couponData
      ? totalAmount + comboDealTotalAmount - couponData.discount_amount + shippingFee
      : totalAmount + comboDealTotalAmount + shippingFee

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        total_amount: finalTotalAmount,
        shipping_fee: shippingFee,
        status: 'pending',
        notes: notes || null,
      })
      .select('id, order_number')
      .single()

    if (orderError || !order) {

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

    // 9. 建立訂單明細
    const orderItems = orderItemsData.map(item => ({
      order_id: order.id,
      ...item,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      // 回滾訂單 (刪除剛建立的訂單)
      await supabase.from('orders').delete().eq('id', order.id)
      return {
        success: false,
        message: '建立訂單明細時發生錯誤',
      }
    }

    // 10. 建立優惠券快照（如果有使用優惠券）
    if (couponData && userCouponId) {
      // 建立 order_coupons 記錄
      const { error: couponSnapshotError } = await supabase
        .from('order_coupons')
        .insert({
          order_id: order.id,
          coupon_code: couponData.code,
          discount_type: couponData.discount_type,
          discount_value: couponData.discount_value,
          discount_amount: couponData.discount_amount,
        })

      if (couponSnapshotError) {
        // 回滾訂單與訂單明細
        await supabase.from('orders').delete().eq('id', order.id)
        return {
          success: false,
          message: `建立優惠券快照時發生錯誤: ${couponSnapshotError.message || '未知錯誤'}`,
        }
      }

      // 更新 user_coupons.used_at 與 order_id（使用 userCouponId）
      const { error: updateUserCouponError } = await supabase
        .from('user_coupons')
        .update({
          used_at: new Date().toISOString(),
          order_id: order.id,
        })
        .eq('id', couponData.userCouponId)

      if (updateUserCouponError) {
        // 🔴 重要：若更新失敗，必須回滾整個訂單，避免優惠券雙重使用
        // 回滾訂單（CASCADE 會自動刪除 order_items 和 order_coupons）
        await supabase.from('orders').delete().eq('id', order.id)
        return {
          success: false,
          message: '更新優惠券使用狀態失敗，訂單已取消',
        }
      }
    }

    // 🆕 Phase 7: 建立組合優惠訂單記錄
    if (comboDealSnapshotsData.length > 0) {
      const comboDealOrderItems = comboDealSnapshotsData.map(item => ({
        order_id: order.id,
        combo_deal_id: item.comboDealId,
        combo_deal_snapshot: item.snapshot,
        product_ids: item.productIds,
        original_price: item.originalPrice,
        discounted_price: item.discountedPrice,
        discount_amount: item.discountAmount,
      }))

      const { error: comboDealItemsError } = await supabase
        .from('order_combo_deal_items')
        .insert(comboDealOrderItems)

      if (comboDealItemsError) {
        // 回滾訂單（CASCADE 會自動刪除 order_items 和 order_coupons）
        await supabase.from('orders').delete().eq('id', order.id)
        return {
          success: false,
          message: '建立組合優惠訂單記錄時發生錯誤',
        }
      }
    }

    // 11. 建立訂單歷史記錄
    const { error: timelineError } = await supabase
      .from('order_timelines')
      .insert({
        order_id: order.id,
        action_type: 'created',
        actor_id: isOnBehalf ? authUserId : userId,
        actor_role: isOnBehalf ? 'admin' : 'client',
        content: isOnBehalf ? '管理員代客建立訂單' : null,
        new_status: 'pending',
      })

    if (timelineError) {
      // 不回滾,僅記錄錯誤 (歷史記錄失敗不應阻止訂單建立)
    }

    // 12. 重新驗證相關頁面
    revalidatePath('/store/orders')
    revalidatePath('/admin/orders')
    revalidateTag('orders')

    // 建立成功訊息
    let successMessage = `訂單建立成功！訂單編號: ${order.order_number}`

    if (comboDealItems.length > 0) {
      successMessage += `（含 ${comboDealItems.length} 個組合優惠）`
    }

    if (shippingFee > 0) {
      successMessage += `，運費 NT$ ${shippingFee}`
    } else {
      successMessage += `，免運`
    }

    if (couponData) {
      successMessage += `，已使用優惠券「${couponData.code}」折扣 NT$ ${couponData.discount_amount}`
    }

    return {
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
      },
      message: successMessage,
    }
  } catch (error) {
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

    // 🔧 修復：移除資料庫層級的訂單編號搜尋，改為客戶端統一過濾
    // 原本的 query.ilike('order_number', `%${search}%`) 會導致搜尋客戶名稱/電話時返回空陣列

    const { data: orders, count, error } = await query

    if (error) {
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

    // 查詢代客下單標記
    const orderIds = orders.map((order: any) => order.id)
    const { data: adminCreatedTimelines } = await supabase
      .from('order_timelines')
      .select('order_id')
      .in('order_id', orderIds)
      .eq('action_type', 'created')
      .eq('actor_role', 'admin')

    const adminCreatedOrderIds = new Set(
      (adminCreatedTimelines || []).map((t: any) => t.order_id)
    )

    // 轉換資料格式
    let formattedOrders: OrderWithUser[] = orders.map((order: any) => {
      const profile = profileMap.get(order.user_id)
      return {
        id: order.id,
        order_number: order.order_number,
        user_id: order.user_id,
        total_amount: order.total_amount,
        shipping_fee: order.shipping_fee || 0,  // Feature 011: 運費
        status: order.status,
        notes: order.notes,
        created_at: order.created_at,
        updated_at: order.updated_at,
        user_name: profile?.display_name || profile?.phone || '未知客戶',
        user_phone: profile?.phone || '',
        tier_name: profile?.tiers?.name || '未設定',
        is_admin_order: adminCreatedOrderIds.has(order.id),
      }
    })

    // 🆕 Phase 2.2: 支援客戶名稱與手機號碼搜尋（Server 端篩選）
    if (search && role === 'admin') {
      const searchLower = search.toLowerCase()
      formattedOrders = formattedOrders.filter(order =>
        order.order_number.toLowerCase().includes(searchLower) ||
        (order.user_name && order.user_name.toLowerCase().includes(searchLower)) ||
        (order.user_phone && order.user_phone.includes(search))
      )
    }

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

    // ⚡ Performance Optimization: 並行查詢訂單詳情（Phase 1.4）
    // 將所有獨立查詢改為並行執行，預期提升 30-40%
    const [
      orderResult,
      orderItemsResult,
      orderTimelinesResult,
      orderCouponResult,
      customFeesResult,
      comboDealItemsResult  // 🆕 Feature 021: 組合優惠項目
    ] = await Promise.all([
      // 查詢訂單主表
      supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single(),

      // 查詢訂單明細（包含系列名稱快照，JOIN series 僅用於舊訂單向後相容）
      supabase
        .from('order_items')
        .select('*, series:series_id_snapshot(name)')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true }),

      // 查詢訂單歷史
      supabase
        .from('order_timelines')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true }),

      // 查詢訂單優惠券快照 (Feature 009)
      supabase
        .from('order_coupons')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle(),

      // 查詢訂單自訂費用 (Feature 011)
      supabase
        .from('order_custom_fees')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true }),

      // 查詢訂單組合優惠項目 (Feature 021)
      supabase
        .from('order_combo_deal_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
    ])

    // 檢查訂單是否存在
    const { data: order, error } = orderResult
    if (error) {
      console.error('[getOrderById] 查詢訂單失敗')
      console.error('- 訂單 ID:', orderId)
      console.error('- 錯誤碼:', error.code)
      console.error('- 錯誤訊息:', error.message)
      console.error('- 錯誤詳情:', JSON.stringify(error.details))
      console.error('- 使用者 ID:', userId)
      console.error('- 使用者角色:', role)
      console.error('- 完整錯誤物件:', JSON.stringify(error, null, 2))

      if (error.code === 'PGRST116') {
        return {
          success: false,
          message: '訂單不存在或您無權查看',
        }
      }

      return {
        success: false,
        message: `查詢訂單詳情時發生錯誤: ${error.message}`,
      }
    }

    // 解構並行查詢結果
    const { data: orderItems } = orderItemsResult
    const { data: orderTimelines } = orderTimelinesResult
    const { data: orderCoupon } = orderCouponResult
    const { data: customFees } = customFeesResult
    const { data: comboDealItems } = comboDealItemsResult  // 🆕 Feature 021

    // 查詢客戶資料（使用 user_id）
    const selectFields = role === 'admin'
      ? 'id, phone, display_name, tier_id, address, admin_notes, tiers(name)'
      : 'id, phone, display_name, tier_id, address, tiers(name)'

    const { data: profile } = await supabase
      .from('profiles')
      .select(selectFields)
      .eq('id', order.user_id)
      .single()

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
      shipping_fee: order.shipping_fee || 0,  // Feature 011: 運費
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
        series_id_snapshot: item.series_id_snapshot,
        series_name_snapshot: item.series_name_snapshot,  // 🆕 系列名稱快照
        product_name_snapshot: item.product_name_snapshot,
        deal_price: item.deal_price,
        quantity: item.quantity,
        subtotal: item.subtotal,
        created_at: item.created_at,
        // 🆕 向後相容：舊訂單使用 JOIN 結果
        series: item.series || null,
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
          modifications: timeline.modifications,
          created_at: timeline.created_at,
          actor_name: actor?.display_name || actor?.phone || '系統',
        }
      }),
      // 🆕 Feature 009: 優惠券快照
      coupon: orderCoupon ? {
        id: orderCoupon.id,
        order_id: orderCoupon.order_id,
        coupon_code: orderCoupon.coupon_code,
        discount_type: orderCoupon.discount_type as 'fixed' | 'percentage',
        discount_value: orderCoupon.discount_value,
        discount_amount: orderCoupon.discount_amount,
        created_at: orderCoupon.created_at,
      } : null,
      // 🆕 Feature 011: 自訂費用項目
      custom_fees: (customFees || []).map((fee: any) => ({
        id: fee.id,
        order_id: fee.order_id,
        fee_name: fee.fee_name,
        amount: fee.amount,
        created_at: fee.created_at,
        created_by: fee.created_by,
      })),
      // 🆕 Feature 021: 組合優惠項目
      combo_deal_items: (comboDealItems || []).map((item: any) => ({
        id: item.id,
        order_id: item.order_id,
        combo_deal_id: item.combo_deal_id,
        combo_deal_snapshot: item.combo_deal_snapshot,
        product_ids: item.product_ids,
        original_price: item.original_price,
        discounted_price: item.discounted_price,
        discount_amount: item.discount_amount,
        created_at: item.created_at,
      })),
      // 代客下單標記（從 timeline 判斷）
      is_admin_order: (orderTimelines || []).some(
        (t: any) => t.action_type === 'created' && t.actor_role === 'admin'
      ),
    }

    return {
      success: true,
      data: orderDetail,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢訂單詳情時發生未知錯誤',
    }
  }
}

/**
 * 標記訂單為出貨中並扣減庫存 (Feature 011 US6 - 管理員)
 * - 取代 confirmOrder() 函數
 * - 呼叫 PostgreSQL Function 確保原子性操作
 * - 訂單狀態從 pending → shipping
 * - 扣減商品庫存（支援負庫存）
 * - 自動記錄操作歷史
 */
export async function markAsShipping(
  orderId: string
): Promise<ActionResult<{ orderId: string }>> {
  try {
    const supabase = await createClient()
    const { userId, role } = await checkAuth()

    // 僅管理員可標記出貨
    if (role !== 'admin') {
      return {
        success: false,
        message: '僅管理員可執行此操作',
      }
    }

    // 呼叫 PostgreSQL Function 進行原子性操作
    const { data, error } = await supabase.rpc('mark_order_as_shipping', {
      p_order_id: orderId,
      p_actor_id: userId,
    })

    if (error) {
      return {
        success: false,
        message: error?.message || '標記出貨時發生錯誤',
      }
    }

    // ✅ 修正：支援 JSON 物件或 TABLE 陣列兩種回傳格式
    const result = Array.isArray(data) && data.length > 0 ? data[0] : data

    if (!result || !result.success) {
      return {
        success: false,
        message: result?.message || '標記出貨失敗',
      }
    }

    // 重新驗證相關頁面
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/store/orders')
    revalidateTag('orders')

    return {
      success: true,
      data: { orderId: result.order_id || orderId },
      message: '訂單已標記為出貨中，庫存已扣減',
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '標記出貨時發生未知錯誤',
    }
  }
}

/**
 * 更新訂單狀態 (Feature 011 US6 - 管理員)
 * - 簡化版，移除 confirmed 相關邏輯
 * - 允許的狀態轉換: shipping → completed, pending → cancelled, shipping → cancelled
 * - 呼叫 PostgreSQL Function 確保原子性操作
 * - 自動記錄操作歷史
 * - 注意: pending → shipping 必須使用 markAsShipping() 函數
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: 'shipping' | 'completed' | 'cancelled'
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

    if (error) {
      return {
        success: false,
        message: error?.message || '更新訂單狀態時發生錯誤',
      }
    }

    // ✅ 修正：支援 JSON 物件或 TABLE 陣列兩種回傳格式
    const result = Array.isArray(data) && data.length > 0 ? data[0] : data

    if (!result || !result.success) {
      return {
        success: false,
        message: result?.message || '更新訂單狀態失敗',
      }
    }

    // 重新驗證相關頁面
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/store/orders')
    revalidatePath(`/store/orders/${orderId}`)
    revalidateTag('orders')

    // 狀態標籤映射（移除 confirmed）
    const statusLabels: Record<string, string> = {
      pending: '待確認',
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
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新訂單狀態時發生未知錯誤',
    }
  }
}

/**
 * 恢復出貨中訂單到待確認狀態並回補庫存
 * - 僅能恢復 shipping 狀態的訂單
 * - 自動回補庫存（將之前扣減的庫存加回去）
 * - 呼叫 PostgreSQL Function 確保原子性操作
 * - 自動記錄操作歷史
 */
export async function revertShippingToPending(
  orderId: string,
  reason?: string
): Promise<ActionResult<{ orderId: string }>> {
  try {
    const supabase = await createClient()
    const { userId, role } = await checkAuth()

    // 僅管理員可執行此操作
    if (role !== 'admin') {
      return {
        success: false,
        message: '僅管理員可執行此操作',
      }
    }

    // 呼叫 PostgreSQL Function 進行原子性操作
    const { data, error } = await supabase.rpc('revert_shipping_to_pending', {
      p_order_id: orderId,
      p_admin_id: userId,
      p_reason: reason || null,
    })

    if (error) {
      return {
        success: false,
        message: error?.message || '恢復訂單狀態時發生錯誤',
      }
    }

    // ✅ 修正：支援 JSON 物件或 TABLE 陣列兩種回傳格式
    const result = Array.isArray(data) && data.length > 0 ? data[0] : data

    if (!result || !result.success) {
      return {
        success: false,
        message: result?.message || '恢復訂單狀態失敗',
      }
    }

    // 重新驗證相關頁面
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/store/orders')
    revalidateTag('orders')

    return {
      success: true,
      data: { orderId },
      message: result.message || '訂單已恢復到待確認狀態，庫存已回補',
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '恢復訂單狀態時發生未知錯誤',
    }
  }
}

/**
 * 取消訂單並回補庫存
 *
 * 權限規則：
 * - 客戶：僅能取消自己的 pending 狀態訂單
 * - 管理員：可取消任何 pending 或 shipping 狀態訂單
 *
 * 功能：
 * - 若訂單已出貨 (shipping)，會自動回補庫存（含組合優惠商品）
 * - 自動退還已使用的優惠券
 * - 呼叫 PostgreSQL Function 確保原子性操作
 * - 自動記錄操作歷史
 */
export async function cancelOrder(
  orderId: string
): Promise<ActionResult<{ orderId: string }>> {
  try {
    const supabase = await createClient()
    const { userId, role } = await checkAuth()

    // 權限檢查已移至 PostgreSQL Function 層
    // - 客戶只能取消自己的 pending 訂單
    // - 管理員可取消任何 pending 或 shipping 訂單

    // 呼叫 PostgreSQL Function 進行原子性操作
    const { data, error } = await supabase.rpc('cancel_order_and_restore_stock', {
      p_order_id: orderId,
      p_actor_id: userId,
    })

    if (error) {
      return {
        success: false,
        message: error?.message || '取消訂單時發生錯誤',
      }
    }

    // ✅ 修正：支援 JSON 物件或 TABLE 陣列兩種回傳格式
    const result = Array.isArray(data) && data.length > 0 ? data[0] : data

    if (!result || !result.success) {
      return {
        success: false,
        message: result?.message || result?.error || '取消訂單失敗',
      }
    }

    // 重新驗證相關頁面
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/store/orders')
    revalidatePath(`/store/orders/${orderId}`)
    revalidateTag('orders')

    return {
      success: true,
      data: { orderId: result.order_id || orderId },
      message: '訂單已取消，庫存已回補',
    }
  } catch (error) {
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
        modifications: item.modifications,
        created_at: item.created_at,
      }
    })

    return {
      success: true,
      data: timelines,
    }
  } catch (error) {
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

    // 🔧 修復：使用 PostgreSQL Function 刪除訂單（繞過 RLS Policy）
    const { data, error } = await supabase.rpc('delete_order_pending', {
      p_order_id: order_id,
      p_actor_id: userId,
      p_reason: reason || '管理員刪除訂單',
    })

    if (error) {
      return {
        success: false,
        message: error?.message || '刪除訂單時發生錯誤',
      }
    }

    // ✅ 修正：支援 JSON 物件或 TABLE 陣列兩種回傳格式
    const result = Array.isArray(data) && data.length > 0 ? data[0] : data

    if (!result || !result.success) {
      return {
        success: false,
        message: result?.message || result?.error || '刪除訂單失敗',
      }
    }

    // 重新驗證相關頁面
    revalidatePath('/admin/orders')
    // 註解：不重新驗證已刪除的訂單詳情頁面，避免 PGRST116 錯誤
    // revalidatePath(`/admin/orders/${order_id}`)
    revalidateTag('orders')

    return {
      success: true,
      message: result.message || `訂單已刪除`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '刪除訂單時發生未知錯誤',
    }
  }
}

/**
 * 批次修改訂單 (Feature 011 US3 - 管理員)
 * - 支援修改商品單價、數量、加入/移除商品
 * - 支援新增/移除自訂費用項目
 * - 支援修改運費
 * - 支援移除優惠券
 * - 呼叫 PostgreSQL Function 確保原子性操作
 * - 自動重新計算訂單總金額
 * - 記錄完整修改歷程於 order_timelines
 *
 * @param orderId - 訂單 ID
 * @param modifications - 修改內容 (JSONB 格式)
 * @returns 修改結果與新總金額
 */
export async function updateOrderDetails(
  orderId: string,
  modifications: OrderModificationsInput
): Promise<ActionResult<{ new_total: number; coupon_warning?: string }>> {
  try {
    const supabase = await createClient()
    const { userId, role } = await checkAuth()

    // 僅管理員可修改訂單
    if (role !== 'admin') {
      return {
        success: false,
        message: '僅管理員可執行此操作',
      }
    }

    // 驗證輸入
    const validated = orderModificationsSchema.safeParse(modifications)
    if (!validated.success) {
      return {
        success: false,
        message: '訂單修改資料驗證失敗',
        errors: validated.error.flatten().fieldErrors,
      }
    }

    // 檢查訂單是否存在且可修改（包含優惠券資訊）
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, user_id')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      return {
        success: false,
        message: '訂單不存在',
      }
    }

    if (order.status !== 'pending') {
      return {
        success: false,
        message: `僅待確認訂單可修改，此訂單狀態為「${order.status === 'shipping' ? '出貨中' : order.status === 'completed' ? '已完成' : '已取消'}」`,
      }
    }

    // Phase 8 (US5): 查詢訂單優惠券與客戶等級資訊（用於修改後驗證）
    const { data: orderCoupon } = await supabase
      .from('order_coupons')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle()

    const { data: profile } = await supabase
      .from('profiles')
      .select('tier_id')
      .eq('id', order.user_id)
      .single()

    const userTierId = profile?.tier_id

    // 呼叫 PostgreSQL Function 進行批次修改
    const { data, error } = await supabase.rpc('update_order_with_modifications', {
      p_order_id: orderId,
      p_modifications: validated.data as any,
      p_actor_id: userId,
    })

    if (error) {
      return {
        success: false,
        message: error?.message || '批次修改訂單時發生錯誤',
      }
    }

    // PostgreSQL Function 返回 TABLE，data 是陣列
    const result = Array.isArray(data) ? data[0] : data

    if (!result) {
      return {
        success: false,
        message: '訂單修改失敗：伺服器無回傳資料',
      }
    }

    // 檢查 Function 回傳結果
    if (!result.success) {
      return {
        success: false,
        message: result.message || '訂單修改失敗',
      }
    }

    // Phase 8 (US5): 訂單修改後驗證優惠券條件
    let couponWarning: string | undefined

    if (orderCoupon && userTierId && !modifications.coupon?.action) {
      // 查詢優惠券完整資訊（含限制條件）
      const { data: coupon } = await supabase
        .from('coupons')
        .select(`
          *,
          tier_restrictions:coupon_tier_restrictions(tier_id),
          series_restrictions:coupon_series_restrictions(series_id)
        `)
        .eq('code_normalized', orderCoupon.coupon_code)
        .single()

      if (coupon) {
        // 查詢修改後的訂單明細（用於驗證優惠券條件）
        // 🆕 使用 series_id_snapshot 快照，不依賴 products 表
        const { data: updatedItems } = await supabase
          .from('order_items')
          .select(`
            id,
            product_id,
            series_id_snapshot,
            deal_price,
            quantity
          `)
          .eq('order_id', orderId)

        if (updatedItems && updatedItems.length > 0) {
          // 轉換為 CartItemForCoupon 格式
          const cartItems = updatedItems.map((item: any) => ({
            product_id: item.product_id,
            series_id: item.series_id_snapshot || '',
            price: item.deal_price,
            quantity: item.quantity,
          }))

          // 使用 coupon-helpers 驗證優惠券條件
          const { validateCouponConditions } = await import('@/lib/utils/coupon-helpers')
          const validationResult = validateCouponConditions({
            coupon: {
              ...coupon,
              tier_restrictions: coupon.tier_restrictions?.map((r: any) => r.tier_id) || [],
              series_restrictions: coupon.series_restrictions?.map((r: any) => r.series_id) || [],
            } as any,
            cartItems,
            userTierId,
          })

          // 若優惠券不符合條件，回傳警告
          if (!validationResult.valid) {
            couponWarning = validationResult.error || '訂單修改後不符合優惠券使用條件'
          }
        }
      }
    }

    // 記錄操作日誌
    await logAudit({
      target_type: 'order',
      target_id: orderId,
      action_type: 'updated',
      new_values: modifications as any,
    })

    // 重新驗證相關頁面
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    revalidateTag('orders')

    return {
      success: true,
      data: {
        new_total: result.new_total,
        coupon_warning: couponWarning,
      },
      message: result.message,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '批次修改訂單時發生未知錯誤',
    }
  }
}
