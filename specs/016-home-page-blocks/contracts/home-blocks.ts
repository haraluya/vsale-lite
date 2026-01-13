/**
 * API Contract: Home Page Blocks Server Actions
 * Feature: 016-home-page-blocks
 * Date: 2026-01-13
 *
 * 本檔案定義首頁廣告區塊系統的所有 Server Actions API 合約
 */

import type { ActionResult, HomePageBlock, ProductWithPrice } from '@/types'

// ==================== Config Types ====================

export interface ImageCarouselConfig {
  images: Array<{
    url: string
    series_id?: string | null
  }>
  auto_play: boolean
  interval_ms: number
}

export interface ProductDisplayConfig {
  series_ids?: string[] | null
  tag_ids?: string[] | null
  max_items?: number | null
}

export interface TextBlockConfig {
  content: string
  font_size: '12' | '16' | '20' | '24' | '32' | '40' | '48'
  color: string
}

// ==================== Input Types ====================

export interface CreateHomeBlockInput {
  name: string
  blockType: 'image_carousel' | 'product_display' | 'text_block'
  config: ImageCarouselConfig | ProductDisplayConfig | TextBlockConfig
  sortOrder?: number
  isActive?: boolean
}

export interface UpdateHomeBlockInput {
  blockId: string
  name?: string
  config?: ImageCarouselConfig | ProductDisplayConfig | TextBlockConfig
  isActive?: boolean
}

// ==================== Server Actions ====================

/**
 * 查詢啟用的區塊（前台）
 * @returns 啟用的區塊列表（依 sort_order 升序排序）
 *
 * 行為規範：
 * - 僅返回 is_active = true 的區塊
 * - 依 sort_order 升序排序
 * - RLS Policy 確保客戶端無法查詢停用區塊
 *
 * 範例：
 * ```typescript
 * const result = await getActiveHomeBlocks()
 * if (result.success) {
 *   result.data.forEach(block => {
 *     // 依 block_type 渲染對應元件
 *   })
 * }
 * ```
 */
export async function getActiveHomeBlocks(): Promise<ActionResult<HomePageBlock[]>>

/**
 * 查詢所有區塊（管理端）
 * @returns 所有區塊列表（含停用）
 *
 * 權限：需要 checkAuth('admin')
 *
 * 行為規範：
 * - 返回所有區塊（包含停用）
 * - 依 sort_order 升序排序
 * - 僅管理員可呼叫
 */
export async function getAllHomeBlocks(): Promise<ActionResult<HomePageBlock[]>>

/**
 * 建立區塊（管理端）
 * @param input 區塊建立資料
 * @returns 建立的區塊
 *
 * 權限：需要 checkAuth('admin')
 *
 * 行為規範：
 * - Zod Schema 驗證 config 結構（依 blockType 不同）
 * - 預設 sortOrder 為當前最大值 + 1
 * - 預設 isActive 為 true
 * - 建立成功後 revalidatePath('/store/home') 更新快取
 *
 * 範例：
 * ```typescript
 * const result = await createHomeBlock({
 *   name: '首頁主視覺輪播',
 *   blockType: 'image_carousel',
 *   config: {
 *     images: [{ url: 'https://...', series_id: 'xxx' }],
 *     auto_play: true,
 *     interval_ms: 5000,
 *   },
 * })
 * ```
 */
export async function createHomeBlock(
  input: CreateHomeBlockInput
): Promise<ActionResult<HomePageBlock>>

/**
 * 更新區塊（管理端）
 * @param input 區塊更新資料
 * @returns 更新的區塊
 *
 * 權限：需要 checkAuth('admin')
 *
 * 行為規範：
 * - 僅更新提供的欄位（partial update）
 * - 若更新 config，需驗證與 block_type 一致
 * - 更新成功後 revalidatePath('/store/home') + revalidatePath('/admin/announcements')
 *
 * 範例：
 * ```typescript
 * const result = await updateHomeBlock({
 *   blockId: 'xxx',
 *   name: '新的區塊名稱',
 *   isActive: false,
 * })
 * ```
 */
export async function updateHomeBlock(
  input: UpdateHomeBlockInput
): Promise<ActionResult<HomePageBlock>>

/**
 * 刪除區塊（管理端）
 * @param blockId 區塊 ID
 * @returns 成功或失敗
 *
 * 權限：需要 checkAuth('admin')
 *
 * 行為規範：
 * - 刪除區塊記錄前，先查詢 block_type 和 config
 * - 若為 image_carousel 類型，批次刪除所有圖片檔案
 * - 圖片刪除失敗時記錄警告但不阻斷主流程（容錯設計）
 * - 刪除成功後 revalidatePath('/store/home') + revalidatePath('/admin/announcements')
 *
 * 圖片清理範例：
 * ```typescript
 * // 刪除整個區塊目錄
 * await supabase.storage
 *   .from('products')
 *   .remove([`home-page-blocks/${blockId}/`])
 * ```
 */
export async function deleteHomeBlock(blockId: string): Promise<ActionResult<void>>

/**
 * 上移區塊（管理端）
 * @param blockId 區塊 ID
 * @returns 成功或失敗
 *
 * 權限：需要 checkAuth('admin')
 *
 * 行為規範：
 * - 查詢當前區塊和上一個區塊（依 sort_order 排序）
 * - 交換兩個區塊的 sort_order 值
 * - 若當前區塊已是第一個，返回錯誤訊息
 * - 更新成功後 revalidatePath('/admin/announcements')
 *
 * 範例：
 * ```typescript
 * const result = await moveBlockUp('block-id')
 * if (!result.success) {
 *   toast.error(result.message) // "已是第一個區塊"
 * }
 * ```
 */
export async function moveBlockUp(blockId: string): Promise<ActionResult<void>>

/**
 * 下移區塊（管理端）
 * @param blockId 區塊 ID
 * @returns 成功或失敗
 *
 * 權限：需要 checkAuth('admin')
 *
 * 行為規範：
 * - 查詢當前區塊和下一個區塊（依 sort_order 排序）
 * - 交換兩個區塊的 sort_order 值
 * - 若當前區塊已是最後一個，返回錯誤訊息
 * - 更新成功後 revalidatePath('/admin/announcements')
 */
export async function moveBlockDown(blockId: string): Promise<ActionResult<void>>

/**
 * 上傳區塊圖片（管理端）
 * @param blockId 區塊 ID
 * @param index 圖片索引（0-4）
 * @param file 圖片檔案
 * @returns 圖片公開 URL
 *
 * 權限：需要 checkAuth('admin')
 *
 * 行為規範：
 * - 檢查檔案格式（JPG/PNG/WebP）、大小（5MB）
 * - 儲存路徑: home-page-blocks/{blockId}/image-{index}.{ext}
 * - 上傳前先刪除所有可能的舊圖片（.jpg / .png / .webp）
 * - 上傳成功後返回公開 URL
 * - 更新區塊 config.images[index].url 欄位
 * - 更新成功後 revalidatePath('/admin/announcements')
 *
 * 範例：
 * ```typescript
 * const file = new File([...], 'image.jpg', { type: 'image/jpeg' })
 * const result = await uploadBlockImage('block-id', 0, file)
 * if (result.success) {
 *   console.log(result.data) // https://xxx.supabase.co/.../image-0.jpg
 * }
 * ```
 */
export async function uploadBlockImage(
  blockId: string,
  index: number,
  file: File
): Promise<ActionResult<string>>

/**
 * 查詢商品展示區塊的商品列表（含等級價格）
 * @param config 商品展示區塊配置
 * @returns 商品列表（含等級價格）
 *
 * 行為規範：
 * - 查詢條件: series_ids + tag_ids (AND 邏輯)
 * - 限制數量: max_items 或預設 50
 * - 整合等級價格查詢（依當前用戶等級）
 * - 未設定價格的商品仍返回，但 price 為 null
 *
 * 查詢邏輯：
 * ```sql
 * SELECT * FROM products
 * WHERE series_id = ANY(series_ids)
 *   AND EXISTS (
 *     SELECT 1 FROM product_tags
 *     WHERE product_id = products.id
 *       AND tag_id = ANY(tag_ids)
 *   )
 * LIMIT max_items;
 * ```
 *
 * 範例：
 * ```typescript
 * const result = await getProductsByBlockConfig({
 *   series_ids: ['series-1-id'],
 *   tag_ids: ['tag-1-id', 'tag-2-id'],
 *   max_items: 12,
 * })
 * if (result.success) {
 *   result.data.forEach(product => {
 *     console.log(product.name, product.price) // 價格已依用戶等級查詢
 *   })
 * }
 * ```
 */
export async function getProductsByBlockConfig(
  config: ProductDisplayConfig
): Promise<ActionResult<ProductWithPrice[]>>
