import { z } from 'zod';

/**
 * 客戶匯入單筆資料 Schema
 */
export const clientImportSchema = z.object({
  手機號碼: z.string()
    .regex(/^09\d{8}$/, '手機號碼格式錯誤 (需為 09xxxxxxxx)'),
  姓名: z.string()
    .min(1, '姓名不可為空'),
  會員等級: z.string()
    .min(1, '會員等級不可為空'),
  常用地址: z.string()
    .max(200, '常用地址最多 200 個字元')
    .optional()
    .transform(val => val || undefined), // 空字串轉為 undefined
  備註: z.string()
    .max(500, '備註最多 500 個字元')
    .optional()
    .transform(val => val || undefined), // 空字串轉為 undefined
  密碼: z.union([z.string(), z.number()]) // 接受字串或數字
    .transform(val => String(val)) // 轉換為字串
    .pipe(
      z.string()
        .min(5, '密碼至少 5 個字元')
        .regex(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/, '密碼不可包含中文字元')
    )
    .optional(),
});

/**
 * 批次匯入 Schema
 */
export const batchImportSchema = z.object({
  clients: z.array(clientImportSchema)
    .min(1, '至少需匯入 1 筆資料')
    .max(1000, '單次匯入最多 1000 筆資料'),
});

/**
 * 匯入選項 Schema
 */
export const importOptionsSchema = z.object({
  dry_run: z.boolean().optional().default(false),
  skip_errors: z.boolean().optional().default(false),
});

/**
 * 客戶匯出篩選 Schema
 */
export const clientExportFiltersSchema = z.object({
  tier_id: z.string().uuid().optional(),
  search: z.string().optional(),
  created_after: z.string().datetime().optional(),
});

export type ClientImportData = z.infer<typeof clientImportSchema>;
export type BatchImportData = z.infer<typeof batchImportSchema>;
export type ImportOptions = z.infer<typeof importOptionsSchema>;
export type ClientExportFilters = z.infer<typeof clientExportFiltersSchema>;

// ============================================================
// 系列管理匯入匯出 Schema
// ============================================================

/**
 * 系列匯入單筆資料 Schema
 */
export const seriesImportSchema = z.object({
  系列名稱: z.string().min(1, '系列名稱不可為空'),
  系列代碼: z.string()
    .min(3, '系列代碼至少 3 個字元')
    .max(10, '系列代碼最多 10 個字元')
    .regex(/^[A-Z]{3,10}$/, '系列代碼必須為 3-10 個大寫英文字母'),
  所屬分類: z.string().optional(),
  排序: z.union([z.string(), z.number()])
    .transform(val => Number(val))
    .pipe(z.number().int('排序必須為整數').min(0, '排序不可為負數'))
    .optional(),
  描述: z.string().max(500, '描述最多 500 個字元').optional(),
});

/**
 * 系列匯出篩選 Schema
 */
export const seriesExportFiltersSchema = z.object({
  category_id: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export type SeriesImportRow = z.infer<typeof seriesImportSchema>;
export type SeriesExportFilters = z.infer<typeof seriesExportFiltersSchema>;

// ============================================================
// 商品管理匯入匯出 Schema
// ============================================================

/**
 * 商品匯入單筆資料 Schema
 */
export const productImportSchema = z.object({
  商品名稱: z.string().min(1, '商品名稱不可為空'),
  所屬系列: z.string().min(1, '所屬系列不可為空'),
  零售價格: z.union([z.string(), z.number()])
    .transform(val => Number(val))
    .pipe(z.number().min(0, '零售價格不可為負數')),
  庫存數量: z.union([z.string(), z.number()])
    .transform(val => Number(val))
    .pipe(z.number().int('庫存必須為整數'))
    .optional(),
  單位: z.string().max(20, '單位最多 20 個字元').optional(),
  描述: z.string().max(1000, '描述最多 1000 個字元').optional(),
});

/**
 * 商品匯出篩選 Schema
 */
export const productExportFiltersSchema = z.object({
  series_id: z.string().uuid().optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export type ProductImportRow = z.infer<typeof productImportSchema>;
export type ProductExportFilters = z.infer<typeof productExportFiltersSchema>;
