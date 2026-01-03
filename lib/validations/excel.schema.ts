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
