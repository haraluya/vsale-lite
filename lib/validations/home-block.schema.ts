import { z } from 'zod'

// ===================================
// 首頁廣告區塊 Zod Schemas (Feature 016)
// ===================================

// 圖片輪播 Config Schema
export const ImageCarouselConfigSchema = z.object({
  images: z
    .array(
      z.object({
        url: z.string().url('圖片 URL 格式不正確'),
        series_id: z.string().uuid('系列 ID 格式不正確').nullable().optional(),
      })
    )
    .min(1, '至少需要 1 張圖片')
    .max(5, '最多只能上傳 5 張圖片'),
  auto_play: z.boolean().default(true),
  interval_ms: z.number().int().min(1000, '輪播間隔最少 1000 毫秒（1 秒）').default(5000),
})

// 商品展示 Config Schema
export const ProductDisplayConfigSchema = z.object({
  series_ids: z.array(z.string().uuid('系列 ID 格式不正確')).nullable().optional(),
  tag_ids: z.array(z.string().uuid('標籤 ID 格式不正確')).nullable().optional(),
  max_items: z.number().int().min(1, '最少顯示 1 個商品').max(50, '最多顯示 50 個商品').nullable().optional().default(50),
})

// 文字區塊 Config Schema
export const TextBlockConfigSchema = z.object({
  content: z.string().min(1, '文字內容不可為空').max(1000, '文字內容最多 1000 字元'),
  font_size: z.enum(['12', '16', '20', '24', '32', '40', '48'], {
    message: '字體大小必須為 12, 16, 20, 24, 32, 40, 48 之一',
  }),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '顏色必須為 Hex 格式（如 #FF0000）'),
})

// 首頁廣告區塊 Config 聯合型別（使用 discriminated union）
export const HomeBlockConfigSchema = z.discriminatedUnion('block_type', [
  z.object({
    block_type: z.literal('image_carousel'),
    config: ImageCarouselConfigSchema,
  }),
  z.object({
    block_type: z.literal('product_display'),
    config: ProductDisplayConfigSchema,
  }),
  z.object({
    block_type: z.literal('text_block'),
    config: TextBlockConfigSchema,
  }),
])

// 建立區塊 Schema
export const CreateHomeBlockSchema = z.object({
  name: z.string().min(1, '區塊名稱不可為空').max(100, '區塊名稱最多 100 字元'),
  block_type: z.enum(['image_carousel', 'product_display', 'text_block'], {
    message: '區塊類型必須為 image_carousel, product_display, text_block 之一',
  }),
  config: z.union([ImageCarouselConfigSchema, ProductDisplayConfigSchema, TextBlockConfigSchema]),
  is_active: z.boolean().default(true),
})

// 更新區塊 Schema
export const UpdateHomeBlockSchema = z.object({
  id: z.string().uuid('區塊 ID 格式不正確'),
  name: z.string().min(1, '區塊名稱不可為空').max(100, '區塊名稱最多 100 字元').optional(),
  block_type: z.enum(['image_carousel', 'product_display', 'text_block']).optional(),
  config: z.union([ImageCarouselConfigSchema, ProductDisplayConfigSchema, TextBlockConfigSchema]).optional(),
  is_active: z.boolean().optional(),
})

// ===================================
// JSONB Config 預設值與 NULL 處理
// ===================================

/**
 * JSONB Config 預設值文件：
 *
 * 1. ImageCarouselConfig:
 *    - auto_play: 預設 true（自動播放）
 *    - interval_ms: 預設 5000（5 秒輪播）
 *    - images[].series_id: 可選（nullable），不提供則圖片不可點擊
 *
 * 2. ProductDisplayConfig:
 *    - series_ids: 可選（nullable），不提供則不篩選系列
 *    - tag_ids: 可選（nullable），不提供則不篩選標籤
 *    - max_items: 預設 50（最多顯示 50 個商品）
 *
 * 3. TextBlockConfig:
 *    - content: 必填（不可為空）
 *    - font_size: 必填（無預設值，需明確指定）
 *    - color: 必填（無預設值，需明確指定）
 *
 * NULL 處理邏輯：
 * - series_ids/tag_ids 為 null 或 undefined 時，視為「不篩選」
 * - max_items 為 null 或 undefined 時，使用預設值 50
 * - series_id 為 null 時，圖片不可點擊（純展示）
 */
