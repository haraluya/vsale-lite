import { z } from 'zod';

/**
 * 標籤名稱 Schema
 */
export const tagNameSchema = z.string()
  .min(2, '標籤名稱至少 2 個字元')
  .max(8, '標籤名稱最多 8 個字元')
  .regex(/^[\u4e00-\u9fa5a-zA-Z0-9]+$/, '標籤僅允許中英文與數字');

/**
 * 更新商品標籤 Schema
 */
export const updateProductTagsSchema = z.object({
  product_id: z.string().uuid('商品 ID 格式錯誤'),
  tags: z.array(tagNameSchema)
    .max(5, '最多只能設定 5 個標籤'),
});

/**
 * 批次操作類型
 */
export const batchOperationEnum = z.enum(['add', 'remove']);

/**
 * 批次更新商品標籤 Schema
 */
export const batchUpdateProductTagsSchema = z.object({
  product_ids: z.array(z.string().uuid())
    .min(1, '至少需選擇 1 個商品')
    .max(100, '單次最多操作 100 個商品'),
  operation: batchOperationEnum,
  tags: z.array(tagNameSchema)
    .min(1, '至少需提供 1 個標籤'),
});

/**
 * 訂單刪除 Schema
 */
export const deleteOrderSchema = z.object({
  order_id: z.string().uuid('訂單 ID 格式錯誤'),
  reason: z.string()
    .min(5, '刪除原因至少 5 個字元')
    .max(200, '刪除原因最多 200 個字元')
    .optional(),
});

export type TagName = z.infer<typeof tagNameSchema>;
export type UpdateProductTagsInput = z.infer<typeof updateProductTagsSchema>;
export type BatchOperation = z.infer<typeof batchOperationEnum>;
export type BatchUpdateProductTagsInput = z.infer<typeof batchUpdateProductTagsSchema>;
export type DeleteOrderInput = z.infer<typeof deleteOrderSchema>;
