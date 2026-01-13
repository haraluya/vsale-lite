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
import { deleteBlockImages } from '@/lib/utils/block-image-cleanup'
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

    // 檢查 block_type 是否變更（用於圖片清理）
    if (validated.block_type !== undefined) {
      const { data: oldBlock } = await supabase
        .from('home_page_blocks')
        .select('block_type')
        .eq('id', validated.id)
        .single()

      // 若從 image_carousel 變更為其他類型，刪除所有圖片
      if (oldBlock && oldBlock.block_type === 'image_carousel' && validated.block_type !== 'image_carousel') {
        await deleteBlockImages(validated.id, 'change_type')
      }
    }

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
 * 自動清理 Supabase Storage 中的所有圖片
 */
export async function deleteHomeBlock(blockId: string): Promise<ActionResult<void>> {
  try {
    await checkAuth('admin')

    const supabase = await createClient()

    // 先刪除圖片（容錯機制，不阻斷主流程）
    await deleteBlockImages(blockId, 'delete_block')

    // 刪除資料庫記錄
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

    // 查詢商品（先查詢商品，再查詢等級價格）
    let query = supabase
      .from('products')
      .select(`
        *,
        series:series_id(name, color)
      `)
      .eq('status', 'active')

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

    const { data: products, error } = await query

    if (error) throw error

    // 如果沒有商品，直接回傳空陣列
    if (!products || products.length === 0) {
      return {
        success: true,
        data: [],
      }
    }

    // 查詢等級價格（批次查詢）
    const productIds = products.map((p) => p.id)
    let pricesQuery = supabase
      .from('tier_prices')
      .select('product_id, price')
      .in('product_id', productIds)

    // 若有 tier_id，只查詢該等級價格
    if (tierId) {
      pricesQuery = pricesQuery.eq('tier_id', tierId)
    }

    const { data: tierPrices, error: priceError } = await pricesQuery

    if (priceError) throw priceError

    // 建立價格對照表
    const priceMap = new Map<string, number>()
    if (tierPrices) {
      tierPrices.forEach((tp: any) => {
        priceMap.set(tp.product_id, tp.price)
      })
    }

    // 轉換為 ProductWithPrice 格式
    const productsWithPrice = products.map((item: any) => {
      const tierPrice = priceMap.get(item.id) ?? null
      return {
        ...item,
        user_price: tierPrice,
        series_name: item.series?.name || null,
        series_color: item.series?.color || null,
      }
    })

    return {
      success: true,
      data: productsWithPrice,
    }
  } catch (error) {
    console.error('查詢商品失敗:', error)
    return {
      success: false,
      message: '查詢商品失敗',
    }
  }
}

// ===================================
// 圖片上傳 Server Action (Phase 7)
// ===================================

/**
 * 上傳區塊圖片到 Supabase Storage
 * @param blockId 區塊 ID
 * @param index 圖片索引（0-4）
 * @param file 圖片檔案
 * @returns 公開 URL
 */
export async function uploadBlockImage(
  blockId: string,
  index: number,
  file: File
): Promise<ActionResult<{ url: string }>> {
  try {
    await checkAuth('admin')

    // 1. 檔案驗證
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        message: '僅支援 JPG、PNG、WebP 格式',
      }
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return {
        success: false,
        message: '檔案大小不可超過 5MB',
      }
    }

    const supabase = await createClient()

    // 2. 刪除舊圖片（所有可能的副檔名）
    const extensions = ['jpg', 'png', 'webp']
    const deletePromises = extensions.map((ext) => {
      const oldPath = `home-page-blocks/${blockId}/image-${index}.${ext}`
      return supabase.storage.from('products').remove([oldPath])
    })

    // 執行所有刪除操作（不關心是否成功，因為檔案可能不存在）
    await Promise.allSettled(deletePromises)

    // 3. 上傳新圖片
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `image-${index}.${fileExt}`
    const filePath = `home-page-blocks/${blockId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file, {
        upsert: true, // 覆寫模式
        contentType: file.type,
      })

    if (uploadError) {
      console.error('上傳圖片失敗:', uploadError)
      return {
        success: false,
        message: `上傳失敗: ${uploadError.message}`,
      }
    }

    // 4. 取得公開 URL
    const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(filePath)

    return {
      success: true,
      data: { url: publicUrlData.publicUrl },
      message: '圖片上傳成功',
    }
  } catch (error) {
    console.error('上傳區塊圖片失敗:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '上傳區塊圖片失敗',
    }
  }
}
