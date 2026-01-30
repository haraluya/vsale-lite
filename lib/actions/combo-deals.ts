'use server'

/**
 * Combo Deals Management Server Actions
 * Feature: 021-combo-deals
 * Created: 2026-01-29
 */

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkAuth } from './helpers'
import { logAudit } from './audit'
import { comboDealSchema } from '@/lib/validations/combo-deal.schema'
import type { ActionResult, ComboDealFormData, ComboDealWithDetails } from '@/types'

/**
 * T023: 建立組合優惠
 *
 * 管理員建立新的組合優惠，包含系列選擇、等級限制、折扣設定
 *
 * @param data 組合優惠表單資料
 * @returns ActionResult 包含建立的組合優惠 ID
 */
export async function createComboDeal(
  data: ComboDealFormData
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    // 1. 驗證管理員權限
    const auth = await checkAuth('admin')

    // 2. 驗證表單資料
    const validationResult = comboDealSchema.safeParse(data)
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors
      return {
        success: false,
        message: '表單驗證失敗',
        errors: errors as Record<string, string[]>,
      }
    }

    const validatedData = validationResult.data

    // 3. 驗證系列存在性與狀態
    const adminClient = createAdminClient()

    for (const seriesItem of validatedData.series) {
      const { data: series, error: seriesError } = await adminClient
        .from('series')
        .select('id, name, status')
        .eq('id', seriesItem.series_id)
        .single()

      if (seriesError || !series) {
        return {
          success: false,
          message: `系列 ${seriesItem.series_id} 不存在`,
        }
      }

      if (series.status !== 'active') {
        return {
          success: false,
          message: `系列「${series.name}」已停用，無法使用`,
        }
      }
    }

    // 4. 驗證等級存在性
    for (const tierId of validatedData.tier_ids) {
      const { data: tier, error: tierError } = await adminClient
        .from('tiers')
        .select('id')
        .eq('id', tierId)
        .single()

      if (tierError || !tier) {
        return {
          success: false,
          message: `等級 ${tierId} 不存在`,
        }
      }
    }

    // 5. 建立組合優惠主記錄
    const { data: comboDeal, error: comboDealError } = await adminClient
      .from('combo_deals')
      .insert({
        name: validatedData.name,
        poster_url: validatedData.poster_url,
        combo_mode: validatedData.combo_mode,
        discount_type: validatedData.discount_type,
        discount_value: validatedData.discount_value,
        start_date: validatedData.start_date.toISOString(),
        end_date: validatedData.end_date.toISOString(),
        display_order: validatedData.display_order,
        status: 'active',
        created_by: auth.userId,
      })
      .select('id, name')
      .single()

    if (comboDealError || !comboDeal) {
      console.error('建立組合優惠失敗:', comboDealError)
      return {
        success: false,
        message: '建立組合優惠失敗',
      }
    }

    // 6. 建立系列關聯記錄
    const seriesInserts = validatedData.series.map((s) => ({
      combo_deal_id: comboDeal.id,
      series_id: s.series_id,
      required_quantity:
        validatedData.combo_mode === 'each' ? s.required_quantity : null,
      display_order: s.display_order,
    }))

    const { error: seriesError } = await adminClient
      .from('combo_deal_series')
      .insert(seriesInserts)

    if (seriesError) {
      // 回滾：刪除組合優惠主記錄
      await adminClient.from('combo_deals').delete().eq('id', comboDeal.id)
      console.error('建立系列關聯失敗:', seriesError)
      return {
        success: false,
        message: '建立系列關聯失敗',
      }
    }

    // 7. 建立等級限制記錄
    const tierInserts = validatedData.tier_ids.map((tierId) => ({
      combo_deal_id: comboDeal.id,
      tier_id: tierId,
    }))

    const { error: tierError } = await adminClient
      .from('combo_deal_tiers')
      .insert(tierInserts)

    if (tierError) {
      // 回滾：刪除組合優惠主記錄（系列關聯會自動級聯刪除）
      await adminClient.from('combo_deals').delete().eq('id', comboDeal.id)
      console.error('建立等級限制失敗:', tierError)
      return {
        success: false,
        message: '建立等級限制失敗',
      }
    }

    // 8. 若為任選模式，建立任選配置記錄
    if (
      validatedData.combo_mode === 'mix_match' &&
      validatedData.mix_match_total_quantity
    ) {
      const { error: mixMatchError } = await adminClient
        .from('combo_deal_mix_match_config')
        .insert({
          combo_deal_id: comboDeal.id,
          total_quantity: validatedData.mix_match_total_quantity,
        })

      if (mixMatchError) {
        // 回滾：刪除組合優惠主記錄
        await adminClient.from('combo_deals').delete().eq('id', comboDeal.id)
        console.error('建立任選配置失敗:', mixMatchError)
        return {
          success: false,
          message: '建立任選配置失敗',
        }
      }
    }

    // 9. 記錄操作日誌
    await logAudit({
      target_type: 'combo_deal',
      target_id: comboDeal.id,
      action_type: 'created',
      new_values: {
        name: comboDeal.name,
        combo_mode: validatedData.combo_mode,
        discount_type: validatedData.discount_type,
        discount_value: validatedData.discount_value,
      },
    })

    // 10. 重新驗證相關路徑
    revalidatePath('/admin/combo-deals')

    return {
      success: true,
      data: {
        id: comboDeal.id,
        name: comboDeal.name,
      },
      message: '組合優惠建立成功',
    }
  } catch (error) {
    console.error('createComboDeal error:', error)
    return {
      success: false,
      message:
        error instanceof Error ? error.message : '建立組合優惠時發生未知錯誤',
    }
  }
}

/**
 * T024: 更新組合優惠
 *
 * 管理員編輯現有組合優惠
 *
 * @param id 組合優惠 ID
 * @param data 更新的表單資料
 * @returns ActionResult 包含更新的組合優惠 ID
 */
export async function updateComboDeal(
  id: string,
  data: ComboDealFormData
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. 驗證管理員權限
    const auth = await checkAuth('admin')

    // 2. 驗證表單資料
    const validationResult = comboDealSchema.safeParse(data)
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors
      return {
        success: false,
        message: '表單驗證失敗',
        errors: errors as Record<string, string[]>,
      }
    }

    const validatedData = validationResult.data

    // 3. 驗證組合優惠存在
    const adminClient = createAdminClient()

    const { data: existingComboDeal, error: existingError } = await adminClient
      .from('combo_deals')
      .select('id, name')
      .eq('id', id)
      .single()

    if (existingError || !existingComboDeal) {
      return {
        success: false,
        message: '組合優惠不存在',
      }
    }

    // 4. 驗證系列存在性與狀態
    for (const seriesItem of validatedData.series) {
      const { data: series, error: seriesError } = await adminClient
        .from('series')
        .select('id, name, status')
        .eq('id', seriesItem.series_id)
        .single()

      if (seriesError || !series) {
        return {
          success: false,
          message: `系列 ${seriesItem.series_id} 不存在`,
        }
      }

      if (series.status !== 'active') {
        return {
          success: false,
          message: `系列「${series.name}」已停用，無法使用`,
        }
      }
    }

    // 5. 驗證等級存在性
    for (const tierId of validatedData.tier_ids) {
      const { data: tier, error: tierError } = await adminClient
        .from('tiers')
        .select('id')
        .eq('id', tierId)
        .single()

      if (tierError || !tier) {
        return {
          success: false,
          message: `等級 ${tierId} 不存在`,
        }
      }
    }

    // 6. 更新組合優惠主記錄
    const { error: updateError } = await adminClient
      .from('combo_deals')
      .update({
        name: validatedData.name,
        poster_url: validatedData.poster_url,
        combo_mode: validatedData.combo_mode,
        discount_type: validatedData.discount_type,
        discount_value: validatedData.discount_value,
        start_date: validatedData.start_date.toISOString(),
        end_date: validatedData.end_date.toISOString(),
        display_order: validatedData.display_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('更新組合優惠失敗:', updateError)
      return {
        success: false,
        message: '更新組合優惠失敗',
      }
    }

    // 7. 刪除舊的系列關聯記錄
    await adminClient.from('combo_deal_series').delete().eq('combo_deal_id', id)

    // 8. 建立新的系列關聯記錄
    const seriesInserts = validatedData.series.map((s) => ({
      combo_deal_id: id,
      series_id: s.series_id,
      required_quantity:
        validatedData.combo_mode === 'each' ? s.required_quantity : null,
      display_order: s.display_order,
    }))

    const { error: seriesError } = await adminClient
      .from('combo_deal_series')
      .insert(seriesInserts)

    if (seriesError) {
      console.error('更新系列關聯失敗:', seriesError)
      return {
        success: false,
        message: '更新系列關聯失敗',
      }
    }

    // 9. 刪除舊的等級限制記錄
    await adminClient.from('combo_deal_tiers').delete().eq('combo_deal_id', id)

    // 10. 建立新的等級限制記錄
    const tierInserts = validatedData.tier_ids.map((tierId) => ({
      combo_deal_id: id,
      tier_id: tierId,
    }))

    const { error: tierError } = await adminClient
      .from('combo_deal_tiers')
      .insert(tierInserts)

    if (tierError) {
      console.error('更新等級限制失敗:', tierError)
      return {
        success: false,
        message: '更新等級限制失敗',
      }
    }

    // 11. 處理任選模式配置
    if (validatedData.combo_mode === 'mix_match') {
      // 刪除舊配置
      await adminClient
        .from('combo_deal_mix_match_config')
        .delete()
        .eq('combo_deal_id', id)

      // 建立新配置
      if (validatedData.mix_match_total_quantity) {
        const { error: mixMatchError } = await adminClient
          .from('combo_deal_mix_match_config')
          .insert({
            combo_deal_id: id,
            total_quantity: validatedData.mix_match_total_quantity,
          })

        if (mixMatchError) {
          console.error('更新任選配置失敗:', mixMatchError)
          return {
            success: false,
            message: '更新任選配置失敗',
          }
        }
      }
    } else {
      // 若改為各選模式，刪除任選配置
      await adminClient
        .from('combo_deal_mix_match_config')
        .delete()
        .eq('combo_deal_id', id)
    }

    // 12. 記錄操作日誌
    await logAudit({
      target_type: 'combo_deal',
      target_id: id,
      action_type: 'updated',
      new_values: {
        name: validatedData.name,
        combo_mode: validatedData.combo_mode,
        discount_type: validatedData.discount_type,
        discount_value: validatedData.discount_value,
      },
    })

    // 13. 重新驗證相關路徑
    revalidatePath('/admin/combo-deals')
    revalidatePath(`/admin/combo-deals/${id}/edit`)

    return {
      success: true,
      data: { id },
      message: '組合優惠更新成功',
    }
  } catch (error) {
    console.error('updateComboDeal error:', error)
    return {
      success: false,
      message:
        error instanceof Error ? error.message : '更新組合優惠時發生未知錯誤',
    }
  }
}

/**
 * T025: 取得組合優惠詳情（管理員）
 *
 * 管理員編輯時載入組合優惠完整資料
 *
 * @param id 組合優惠 ID
 * @returns ActionResult 包含組合優惠詳情
 */
export async function getComboDealDetail(
  id: string
): Promise<ActionResult<ComboDealWithDetails>> {
  try {
    // 1. 驗證管理員權限
    await checkAuth('admin')

    // 2. 查詢組合優惠基本資料
    const adminClient = createAdminClient()

    const { data: comboDeal, error: comboDealError } = await adminClient
      .from('combo_deals')
      .select('*')
      .eq('id', id)
      .single()

    if (comboDealError || !comboDeal) {
      return {
        success: false,
        message: '組合優惠不存在',
      }
    }

    // 3. 查詢系列關聯資料
    const { data: seriesData, error: seriesError } = await adminClient
      .from('combo_deal_series')
      .select(`
        series_id,
        required_quantity,
        display_order,
        series:series_id (
          id,
          name,
          status
        )
      `)
      .eq('combo_deal_id', id)
      .order('display_order', { ascending: true })

    if (seriesError) {
      console.error('查詢系列關聯失敗:', seriesError)
      return {
        success: false,
        message: '查詢系列關聯失敗',
      }
    }

    // 4. 查詢等級限制資料
    const { data: tiersData, error: tiersError } = await adminClient
      .from('combo_deal_tiers')
      .select(`
        tier_id,
        tiers:tier_id (
          id,
          name
        )
      `)
      .eq('combo_deal_id', id)

    if (tiersError) {
      console.error('查詢等級限制失敗:', tiersError)
      return {
        success: false,
        message: '查詢等級限制失敗',
      }
    }

    // 5. 查詢任選模式配置（若有）
    let mixMatchTotalQuantity: number | undefined

    if (comboDeal.combo_mode === 'mix_match') {
      const { data: mixMatchConfig, error: mixMatchError } = await adminClient
        .from('combo_deal_mix_match_config')
        .select('total_quantity')
        .eq('combo_deal_id', id)
        .single()

      if (!mixMatchError && mixMatchConfig) {
        mixMatchTotalQuantity = mixMatchConfig.total_quantity
      }
    }

    // 6. 組裝回傳資料
    const result: ComboDealWithDetails = {
      ...comboDeal,
      series: (seriesData || [])
        .filter((s: any) => s.series && s.series.status === 'active') // 過濾無效系列
        .map((s: any) => ({
          series_id: s.series_id,
          series_name: s.series?.name || '',
          required_quantity: s.required_quantity,
          display_order: s.display_order,
          products: [], // 管理員編輯頁面不需要商品列表
        })),
      tiers: (tiersData || []).map((t: any) => ({
        tier_id: t.tier_id,
        tier_name: t.tiers?.name || '',
      })),
      mix_match_total_quantity: mixMatchTotalQuantity,
    }

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('getComboDealDetail error:', error)
    return {
      success: false,
      message:
        error instanceof Error ? error.message : '查詢組合優惠時發生未知錯誤',
    }
  }
}

/**
 * T037: 取得組合優惠列表（含篩選）
 *
 * 管理員查看所有組合優惠，支援狀態、等級篩選和分頁
 *
 * @param filters 篩選條件
 * @returns ActionResult 包含組合優惠列表和分頁資訊
 */
export async function getComboDealsList(filters?: {
  status?: 'active' | 'inactive' | 'ended'
  tier_id?: string
  page?: number
  limit?: number
}): Promise<
  ActionResult<{
    items: any[]
    total: number
    page: number
    limit: number
  }>
> {
  try {
    // 1. 驗證管理員權限
    await checkAuth('admin')

    const adminClient = createAdminClient()

    // 2. 建立查詢
    let query = adminClient.from('combo_deals').select('*', { count: 'exact' })

    // 3. 套用篩選條件
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    // 4. 若有等級篩選，查詢該等級的組合優惠
    if (filters?.tier_id) {
      const { data: comboDealIds, error: tierFilterError } = await adminClient
        .from('combo_deal_tiers')
        .select('combo_deal_id')
        .eq('tier_id', filters.tier_id)

      if (tierFilterError) {
        console.error('查詢等級篩選失敗:', tierFilterError)
        return {
          success: false,
          message: '查詢等級篩選失敗',
        }
      }

      const ids = comboDealIds.map((item) => item.combo_deal_id)
      if (ids.length > 0) {
        query = query.in('id', ids)
      } else {
        // 若該等級無組合優惠，直接回傳空陣列
        return {
          success: true,
          data: {
            items: [],
            total: 0,
            page: filters?.page || 1,
            limit: filters?.limit || 20,
          },
        }
      }
    }

    // 5. 排序：display_order（NULLS LAST）、created_at DESC
    query = query.order('display_order', { ascending: true, nullsFirst: false })
    query = query.order('created_at', { ascending: false })

    // 6. 分頁
    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to)

    // 7. 執行查詢
    const { data: comboDeals, error: queryError, count } = await query

    if (queryError) {
      console.error('查詢組合優惠列表失敗:', queryError)
      return {
        success: false,
        message: '查詢組合優惠列表失敗',
      }
    }

    // 8. 查詢每個組合優惠的系列數量
    const comboDealIds = (comboDeals || []).map((cd) => cd.id)
    const { data: seriesCounts, error: seriesCountError } = await adminClient
      .from('combo_deal_series')
      .select('combo_deal_id')
      .in('combo_deal_id', comboDealIds)

    const seriesCountMap = new Map<string, number>()
    if (!seriesCountError && seriesCounts) {
      seriesCounts.forEach((item) => {
        const currentCount = seriesCountMap.get(item.combo_deal_id) || 0
        seriesCountMap.set(item.combo_deal_id, currentCount + 1)
      })
    }

    // 9. 查詢每個組合優惠的等級數量
    const { data: tierCounts, error: tierCountError } = await adminClient
      .from('combo_deal_tiers')
      .select('combo_deal_id')
      .in('combo_deal_id', comboDealIds)

    const tierCountMap = new Map<string, number>()
    if (!tierCountError && tierCounts) {
      tierCounts.forEach((item) => {
        const currentCount = tierCountMap.get(item.combo_deal_id) || 0
        tierCountMap.set(item.combo_deal_id, currentCount + 1)
      })
    }

    // 10. 組裝回傳資料（新增系列數量和等級數量）
    const items = (comboDeals || []).map((cd) => ({
      ...cd,
      series_count: seriesCountMap.get(cd.id) || 0,
      tier_count: tierCountMap.get(cd.id) || 0,
    }))

    return {
      success: true,
      data: {
        items,
        total: count || 0,
        page,
        limit,
      },
    }
  } catch (error) {
    console.error('getComboDealsList error:', error)
    return {
      success: false,
      message:
        error instanceof Error ? error.message : '查詢組合優惠列表時發生未知錯誤',
    }
  }
}

/**
 * T038: 刪除組合優惠
 *
 * 管理員刪除組合優惠，檢查是否有關聯訂單並警告
 *
 * @param id 組合優惠 ID
 * @returns ActionResult 包含關聯訂單數量
 */
export async function deleteComboDeal(
  id: string
): Promise<ActionResult<{ order_count: number }>> {
  try {
    // 1. 驗證管理員權限
    const auth = await checkAuth('admin')

    const adminClient = createAdminClient()

    // 2. 驗證組合優惠存在
    const { data: comboDeal, error: existingError } = await adminClient
      .from('combo_deals')
      .select('id, name')
      .eq('id', id)
      .single()

    if (existingError || !comboDeal) {
      return {
        success: false,
        message: '組合優惠不存在',
      }
    }

    // 3. 檢查是否有關聯訂單
    const { data: orderItems, error: orderError } = await adminClient
      .from('order_combo_deal_items')
      .select('id')
      .eq('combo_deal_id', id)

    const orderCount = orderItems?.length || 0

    if (orderError) {
      console.error('檢查關聯訂單失敗:', orderError)
    }

    // 4. 執行刪除（級聯刪除系列關聯、等級限制、任選配置）
    const { error: deleteError } = await adminClient
      .from('combo_deals')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('刪除組合優惠失敗:', deleteError)
      return {
        success: false,
        message: '刪除組合優惠失敗',
      }
    }

    // 5. 記錄操作日誌
    await logAudit({
      target_type: 'combo_deal',
      target_id: id,
      action_type: 'deleted',
      old_values: {
        name: comboDeal.name,
      },
      notes: orderCount > 0 ? `有 ${orderCount} 筆訂單記錄，快照已保留` : undefined,
    })

    // 6. 重新驗證相關路徑
    revalidatePath('/admin/combo-deals')

    return {
      success: true,
      data: { order_count: orderCount },
      message:
        orderCount > 0
          ? `組合優惠已刪除（有 ${orderCount} 筆訂單記錄，快照已保留）`
          : '組合優惠已刪除',
    }
  } catch (error) {
    console.error('deleteComboDeal error:', error)
    return {
      success: false,
      message:
        error instanceof Error ? error.message : '刪除組合優惠時發生未知錯誤',
    }
  }
}

/**
 * T039: 切換組合優惠狀態
 *
 * 管理員切換組合優惠的啟用/停用狀態
 *
 * @param id 組合優惠 ID
 * @returns ActionResult 包含新狀態
 */
export async function toggleComboDealStatus(
  id: string
): Promise<ActionResult<{ new_status: 'active' | 'inactive' | 'ended' }>> {
  try {
    // 1. 驗證管理員權限
    const auth = await checkAuth('admin')

    const adminClient = createAdminClient()

    // 2. 查詢當前狀態
    const { data: comboDeal, error: existingError } = await adminClient
      .from('combo_deals')
      .select('id, name, status, start_date, end_date')
      .eq('id', id)
      .single()

    if (existingError || !comboDeal) {
      return {
        success: false,
        message: '組合優惠不存在',
      }
    }

    // 3. 檢查是否為已結束狀態
    if (comboDeal.status === 'ended') {
      return {
        success: false,
        message: '已結束的組合優惠無法切換狀態',
      }
    }

    // 4. 計算新狀態
    const newStatus = comboDeal.status === 'active' ? 'inactive' : 'active'

    // 5. 若要啟用，檢查活動期間是否有效
    if (newStatus === 'active') {
      const now = new Date()
      const startDate = new Date(comboDeal.start_date)
      const endDate = new Date(comboDeal.end_date)

      if (now > endDate) {
        return {
          success: false,
          message: '活動已結束，無法啟用',
        }
      }

      if (now < startDate) {
        return {
          success: false,
          message: '活動尚未開始，請檢查開始日期',
        }
      }
    }

    // 6. 更新狀態
    const { error: updateError } = await adminClient
      .from('combo_deals')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('更新組合優惠狀態失敗:', updateError)
      return {
        success: false,
        message: '更新組合優惠狀態失敗',
      }
    }

    // 7. 記錄操作日誌
    await logAudit({
      target_type: 'combo_deal',
      target_id: id,
      action_type: 'updated',
      old_values: {
        status: comboDeal.status,
      },
      new_values: {
        status: newStatus,
      },
      notes: `狀態變更: ${comboDeal.status} → ${newStatus}`,
    })

    // 8. 重新驗證相關路徑
    revalidatePath('/admin/combo-deals')
    revalidatePath(`/admin/combo-deals/${id}/edit`)

    return {
      success: true,
      data: { new_status: newStatus },
      message: newStatus === 'active' ? '組合優惠已啟用' : '組合優惠已停用',
    }
  } catch (error) {
    console.error('toggleComboDealStatus error:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : '切換組合優惠狀態時發生未知錯誤',
    }
  }
}

/**
 * T044: 取得符合等級的有效組合優惠（客戶端）
 *
 * 客戶瀏覽「優惠活動」分類時呼叫，取得所有符合其等級且活動期間內的組合優惠
 *
 * @returns ActionResult 包含組合優惠列表
 */
export async function getActiveComboDealsByTier(): Promise<
  ActionResult<
    Array<{
      id: string
      name: string
      poster_url: string
      combo_mode: 'each' | 'mix_match'
      discount_type: 'fixed' | 'percentage'
      discount_value: number
      start_date: string
      end_date: string
      series_count: number
      mix_match_total_quantity?: number
    }>
  >
> {
  try {
    // 1. 驗證使用者已登入
    const auth = await checkAuth()

    // 2. 取得使用者等級
    const supabase = await createClient()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tier_id')
      .eq('id', auth.userId)
      .single()

    if (profileError || !profile || !profile.tier_id) {
      console.error('查詢使用者等級失敗:', profileError)
      return {
        success: false,
        message: '查詢使用者等級失敗',
      }
    }

    // 3. 查詢符合條件的組合優惠 ID（透過 combo_deal_tiers）
    const { data: comboDealTiers, error: tiersError } = await supabase
      .from('combo_deal_tiers')
      .select('combo_deal_id')
      .eq('tier_id', profile.tier_id)

    if (tiersError) {
      console.error('查詢組合優惠等級限制失敗:', tiersError)
      return {
        success: false,
        message: '查詢組合優惠失敗',
      }
    }

    // 若無符合等級的組合優惠，直接回傳空陣列
    if (!comboDealTiers || comboDealTiers.length === 0) {
      return {
        success: true,
        data: [],
      }
    }

    const comboDealIds = comboDealTiers.map((item) => item.combo_deal_id)

    // 4. 查詢組合優惠基本資料（RLS 會自動過濾狀態和期間）
    const now = new Date().toISOString()

    const { data: comboDeals, error: comboDealsError } = await supabase
      .from('combo_deals')
      .select('id, name, poster_url, combo_mode, discount_type, discount_value, start_date, end_date')
      .in('id', comboDealIds)
      .eq('status', 'active')
      .lte('start_date', now)
      .gte('end_date', now)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (comboDealsError) {
      console.error('查詢組合優惠列表失敗:', comboDealsError)
      return {
        success: false,
        message: '查詢組合優惠列表失敗',
      }
    }

    // 5. 查詢每個組合優惠的系列數量
    const { data: seriesCounts, error: seriesCountError } = await supabase
      .from('combo_deal_series')
      .select('combo_deal_id')
      .in('combo_deal_id', comboDealIds)

    const seriesCountMap = new Map<string, number>()
    if (!seriesCountError && seriesCounts) {
      seriesCounts.forEach((item) => {
        const currentCount = seriesCountMap.get(item.combo_deal_id) || 0
        seriesCountMap.set(item.combo_deal_id, currentCount + 1)
      })
    }

    // 6. 查詢任選模式的總數量配置
    const { data: mixMatchConfigs, error: mixMatchError } = await supabase
      .from('combo_deal_mix_match_config')
      .select('combo_deal_id, total_quantity')
      .in('combo_deal_id', comboDealIds)

    const mixMatchQuantityMap = new Map<string, number>()
    if (!mixMatchError && mixMatchConfigs) {
      mixMatchConfigs.forEach((config) => {
        mixMatchQuantityMap.set(config.combo_deal_id, config.total_quantity)
      })
    }

    // 7. 組裝回傳資料
    const items = (comboDeals || []).map((cd) => ({
      id: cd.id,
      name: cd.name,
      poster_url: cd.poster_url,
      combo_mode: cd.combo_mode as 'each' | 'mix_match',
      discount_type: cd.discount_type as 'fixed' | 'percentage',
      discount_value: cd.discount_value,
      start_date: cd.start_date,
      end_date: cd.end_date,
      series_count: seriesCountMap.get(cd.id) || 0,
      mix_match_total_quantity: cd.combo_mode === 'mix_match' ? mixMatchQuantityMap.get(cd.id) : undefined,
    }))

    return {
      success: true,
      data: items,
    }
  } catch (error) {
    console.error('getActiveComboDealsByTier error:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : '查詢組合優惠時發生未知錯誤',
    }
  }
}

/**
 * T045: 取得組合優惠詳情（客戶端）
 *
 * 客戶點擊組合優惠卡片進入詳情頁時呼叫，包含完整的系列和商品資料
 *
 * @param id 組合優惠 ID
 * @returns ActionResult 包含組合優惠詳情（含商品列表）
 */
export async function getComboDealDetailForClient(
  id: string
): Promise<ActionResult<ComboDealWithDetails>> {
  try {
    // 1. 驗證使用者已登入
    const auth = await checkAuth()

    // 2. 取得使用者等級
    const supabase = await createClient()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tier_id')
      .eq('id', auth.userId)
      .single()

    if (profileError || !profile || !profile.tier_id) {
      console.error('查詢使用者等級失敗:', profileError)
      return {
        success: false,
        message: '查詢使用者等級失敗',
      }
    }

    // 3. 驗證組合優惠存在且符合資格（RLS 會自動檢查）
    const now = new Date().toISOString()

    const { data: comboDeal, error: comboDealError } = await supabase
      .from('combo_deals')
      .select('*')
      .eq('id', id)
      .eq('status', 'active')
      .lte('start_date', now)
      .gte('end_date', now)
      .single()

    if (comboDealError || !comboDeal) {
      return {
        success: false,
        message: '組合優惠不存在或您無權訪問',
      }
    }

    // 4. 驗證等級資格
    const { data: tierCheck, error: tierCheckError } = await supabase
      .from('combo_deal_tiers')
      .select('id')
      .eq('combo_deal_id', id)
      .eq('tier_id', profile.tier_id)
      .single()

    if (tierCheckError || !tierCheck) {
      return {
        success: false,
        message: '此組合優惠不適用於您的等級',
      }
    }

    // 5. 查詢系列關聯資料（含商品）
    const { data: seriesData, error: seriesError } = await supabase
      .from('combo_deal_series')
      .select(`
        series_id,
        required_quantity,
        display_order,
        series:series_id (
          id,
          name,
          image_url,
          status
        )
      `)
      .eq('combo_deal_id', id)
      .order('display_order', { ascending: true })

    if (seriesError) {
      console.error('查詢系列關聯失敗:', seriesError)
      return {
        success: false,
        message: '查詢系列關聯失敗',
      }
    }

    // 過濾掉無效的系列（series 為 null 或 status 不是 active）
    const validSeriesData = (seriesData || []).filter(
      (s: any) => s.series && s.series.status === 'active'
    )

    // 6. 查詢每個系列的商品（僅 active 且有價格的商品）
    const seriesWithProducts = await Promise.all(
      validSeriesData.map(async (s: any) => {
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select(`
            id,
            name,
            image_url,
            status,
            stock,
            retail_price
          `)
          .eq('series_id', s.series_id)
          .eq('status', 'active')
          .order('name', { ascending: true })

        // 只有在真正有錯誤時才記錄（避免空物件誤判）
        if (productsError && Object.keys(productsError).length > 0) {
          console.error(`查詢系列 ${s.series_id} (${s.series?.name || '未知'}) 的商品失敗:`, productsError)
        }

        // 如果查詢失敗但系列有效，返回空商品列表（不中斷流程）
        if (productsError) {
          return {
            series_id: s.series_id,
            series_name: s.series?.name || '',
            series_image_url: s.series?.image_url || null,
            required_quantity: s.required_quantity,
            display_order: s.display_order,
            products: [],
          }
        }

        // 查詢使用者等級的商品價格
        const productIds = (products || []).map((p) => p.id)
        const { data: tierPrices, error: tierPricesError } = await supabase
          .from('tier_prices')
          .select('product_id, price')
          .in('product_id', productIds)
          .eq('tier_id', profile.tier_id)

        // 建立價格對應表
        const priceMap = new Map<string, number>()
        if (!tierPricesError && tierPrices) {
          tierPrices.forEach((tp) => {
            priceMap.set(tp.product_id, tp.price)
          })
        }

        // 過濾掉無價格的商品，並轉換為元件期望的格式
        const productsWithPrices = (products || [])
          .filter((p) => priceMap.has(p.id))
          .map((p) => ({
            product_id: p.id,
            product_name: p.name,
            product_image: p.image_url,
            stock: p.stock,
            tier_price: priceMap.get(p.id)!,
            retail_price: p.retail_price, // 🆕 零售價
          }))

        return {
          series_id: s.series_id,
          series_name: s.series?.name || '',
          series_image_url: s.series?.image_url || null,
          required_quantity: s.required_quantity,
          display_order: s.display_order,
          products: productsWithPrices,
        }
      })
    )

    // 7. 查詢任選模式配置（若有）
    let mixMatchTotalQuantity: number | undefined

    if (comboDeal.combo_mode === 'mix_match') {
      const { data: mixMatchConfig, error: mixMatchError } = await supabase
        .from('combo_deal_mix_match_config')
        .select('total_quantity')
        .eq('combo_deal_id', id)
        .single()

      if (!mixMatchError && mixMatchConfig) {
        mixMatchTotalQuantity = mixMatchConfig.total_quantity
      }
    }

    // 8. 組裝回傳資料
    const result: ComboDealWithDetails = {
      ...comboDeal,
      series: seriesWithProducts,
      tiers: [], // 客戶端不需要等級資料
      mix_match_total_quantity: mixMatchTotalQuantity,
    }

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('getComboDealDetailForClient error:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : '查詢組合優惠詳情時發生未知錯誤',
    }
  }
}

/**
 * T050: 驗證組合優惠選擇
 *
 * 客戶選購商品時即時驗證是否滿足組合優惠條件
 *
 * @param comboDealId 組合優惠 ID
 * @param selectedProducts 選擇的商品（product_id 和 quantity）
 * @returns ActionResult 包含驗證結果和錯誤訊息
 */
export async function validateComboDealSelection(
  comboDealId: string,
  selectedProducts: Array<{ product_id: string; quantity: number }>
): Promise<
  ActionResult<{
    valid: boolean
    message?: string
    details?: {
      series_id: string
      series_name: string
      required_quantity: number
      selected_quantity: number
    }[]
  }>
> {
  try {
    // 1. 驗證使用者已登入
    const auth = await checkAuth()

    // 2. 取得使用者等級
    const supabase = await createClient()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tier_id')
      .eq('id', auth.userId)
      .single()

    if (profileError || !profile || !profile.tier_id) {
      console.error('查詢使用者等級失敗:', profileError)
      return {
        success: false,
        message: '查詢使用者等級失敗',
      }
    }

    // 3. 查詢組合優惠基本資料
    const { data: comboDeal, error: comboDealError } = await supabase
      .from('combo_deals')
      .select('id, name, combo_mode, status, start_date, end_date')
      .eq('id', comboDealId)
      .single()

    if (comboDealError || !comboDeal) {
      return {
        success: false,
        message: '組合優惠不存在',
      }
    }

    // 4. 驗證活動期間
    const now = new Date()
    const startDate = new Date(comboDeal.start_date)
    const endDate = new Date(comboDeal.end_date)

    if (now < startDate || now > endDate || comboDeal.status !== 'active') {
      return {
        success: true,
        data: {
          valid: false,
          message: '活動已結束或尚未開始',
        },
      }
    }

    // 5. 驗證等級資格
    const { data: tierCheck, error: tierCheckError } = await supabase
      .from('combo_deal_tiers')
      .select('id')
      .eq('combo_deal_id', comboDealId)
      .eq('tier_id', profile.tier_id)
      .single()

    if (tierCheckError || !tierCheck) {
      return {
        success: true,
        data: {
          valid: false,
          message: '此組合優惠不適用於您的等級',
        },
      }
    }

    // 6. 查詢系列關聯資料
    const { data: seriesData, error: seriesError } = await supabase
      .from('combo_deal_series')
      .select(`
        series_id,
        required_quantity,
        display_order,
        series:series_id (
          id,
          name,
          status
        )
      `)
      .eq('combo_deal_id', comboDealId)
      .order('display_order', { ascending: true })

    if (seriesError || !seriesData) {
      console.error('查詢系列關聯失敗:', seriesError)
      return {
        success: false,
        message: '查詢系列關聯失敗',
      }
    }

    // 過濾掉無效的系列
    const validSeriesData = seriesData.filter(
      (s: any) => s.series && s.series.status === 'active'
    )

    // 7. 查詢每個商品的系列
    const productIds = selectedProducts.map((p) => p.product_id)
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, series_id')
      .in('id', productIds)

    if (productsError || !products) {
      console.error('查詢商品系列失敗:', productsError)
      return {
        success: false,
        message: '查詢商品系列失敗',
      }
    }

    // 建立商品 ID → 系列 ID 對應表
    const productToSeriesMap = new Map<string, string>()
    products.forEach((p) => {
      productToSeriesMap.set(p.id, p.series_id)
    })

    // 8. 驗證組合條件
    if (comboDeal.combo_mode === 'each') {
      // 各選模式：檢查每個系列是否滿足數量
      const validationDetails = validSeriesData.map((s: any) => {
        const selectedInSeries = selectedProducts
          .filter((p) => productToSeriesMap.get(p.product_id) === s.series_id)
          .reduce((sum, p) => sum + p.quantity, 0)

        return {
          series_id: s.series_id,
          series_name: s.series?.name || '',
          required_quantity: s.required_quantity || 0,
          selected_quantity: selectedInSeries,
        }
      })

      // 檢查是否所有系列都滿足條件
      const invalidSeries = validationDetails.find(
        (d) => d.selected_quantity !== d.required_quantity
      )

      if (invalidSeries) {
        return {
          success: true,
          data: {
            valid: false,
            message:
              invalidSeries.selected_quantity < invalidSeries.required_quantity
                ? `請從「${invalidSeries.series_name}」選擇 ${invalidSeries.required_quantity} 個商品（目前已選 ${invalidSeries.selected_quantity} 個）`
                : `「${invalidSeries.series_name}」已超過數量限制（需要 ${invalidSeries.required_quantity} 個，目前選了 ${invalidSeries.selected_quantity} 個）`,
            details: validationDetails,
          },
        }
      }

      return {
        success: true,
        data: {
          valid: true,
          message: '已滿足組合條件',
          details: validationDetails,
        },
      }
    } else {
      // 任選模式：檢查總數量
      const { data: mixMatchConfig, error: mixMatchError } = await supabase
        .from('combo_deal_mix_match_config')
        .select('total_quantity')
        .eq('combo_deal_id', comboDealId)
        .single()

      if (mixMatchError || !mixMatchConfig) {
        console.error('查詢任選配置失敗:', mixMatchError)
        return {
          success: false,
          message: '查詢任選配置失敗',
        }
      }

      const totalQuantity = selectedProducts.reduce(
        (sum, p) => sum + p.quantity,
        0
      )
      const requiredQuantity = mixMatchConfig.total_quantity

      if (totalQuantity < requiredQuantity) {
        return {
          success: true,
          data: {
            valid: false,
            message: `請再選擇 ${requiredQuantity - totalQuantity} 個商品（目前已選 ${totalQuantity} 個）`,
          },
        }
      }

      if (totalQuantity > requiredQuantity) {
        return {
          success: true,
          data: {
            valid: false,
            message: `已超過組合數量限制（需要 ${requiredQuantity} 個，目前選了 ${totalQuantity} 個）`,
          },
        }
      }

      return {
        success: true,
        data: {
          valid: true,
          message: '已滿足組合條件',
        },
      }
    }
  } catch (error) {
    console.error('validateComboDealSelection error:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : '驗證組合優惠選擇時發生未知錯誤',
    }
  }
}

/**
 * 取得參與有效組合優惠的系列 ID（客戶端）
 *
 * 用於前台商品頁面的「優惠活動」特殊分類篩選
 * 回傳所有參與符合使用者等級的有效組合優惠的系列 ID
 *
 * @returns ActionResult 包含系列 ID 陣列
 */
export async function getPromotionSeriesIds(): Promise<ActionResult<string[]>> {
  try {
    // 1. 驗證使用者已登入
    const auth = await checkAuth()

    // 2. 取得使用者等級
    const supabase = await createClient()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tier_id')
      .eq('id', auth.userId)
      .single()

    if (profileError || !profile || !profile.tier_id) {
      console.error('查詢使用者等級失敗:', profileError)
      return {
        success: false,
        message: '查詢使用者等級失敗',
      }
    }

    // 3. 查詢符合條件的組合優惠 ID（透過 combo_deal_tiers）
    const { data: comboDealTiers, error: tiersError } = await supabase
      .from('combo_deal_tiers')
      .select('combo_deal_id')
      .eq('tier_id', profile.tier_id)

    if (tiersError) {
      console.error('查詢組合優惠等級限制失敗:', tiersError)
      return {
        success: false,
        message: '查詢組合優惠失敗',
      }
    }

    // 若無符合等級的組合優惠，直接回傳空陣列
    if (!comboDealTiers || comboDealTiers.length === 0) {
      return {
        success: true,
        data: [],
      }
    }

    const comboDealIds = comboDealTiers.map((item) => item.combo_deal_id)

    // 4. 篩選出有效的組合優惠（status = active 且在活動期間內）
    const now = new Date().toISOString()

    const { data: activeComboDeals, error: comboDealsError } = await supabase
      .from('combo_deals')
      .select('id')
      .in('id', comboDealIds)
      .eq('status', 'active')
      .lte('start_date', now)
      .gte('end_date', now)

    if (comboDealsError) {
      console.error('查詢有效組合優惠失敗:', comboDealsError)
      return {
        success: false,
        message: '查詢有效組合優惠失敗',
      }
    }

    // 若無有效的組合優惠，直接回傳空陣列
    if (!activeComboDeals || activeComboDeals.length === 0) {
      return {
        success: true,
        data: [],
      }
    }

    const activeComboDealIds = activeComboDeals.map((cd) => cd.id)

    // 5. 查詢這些組合優惠關聯的系列 ID
    const { data: seriesRelations, error: seriesError } = await supabase
      .from('combo_deal_series')
      .select('series_id')
      .in('combo_deal_id', activeComboDealIds)

    if (seriesError) {
      console.error('查詢組合優惠系列關聯失敗:', seriesError)
      return {
        success: false,
        message: '查詢組合優惠系列關聯失敗',
      }
    }

    // 6. 提取唯一的系列 ID
    const seriesIds = Array.from(
      new Set((seriesRelations || []).map((sr) => sr.series_id))
    )

    return {
      success: true,
      data: seriesIds,
    }
  } catch (error) {
    console.error('getPromotionSeriesIds error:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : '查詢優惠活動系列時發生未知錯誤',
    }
  }
}
