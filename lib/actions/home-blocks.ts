'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import {
  CreateHomeBlockSchema,
  UpdateHomeBlockSchema,
  ImageCarouselConfigSchema,
  ProductDisplayConfigSchema,
  TextBlockConfigSchema,
} from '@/lib/validations/home-block.schema'
import type {
  ActionResult,
  HomePageBlock,
  CreateHomeBlockInput,
  UpdateHomeBlockInput,
  ProductDisplayConfig,
} from '@/types'

// ===================================
// 前台查詢 Server Actions
// ===================================

/**
 * 取得所有啟用的首頁廣告區塊（前台）
 * 依 sort_order 排序，僅顯示 is_active = true 的區塊
 */
export async function getActiveHomeBlocks(): Promise<ActionResult<HomePageBlock[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('home_page_blocks')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error

    return {
      success: true,
      data: data as HomePageBlock[],
    }
  } catch (error) {
    console.error('取得首頁廣告區塊失敗:', error)
    return {
      success: false,
      message: '取得首頁廣告區塊失敗',
    }
  }
}

// ===================================
// 後台管理 Server Actions
// ===================================

/**
 * 取得所有首頁廣告區塊（後台）
 * 包含所有區塊（含停用），依 sort_order 排序
 */
export async function getAllHomeBlocks(): Promise<ActionResult<HomePageBlock[]>> {
  try {
    await checkAuth('admin')
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('home_page_blocks')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error

    return {
      success: true,
      data: data as HomePageBlock[],
    }
  } catch (error) {
    console.error('取得首頁廣告區塊失敗:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '取得首頁廣告區塊失敗',
    }
  }
}

/**
 * 取得單一首頁廣告區塊（後台）
 */
export async function getHomeBlockById(blockId: string): Promise<ActionResult<HomePageBlock>> {
  try {
    await checkAuth('admin')
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('home_page_blocks')
      .select('*')
      .eq('id', blockId)
      .single()

    if (error) throw error

    return {
      success: true,
      data: data as HomePageBlock,
    }
  } catch (error) {
    console.error('取得首頁廣告區塊失敗:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '取得首頁廣告區塊失敗',
    }
  }
}

/**
 * 建立首頁廣告區塊（後台）
 */
export async function createHomeBlock(input: CreateHomeBlockInput): Promise<ActionResult<HomePageBlock>> {
  try {
    await checkAuth('admin')

    // Zod 驗證
    const validated = CreateHomeBlockSchema.parse(input)

    const supabase = await createClient()

    // 取得當前最大的 sort_order，新區塊排在最後
    const { data: maxSortOrder } = await supabase
      .from('home_page_blocks')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const nextSortOrder = maxSortOrder ? maxSortOrder.sort_order + 1 : 0

    const { data, error } = await supabase
      .from('home_page_blocks')
      .insert({
        name: validated.name,
        block_type: validated.block_type,
        config: validated.config,
        is_active: validated.is_active ?? true,
        sort_order: nextSortOrder,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/store/home')
    revalidatePath('/admin/announcements')

    return {
      success: true,
      data: data as HomePageBlock,
      message: '首頁廣告區塊建立成功',
    }
  } catch (error) {
    console.error('建立首頁廣告區塊失敗:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '建立首頁廣告區塊失敗',
    }
  }
}

/**
 * 更新首頁廣告區塊（後台）
 */
export async function updateHomeBlock(input: UpdateHomeBlockInput): Promise<ActionResult<HomePageBlock>> {
  try {
    await checkAuth('admin')

    // Zod 驗證
    const validated = UpdateHomeBlockSchema.parse(input)

    const supabase = await createClient()

    // 建立部分更新物件
    const updates: Record<string, unknown> = {}
    if (validated.name !== undefined) updates.name = validated.name
    if (validated.block_type !== undefined) updates.block_type = validated.block_type
    if (validated.config !== undefined) updates.config = validated.config
    if (validated.is_active !== undefined) updates.is_active = validated.is_active

    const { data, error } = await supabase
      .from('home_page_blocks')
      .update(updates)
      .eq('id', validated.id)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/store/home')
    revalidatePath('/admin/announcements')

    return {
      success: true,
      data: data as HomePageBlock,
      message: '首頁廣告區塊更新成功',
    }
  } catch (error) {
    console.error('更新首頁廣告區塊失敗:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新首頁廣告區塊失敗',
    }
  }
}

/**
 * 刪除首頁廣告區塊（後台）
 * 注意：圖片清理將在 Phase 9 實作
 */
export async function deleteHomeBlock(blockId: string): Promise<ActionResult<void>> {
  try {
    await checkAuth('admin')

    const supabase = await createClient()

    const { error } = await supabase.from('home_page_blocks').delete().eq('id', blockId)

    if (error) throw error

    revalidatePath('/store/home')
    revalidatePath('/admin/announcements')

    return {
      success: true,
      message: '首頁廣告區塊刪除成功',
    }
  } catch (error) {
    console.error('刪除首頁廣告區塊失敗:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '刪除首頁廣告區塊失敗',
    }
  }
}

/**
 * 向上移動區塊（後台）
 * 與前一個區塊交換 sort_order
 */
export async function moveBlockUp(blockId: string): Promise<ActionResult<void>> {
  try {
    await checkAuth('admin')

    const supabase = await createClient()

    // 取得當前區塊
    const { data: currentBlock, error: fetchError } = await supabase
      .from('home_page_blocks')
      .select('*')
      .eq('id', blockId)
      .single()

    if (fetchError) throw fetchError

    // 找到前一個區塊
    const { data: previousBlock, error: prevError } = await supabase
      .from('home_page_blocks')
      .select('*')
      .lt('sort_order', currentBlock.sort_order)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    if (prevError || !previousBlock) {
      return {
        success: false,
        message: '已經是第一個區塊，無法向上移動',
      }
    }

    // 交換 sort_order
    const { error: update1Error } = await supabase
      .from('home_page_blocks')
      .update({ sort_order: previousBlock.sort_order })
      .eq('id', currentBlock.id)

    const { error: update2Error } = await supabase
      .from('home_page_blocks')
      .update({ sort_order: currentBlock.sort_order })
      .eq('id', previousBlock.id)

    if (update1Error || update2Error) throw update1Error || update2Error

    revalidatePath('/store/home')
    revalidatePath('/admin/announcements')

    return {
      success: true,
      message: '區塊已向上移動',
    }
  } catch (error) {
    console.error('向上移動區塊失敗:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '向上移動區塊失敗',
    }
  }
}

/**
 * 向下移動區塊（後台）
 * 與下一個區塊交換 sort_order
 */
export async function moveBlockDown(blockId: string): Promise<ActionResult<void>> {
  try {
    await checkAuth('admin')

    const supabase = await createClient()

    // 取得當前區塊
    const { data: currentBlock, error: fetchError } = await supabase
      .from('home_page_blocks')
      .select('*')
      .eq('id', blockId)
      .single()

    if (fetchError) throw fetchError

    // 找到下一個區塊
    const { data: nextBlock, error: nextError } = await supabase
      .from('home_page_blocks')
      .select('*')
      .gt('sort_order', currentBlock.sort_order)
      .order('sort_order', { ascending: true })
      .limit(1)
      .single()

    if (nextError || !nextBlock) {
      return {
        success: false,
        message: '已經是最後一個區塊，無法向下移動',
      }
    }

    // 交換 sort_order
    const { error: update1Error } = await supabase
      .from('home_page_blocks')
      .update({ sort_order: nextBlock.sort_order })
      .eq('id', currentBlock.id)

    const { error: update2Error } = await supabase
      .from('home_page_blocks')
      .update({ sort_order: currentBlock.sort_order })
      .eq('id', nextBlock.id)

    if (update1Error || update2Error) throw update1Error || update2Error

    revalidatePath('/store/home')
    revalidatePath('/admin/announcements')

    return {
      success: true,
      message: '區塊已向下移動',
    }
  } catch (error) {
    console.error('向下移動區塊失敗:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '向下移動區塊失敗',
    }
  }
}

/**
 * 依商品展示區塊配置查詢商品（Phase 5 使用）
 * 使用 AND 邏輯過濾系列與標籤
 * 需傳入 tierId 以查詢等級價格
 */
export async function getProductsByBlockConfig(
  config: ProductDisplayConfig,
  tierId: string | null
): Promise<ActionResult<unknown[]>> {
  try {
    const supabase = await createClient()

    // 查詢商品並 JOIN 等級價格
    let query = supabase
      .from('products')
      .select(`
        *,
        series:series_id(name, color),
        tier_prices!inner(price)
      `)
      .eq('status', 'active')

    // 若有 tier_id，查詢該等級價格
    if (tierId) {
      query = query.eq('tier_prices.tier_id', tierId)
    }

    // 篩選系列（AND 邏輯）
    if (config.series_ids && config.series_ids.length > 0) {
      query = query.in('series_id', config.series_ids)
    }

    // 篩選標籤（AND 邏輯）- 使用 Supabase 陣列 contains 操作
    if (config.tag_ids && config.tag_ids.length > 0) {
      // 使用 contains 檢查 tags 陣列是否包含所有 tag_ids（AND 邏輯）
      for (const tagId of config.tag_ids) {
        query = query.contains('tags', [tagId])
      }
    }

    // 限制數量
    const maxItems = config.max_items ?? 50
    query = query.limit(maxItems)

    const { data, error } = await query

    if (error) throw error

    // 轉換為 ProductWithPrice 格式
    const products = (data || []).map((item: any) => {
      const tierPrice = item.tier_prices?.[0]?.price ?? null
      return {
        ...item,
        user_price: tierPrice,
        series_name: item.series?.name || null,
        series_color: item.series?.color || null,
      }
    })

    return {
      success: true,
      data: products,
    }
  } catch (error) {
    console.error('查詢商品失敗:', error)
    return {
      success: false,
      message: '查詢商品失敗',
    }
  }
}
