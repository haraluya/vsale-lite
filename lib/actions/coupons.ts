'use server'

/**
 * 優惠券系統 Server Actions
 *
 * @feature 009-coupon-system
 * @date 2026-01-07
 */

import { createClient } from '@/lib/supabase/server'
import { checkAuth } from '@/lib/actions/helpers'
import { revalidatePath } from 'next/cache'
import {
  createCouponSchema,
  updateCouponSchema,
  claimCouponSchema,
  validateCouponSchema,
  COUPON_ERROR_MESSAGES,
  COUPON_SUCCESS_MESSAGES,
} from '@/lib/validations/coupon.schema'
import {
  calculateCouponDiscount,
  normalizeCouponCode,
  type CartItemForCoupon,
} from '@/lib/utils/coupon-helpers'
import type {
  ActionResult,
  Coupon,
  UserCoupon,
  CouponDiscountResult,
  CouponStats,
} from '@/types'

// ============================================================================
// 管理員功能：優惠券 CRUD
// ============================================================================

/**
 * 建立優惠券（管理員）
 *
 * @param input - 優惠券建立資料
 * @returns ActionResult<Coupon>
 */
export async function createCoupon(
  input: unknown
): Promise<ActionResult<Coupon>> {
  try {
    // 1. 權限檢查
    const { role } = await checkAuth()
    if (role !== 'admin') {
      return { success: false, message: COUPON_ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // 2. 驗證輸入
    const validation = createCouponSchema.safeParse(input)
    if (!validation.success) {
      return {
        success: false,
        message: '輸入資料驗證失敗',
        errors: validation.error.flatten().fieldErrors,
      }
    }

    const data = validation.data
    const supabase = await createClient()

    // 3. 檢查代碼唯一性（大小寫不敏感，僅檢查非刪除狀態）
    const normalizedCode = normalizeCouponCode(data.code)
    const { data: existing } = await supabase
      .from('coupons')
      .select('id, status')
      .eq('code_normalized', normalizedCode)
      .in('status', ['active', 'inactive']) // ✅ 僅檢查 active 和 inactive，允許與 deleted 優惠券重複
      .single()

    if (existing) {
      return {
        success: false,
        message: `優惠券代碼 ${normalizedCode} 已存在（狀態：${existing.status === 'active' ? '啟用中' : '已停用'}）`
      }
    }

    // 4. 建立優惠券
    const { data: coupon, error } = await supabase
      .from('coupons')
      .insert({
        code: normalizedCode, // 儲存為大寫
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_order_amount: data.min_order_amount,
        claim_limit: data.claim_limit,
        valid_from: data.valid_from,
        valid_until: data.valid_until,
      })
      .select()
      .single()

    if (error) {
      console.error('建立優惠券失敗:', error)
      return { success: false, message: `建立失敗: ${error.message}` }
    }

    // 5. 建立等級限制
    if (data.tier_restrictions && data.tier_restrictions.length > 0) {
      const tierRestrictions = data.tier_restrictions.map((tier_id) => ({
        coupon_id: coupon.id,
        tier_id,
      }))

      const { error: tierError } = await supabase
        .from('coupon_tier_restrictions')
        .insert(tierRestrictions)

      if (tierError) {
        console.error('建立等級限制失敗:', tierError)
        // 清理已建立的優惠券
        await supabase.from('coupons').delete().eq('id', coupon.id)
        return { success: false, message: '建立等級限制失敗' }
      }
    }

    // 6. 建立系列限制
    if (data.series_restrictions && data.series_restrictions.length > 0) {
      const seriesRestrictions = data.series_restrictions.map((series_id) => ({
        coupon_id: coupon.id,
        series_id,
      }))

      const { error: seriesError } = await supabase
        .from('coupon_series_restrictions')
        .insert(seriesRestrictions)

      if (seriesError) {
        console.error('建立系列限制失敗:', seriesError)
        // 清理已建立的優惠券
        await supabase.from('coupons').delete().eq('id', coupon.id)
        return { success: false, message: '建立系列限制失敗' }
      }
    }

    revalidatePath('/admin/coupons')
    return {
      success: true,
      data: coupon,
      message: COUPON_SUCCESS_MESSAGES.CREATED,
    }
  } catch (error) {
    console.error('建立優惠券錯誤:', error)
    return { success: false, message: '建立優惠券時發生錯誤' }
  }
}

/**
 * 查詢所有優惠券（管理員）
 *
 * @param filters - 篩選條件
 * @returns ActionResult<Coupon[]>
 */
export async function getCoupons(filters?: {
  status?: 'active' | 'inactive' | 'deleted'
  discount_type?: 'fixed' | 'percentage'
  search?: string
}): Promise<ActionResult<Coupon[]>> {
  try {
    // 1. 權限檢查
    const { role } = await checkAuth()
    if (role !== 'admin') {
      return { success: false, message: COUPON_ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // 2. 建立查詢
    let query = supabase
      .from('coupons')
      .select(`
        *,
        tier_restrictions:coupon_tier_restrictions(tier_id),
        series_restrictions:coupon_series_restrictions(series_id)
      `)
      .order('created_at', { ascending: false })

    // 3. 套用篩選條件
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.discount_type) {
      query = query.eq('discount_type', filters.discount_type)
    }

    if (filters?.search) {
      const normalizedSearch = normalizeCouponCode(filters.search)
      query = query.ilike('code_normalized', `%${normalizedSearch}%`)
    }

    const { data: coupons, error } = await query

    if (error) {
      console.error('查詢優惠券失敗:', error)
      return { success: false, message: '查詢優惠券失敗' }
    }

    // 4. 轉換關聯資料為 ID 陣列
    const transformedCoupons = coupons.map((coupon: any) => ({
      ...coupon,
      tier_restrictions: coupon.tier_restrictions?.map((r: any) => r.tier_id) || [],
      series_restrictions:
        coupon.series_restrictions?.map((r: any) => r.series_id) || [],
    }))

    return { success: true, data: transformedCoupons }
  } catch (error) {
    console.error('查詢優惠券錯誤:', error)
    return { success: false, message: '查詢優惠券時發生錯誤' }
  }
}

/**
 * 查詢單一優惠券詳情（管理員）
 *
 * @param couponId - 優惠券 ID
 * @returns ActionResult<Coupon>
 */
export async function getCouponById(
  couponId: string
): Promise<ActionResult<Coupon>> {
  try {
    // 1. 權限檢查
    const { role } = await checkAuth()
    if (role !== 'admin') {
      return { success: false, message: COUPON_ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // 2. 查詢優惠券
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select(`
        *,
        tier_restrictions:coupon_tier_restrictions(tier_id),
        series_restrictions:coupon_series_restrictions(series_id)
      `)
      .eq('id', couponId)
      .single()

    if (error || !coupon) {
      return { success: false, message: COUPON_ERROR_MESSAGES.COUPON_NOT_FOUND }
    }

    // 3. 轉換關聯資料為 ID 陣列
    const transformedCoupon = {
      ...coupon,
      tier_restrictions: coupon.tier_restrictions?.map((r: any) => r.tier_id) || [],
      series_restrictions:
        coupon.series_restrictions?.map((r: any) => r.series_id) || [],
    }

    return { success: true, data: transformedCoupon }
  } catch (error) {
    console.error('查詢優惠券詳情錯誤:', error)
    return { success: false, message: '查詢優惠券詳情時發生錯誤' }
  }
}

/**
 * 更新優惠券（管理員）
 *
 * @param couponId - 優惠券 ID
 * @param input - 更新資料
 * @returns ActionResult<Coupon>
 */
export async function updateCoupon(
  couponId: string,
  input: unknown
): Promise<ActionResult<Coupon>> {
  try {
    // 1. 權限檢查
    const { role } = await checkAuth()
    if (role !== 'admin') {
      return { success: false, message: COUPON_ERROR_MESSAGES.PERMISSION_DENIED }
    }

    // 2. 驗證輸入
    const validation = updateCouponSchema.safeParse(input)
    if (!validation.success) {
      return {
        success: false,
        message: '輸入資料驗證失敗',
        errors: validation.error.flatten().fieldErrors,
      }
    }

    const data = validation.data
    const supabase = await createClient()

    // 3. 檢查優惠券是否存在
    const { data: existing } = await supabase
      .from('coupons')
      .select('id, code_normalized')
      .eq('id', couponId)
      .single()

    if (!existing) {
      return { success: false, message: COUPON_ERROR_MESSAGES.COUPON_NOT_FOUND }
    }

    // 4. 如果更新代碼，檢查唯一性（僅檢查非刪除狀態）
    if (data.code) {
      const normalizedCode = normalizeCouponCode(data.code)

      // 如果代碼有變更，檢查是否與其他非刪除優惠券重複
      if (normalizedCode !== existing.code_normalized) {
        const { data: duplicate } = await supabase
          .from('coupons')
          .select('id, status')
          .eq('code_normalized', normalizedCode)
          .in('status', ['active', 'inactive']) // ✅ 僅檢查 active 和 inactive
          .neq('id', couponId) // 排除自己
          .single()

        if (duplicate) {
          return {
            success: false,
            message: `優惠券代碼 ${normalizedCode} 已存在（狀態：${duplicate.status === 'active' ? '啟用中' : '已停用'}）`
          }
        }
      }
    }

    // 5. 準備更新資料
    const updateData: any = {}

    if (data.code) {
      updateData.code = normalizeCouponCode(data.code)
    }
    if (data.discount_type) {
      updateData.discount_type = data.discount_type
    }
    if (data.discount_value !== undefined) {
      updateData.discount_value = data.discount_value
    }
    if (data.min_order_amount !== undefined) {
      updateData.min_order_amount = data.min_order_amount
    }
    if (data.claim_limit !== undefined) {
      updateData.claim_limit = data.claim_limit
    }
    if (data.valid_from) {
      updateData.valid_from = data.valid_from
    }
    if (data.valid_until) {
      updateData.valid_until = data.valid_until
    }
    if (data.status) {
      updateData.status = data.status
    }

    // 6. 更新優惠券
    const { data: coupon, error } = await supabase
      .from('coupons')
      .update(updateData)
      .eq('id', couponId)
      .select()
      .single()

    if (error) {
      console.error('更新優惠券失敗:', error)
      return { success: false, message: `更新失敗: ${error.message}` }
    }

    // 7. 更新等級限制（如果有提供）
    if (data.tier_restrictions !== undefined) {
      // 刪除舊的限制
      await supabase
        .from('coupon_tier_restrictions')
        .delete()
        .eq('coupon_id', couponId)

      // 建立新的限制
      if (data.tier_restrictions.length > 0) {
        const tierRestrictions = data.tier_restrictions.map((tier_id) => ({
          coupon_id: couponId,
          tier_id,
        }))

        await supabase.from('coupon_tier_restrictions').insert(tierRestrictions)
      }
    }

    // 8. 更新系列限制（如果有提供）
    if (data.series_restrictions !== undefined) {
      // 刪除舊的限制
      await supabase
        .from('coupon_series_restrictions')
        .delete()
        .eq('coupon_id', couponId)

      // 建立新的限制
      if (data.series_restrictions.length > 0) {
        const seriesRestrictions = data.series_restrictions.map((series_id) => ({
          coupon_id: couponId,
          series_id,
        }))

        await supabase
          .from('coupon_series_restrictions')
          .insert(seriesRestrictions)
      }
    }

    revalidatePath('/admin/coupons')
    return {
      success: true,
      data: coupon,
      message: COUPON_SUCCESS_MESSAGES.UPDATED,
    }
  } catch (error) {
    console.error('更新優惠券錯誤:', error)
    return { success: false, message: '更新優惠券時發生錯誤' }
  }
}

/**
 * 刪除優惠券（軟刪除）（管理員）
 *
 * @param couponId - 優惠券 ID
 * @returns ActionResult<void>
 */
export async function deleteCoupon(
  couponId: string
): Promise<ActionResult<void>> {
  try {
    // 1. 權限檢查
    const { role } = await checkAuth()
    if (role !== 'admin') {
      return { success: false, message: COUPON_ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // 2. 檢查優惠券是否存在
    const { data: coupon } = await supabase
      .from('coupons')
      .select('id')
      .eq('id', couponId)
      .single()

    if (!coupon) {
      return { success: false, message: COUPON_ERROR_MESSAGES.COUPON_NOT_FOUND }
    }

    // 3. 軟刪除優惠券（CASCADE 會自動刪除 user_coupons）
    const { error } = await supabase
      .from('coupons')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', couponId)

    if (error) {
      console.error('刪除優惠券失敗:', error)
      return { success: false, message: '刪除失敗' }
    }

    revalidatePath('/admin/coupons')
    return { success: true, message: COUPON_SUCCESS_MESSAGES.DELETED }
  } catch (error) {
    console.error('刪除優惠券錯誤:', error)
    return { success: false, message: '刪除優惠券時發生錯誤' }
  }
}

// ============================================================================
// 客戶功能：領取與使用優惠券
// ============================================================================

/**
 * 客戶領取優惠券（一次領取所有可領取張數）
 *
 * @param input - 優惠券代碼
 * @returns ActionResult<{ claimed: number, total: number }>
 */
export async function claimCoupon(
  input: unknown
): Promise<ActionResult<{ claimed: number; total: number }>> {
  try {
    // 1. 權限檢查
    const { userId } = await checkAuth()

    // 2. 驗證輸入
    const validation = claimCouponSchema.safeParse(input)
    if (!validation.success) {
      return {
        success: false,
        message: '輸入資料驗證失敗',
        errors: validation.error.flatten().fieldErrors,
      }
    }

    const data = validation.data
    const supabase = await createClient()

    // 3. 查詢優惠券（使用 View 自動過濾過期優惠券）
    const normalizedCode = normalizeCouponCode(data.couponCode)
    const { data: coupon, error: couponError } = await supabase
      .from('active_coupons')
      .select('*, claim_limit')
      .eq('code_normalized', normalizedCode)
      .single()

    if (couponError || !coupon) {
      return { success: false, message: COUPON_ERROR_MESSAGES.COUPON_EXPIRED }
    }

    // 4. 檢查已領取的張數
    const { count: alreadyClaimed } = await supabase
      .from('user_coupons')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('coupon_id', coupon.id)

    const claimedCount = alreadyClaimed || 0
    const claimLimit = coupon.claim_limit || 1

    // 5. 檢查是否已達上限
    if (claimedCount >= claimLimit) {
      return {
        success: false,
        message: `您已領取此優惠券（${claimedCount}/${claimLimit} 張）`,
      }
    }

    // 6. 計算可領取的張數（一次領取所有剩餘張數）
    const remainingCount = claimLimit - claimedCount

    // 7. 批次建立領取記錄
    const insertRecords = Array.from({ length: remainingCount }, () => ({
      user_id: userId,
      coupon_id: coupon.id,
    }))

    const { error } = await supabase
      .from('user_coupons')
      .insert(insertRecords)

    if (error) {
      console.error('領取優惠券失敗:', error)
      return { success: false, message: COUPON_ERROR_MESSAGES.CLAIM_FAILED }
    }

    revalidatePath('/store/coupons')
    return {
      success: true,
      data: { claimed: remainingCount, total: claimLimit },
      message:
        remainingCount === 1
          ? COUPON_SUCCESS_MESSAGES.CLAIMED
          : `成功領取 ${remainingCount} 張優惠券！`,
    }
  } catch (error) {
    console.error('領取優惠券錯誤:', error)
    return { success: false, message: '領取優惠券時發生錯誤' }
  }
}

/**
 * 查詢客戶已領取的優惠券列表
 *
 * @param filters - 篩選條件
 * @returns ActionResult<UserCoupon[]>
 */
export async function getUserCoupons(filters?: {
  used?: boolean
}): Promise<ActionResult<UserCoupon[]>> {
  try {
    // 1. 權限檢查
    const { userId } = await checkAuth()

    const supabase = await createClient()

    // 2. 建立查詢（使用 inner join 確保優惠券存在且狀態正確）
    let query = supabase
      .from('user_coupons')
      .select(`
        *,
        coupon:coupons!inner(*)
      `)
      .eq('user_id', userId)
      .neq('coupon.status', 'deleted') // ✅ 過濾已刪除的優惠券
      .order('claimed_at', { ascending: false })

    // 3. 套用篩選條件
    if (filters?.used === true) {
      query = query.not('used_at', 'is', null)
    } else if (filters?.used === false) {
      query = query.is('used_at', null)
    }

    const { data: userCoupons, error } = await query

    if (error) {
      console.error('查詢客戶優惠券失敗:', error)
      return { success: false, message: '查詢優惠券失敗' }
    }

    // 4. 前端額外過濾：隱藏過期的優惠券（僅顯示有效期內的）
    const now = new Date()
    const filteredCoupons = (userCoupons || []).filter((uc: any) => {
      const coupon = uc.coupon
      if (!coupon) return false

      const validFrom = new Date(coupon.valid_from)
      const validUntil = new Date(coupon.valid_until)

      // 僅顯示有效期內的優惠券
      return now >= validFrom && now <= validUntil
    })

    return { success: true, data: filteredCoupons }
  } catch (error) {
    console.error('查詢客戶優惠券錯誤:', error)
    return { success: false, message: '查詢優惠券時發生錯誤' }
  }
}

/**
 * 驗證優惠券是否可使用（含購物車資料）
 *
 * @param input - 優惠券代碼 + 購物車商品
 * @returns ActionResult<CouponDiscountResult>
 */
export async function validateCoupon(
  input: unknown
): Promise<ActionResult<CouponDiscountResult>> {
  try {
    // 1. 權限檢查
    const { userId, tierId } = await checkAuth()

    if (!tierId) {
      return {
        success: false,
        message: '無法取得客戶等級資訊',
      }
    }

    // 2. 驗證輸入
    const validation = validateCouponSchema.safeParse(input)
    if (!validation.success) {
      return {
        success: false,
        message: '輸入資料驗證失敗',
        errors: validation.error.flatten().fieldErrors,
      }
    }

    const data = validation.data
    const supabase = await createClient()

    // 3. 查詢優惠券
    const normalizedCode = normalizeCouponCode(data.couponCode)
    const { data: coupon, error: couponError } = await supabase
      .from('active_coupons')
      .select(`
        *,
        tier_restrictions:coupon_tier_restrictions(tier_id),
        series_restrictions:coupon_series_restrictions(series_id)
      `)
      .eq('code_normalized', normalizedCode)
      .single()

    if (couponError || !coupon) {
      return {
        success: true,
        data: {
          valid: false,
          error: COUPON_ERROR_MESSAGES.COUPON_EXPIRED,
        },
      }
    }

    // 4. 檢查客戶是否已領取（查詢未使用的優惠券，支援多張領取）
    const { data: userCoupons } = await supabase
      .from('user_coupons')
      .select('id, used_at')
      .eq('user_id', userId)
      .eq('coupon_id', coupon.id)
      .is('used_at', null) // 僅查詢未使用的優惠券

    if (!userCoupons || userCoupons.length === 0) {
      return {
        success: true,
        data: {
          valid: false,
          error: '您尚未領取此優惠券，或所有優惠券已使用',
        },
      }
    }

    // 5. 轉換關聯資料為 ID 陣列
    const tierRestrictions =
      coupon.tier_restrictions?.map((r: any) => r.tier_id) || []
    const seriesRestrictions =
      coupon.series_restrictions?.map((r: any) => r.series_id) || []

    // 6. 計算折扣
    const result = calculateCouponDiscount({
      coupon: {
        ...coupon,
        tier_restrictions: tierRestrictions,
        series_restrictions: seriesRestrictions,
      },
      cartItems: data.cartItems as CartItemForCoupon[],
      userTierId: tierId,
    })

    return {
      success: true,
      data: {
        ...result,
        availableUserCouponId: userCoupons[0].id, // 回傳第一張未使用的 user_coupon_id
      },
    }
  } catch (error) {
    console.error('驗證優惠券錯誤:', error)
    return { success: false, message: '驗證優惠券時發生錯誤' }
  }
}

/**
 * 查詢優惠券領取用戶列表（管理員）
 *
 * @param couponId - 優惠券 ID
 * @returns ActionResult<{ user_id, user_name, user_phone, claimed_at, used_at, order_id }[]>
 */
export async function getCouponUsers(
  couponId: string
): Promise<ActionResult<Array<{
  user_id: string
  user_name: string
  user_phone: string
  claimed_at: string
  used_at: string | null
  order_id: string | null
}>>> {
  try {
    // 1. 權限檢查
    const { role } = await checkAuth()
    if (role !== 'admin') {
      return { success: false, message: COUPON_ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // 2. 查詢領取記錄並關聯用戶資料
    const { data: userCoupons, error } = await supabase
      .from('user_coupons')
      .select(`
        user_id,
        claimed_at,
        used_at,
        order_id
      `)
      .eq('coupon_id', couponId)
      .order('claimed_at', { ascending: false })

    if (error) {
      console.error('查詢優惠券領取用戶失敗:', error)
      return { success: false, message: '查詢領取用戶失敗' }
    }

    if (!userCoupons || userCoupons.length === 0) {
      return { success: true, data: [] }
    }

    // 3. 批次查詢用戶資料
    const userIds = [...new Set(userCoupons.map((uc) => uc.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, phone, display_name')
      .in('id', userIds)

    // 4. 建立 user_id -> profile 對應表
    const profileMap = new Map(
      (profiles || []).map((profile: any) => [profile.id, profile])
    )

    // 5. 組合資料
    const users = userCoupons.map((uc: any) => {
      const profile = profileMap.get(uc.user_id)
      return {
        user_id: uc.user_id,
        user_name: profile?.display_name || profile?.phone || '未知客戶',
        user_phone: profile?.phone || '',
        claimed_at: uc.claimed_at,
        used_at: uc.used_at,
        order_id: uc.order_id,
      }
    })

    return { success: true, data: users }
  } catch (error) {
    console.error('查詢優惠券領取用戶錯誤:', error)
    return { success: false, message: '查詢領取用戶時發生錯誤' }
  }
}

/**
 * 查詢優惠券使用統計（管理員）
 *
 * @param couponId - 優惠券 ID
 * @returns ActionResult<CouponStats>
 */
export async function getCouponStats(
  couponId: string
): Promise<ActionResult<CouponStats>> {
  try {
    // 1. 權限檢查
    const { role } = await checkAuth()
    if (role !== 'admin') {
      return { success: false, message: COUPON_ERROR_MESSAGES.PERMISSION_DENIED }
    }

    const supabase = await createClient()

    // 2. 查詢領取數與使用數
    const { count: claimCount } = await supabase
      .from('user_coupons')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', couponId)

    const { count: usedCount } = await supabase
      .from('user_coupons')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', couponId)
      .not('used_at', 'is', null)

    // 3. 查詢總折扣金額
    // 先查詢所有使用該優惠券的訂單 ID
    const { data: userCouponsWithOrders } = await supabase
      .from('user_coupons')
      .select('order_id')
      .eq('coupon_id', couponId)
      .not('order_id', 'is', null)

    const orderIds = userCouponsWithOrders?.map((uc) => uc.order_id).filter((id): id is string => id !== null) || []

    let totalDiscountAmount = 0

    if (orderIds.length > 0) {
      const { data: orderCoupons } = await supabase
        .from('order_coupons')
        .select('discount_amount')
        .in('order_id', orderIds)

      totalDiscountAmount = orderCoupons?.reduce(
        (sum, oc) => sum + (oc.discount_amount || 0),
        0
      ) || 0
    }

    return {
      success: true,
      data: {
        claimCount: claimCount || 0,
        usedCount: usedCount || 0,
        totalDiscountAmount,
      },
    }
  } catch (error) {
    console.error('查詢優惠券統計錯誤:', error)
    return { success: false, message: '查詢優惠券統計時發生錯誤' }
  }
}
