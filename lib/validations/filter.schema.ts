import { z } from 'zod';

/**
 * 庫存狀態類型
 */
export const stockStatusEnum = z.enum(['in_stock', 'low_stock', 'out_of_stock', 'all']);

/**
 * 商品篩選 Schema
 */
export const productFiltersSchema = z.object({
  category_ids: z.array(z.string().uuid())
    .max(10, '最多選擇 10 個類別')
    .optional(),
  tags: z.array(z.string())
    .max(5, '最多選擇 5 個標籤')
    .optional(),
  stock_status: stockStatusEnum
    .optional()
    .default('all'),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(100),
  offset: z.number()
    .int()
    .min(0)
    .optional()
    .default(0),
});

/**
 * 客戶篩選 Schema
 */
export const clientFiltersSchema = z.object({
  tier_id: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(100),
  offset: z.number()
    .int()
    .min(0)
    .optional()
    .default(0),
});

export type StockStatus = z.infer<typeof stockStatusEnum>;
export type ProductFilters = z.infer<typeof productFiltersSchema>;
export type ClientFilters = z.infer<typeof clientFiltersSchema>;
