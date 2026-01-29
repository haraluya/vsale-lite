// =====================================================
// Zod Validation Schema: 組合優惠系統
// Feature: 021-combo-deals
// Created: 2026-01-29
// =====================================================

import { z } from 'zod';

// -----------------------------------------------------
// 組合優惠表單 Schema
// -----------------------------------------------------

export const comboDealSchema = z
  .object({
    name: z
      .string()
      .min(1, '請輸入優惠名稱')
      .max(100, '優惠名稱不得超過 100 字元'),

    poster_url: z.string().url('請上傳海報圖片'),

    combo_mode: z.enum(['each', 'mix_match'], {
      required_error: '請選擇組合模式',
    }),

    discount_type: z.enum(['fixed', 'percentage'], {
      required_error: '請選擇折扣方式',
    }),

    discount_value: z.number().positive('折扣值必須大於 0'),

    start_date: z.date({
      required_error: '請選擇活動開始日期',
    }),

    end_date: z.date({
      required_error: '請選擇活動結束日期',
    }),

    series: z
      .array(
        z.object({
          series_id: z.string().uuid('系列 ID 格式錯誤'),
          required_quantity: z.number().int().positive().optional(),
          display_order: z.number().int(),
        })
      )
      .min(1, '請至少選擇一個系列')
      .max(5, '最多選擇 5 個系列'),

    tier_ids: z.array(z.string().uuid('等級 ID 格式錯誤')).min(1, '請至少選擇一個等級'),

    mix_match_total_quantity: z.number().int().positive().optional(),

    display_order: z.number().int().optional().nullable(),
  })
  // 驗證：結束日期必須晚於開始日期
  .refine((data) => data.end_date > data.start_date, {
    message: '結束日期不得早於開始日期',
    path: ['end_date'],
  })
  // 驗證：各選模式 - 所有系列必須填寫數量
  .refine(
    (data) => {
      if (data.combo_mode === 'each') {
        return data.series.every((s) => s.required_quantity != null && s.required_quantity > 0);
      }
      return true;
    },
    {
      message: '請為每個系列設定數量（各選模式）',
      path: ['series'],
    }
  )
  // 驗證：任選模式 - 必須填寫總數量
  .refine(
    (data) => {
      if (data.combo_mode === 'mix_match') {
        return data.mix_match_total_quantity != null && data.mix_match_total_quantity > 0;
      }
      return true;
    },
    {
      message: '請設定任選總數量',
      path: ['mix_match_total_quantity'],
    }
  )
  // 驗證：折扣值範圍
  .refine(
    (data) => {
      if (data.discount_type === 'percentage') {
        return data.discount_value >= 1 && data.discount_value <= 99;
      }
      return data.discount_value <= 100000;
    },
    {
      message: '百分比折扣必須在 1-99 之間，固定折價不得超過 100000',
      path: ['discount_value'],
    }
  );

export type ComboDealFormData = z.infer<typeof comboDealSchema>;

// -----------------------------------------------------
// 商品選擇驗證 Schema
// -----------------------------------------------------

export const selectedProductSchema = z.object({
  product_id: z.string().uuid('商品 ID 格式錯誤'),
  series_id: z.string().uuid('系列 ID 格式錯誤'),
  quantity: z.number().int().positive('數量必須為正整數'),
});

export type SelectedProductData = z.infer<typeof selectedProductSchema>;

// -----------------------------------------------------
// 組合優惠篩選 Schema
// -----------------------------------------------------

export const comboDealListFiltersSchema = z.object({
  status: z.enum(['active', 'inactive', 'ended']).optional(),
  tier_id: z.string().uuid().optional(),
  search: z.string().optional(),
});

export type ComboDealListFiltersData = z.infer<typeof comboDealListFiltersSchema>;

// -----------------------------------------------------
// 加入購物車驗證 Schema
// -----------------------------------------------------

export const addComboDealToCartSchema = z.object({
  combo_deal_id: z.string().uuid('組合優惠 ID 格式錯誤'),
  selected_products: z.array(selectedProductSchema).min(1, '請至少選擇一個商品'),
});

export type AddComboDealToCartData = z.infer<typeof addComboDealToCartSchema>;
