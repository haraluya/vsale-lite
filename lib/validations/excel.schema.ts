import { z } from 'zod';

/**
 * 客戶匯入單筆資料 Schema
 */
export const clientImportSchema = z.object({
  手機號碼: z.string()
    .regex(/^09\d{8}$/, '手機號碼格式錯誤 (需為 09xxxxxxxx)'),
  姓名: z.string()
    .min(2, '姓名至少 2 個字元')
    .max(50, '姓名最多 50 個字元'),
  會員等級: z.string()
    .min(1, '會員等級不可為空'),
  密碼: z.string()
    .min(6, '密碼至少 6 個字元')
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
