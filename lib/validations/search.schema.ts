import { z } from 'zod';

/**
 * 搜尋選項 Schema
 */
export const searchOptionsSchema = z.object({
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(50),
  offset: z.number()
    .int()
    .min(0)
    .optional()
    .default(0),
  category_id: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * 搜尋商品 Schema
 */
export const searchProductsSchema = z.object({
  query: z.string()
    .max(100, '搜尋關鍵字過長'),
  options: searchOptionsSchema.optional(),
});

export type SearchOptions = z.infer<typeof searchOptionsSchema>;
export type SearchProductsInput = z.infer<typeof searchProductsSchema>;
