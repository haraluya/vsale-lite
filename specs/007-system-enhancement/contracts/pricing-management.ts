/**
 * API Contract: 價格管理優化（選擇商品模式）
 * Feature: 007-system-enhancement
 * Date: 2026-01-03
 */

import { z } from 'zod'

// ============================================================================
// Zod Schemas (驗證規則)
// ============================================================================

/**
 * 批次設定商品價格 Schema（單一商品 × 所有等級）
 */
export const batchSetProductPricesSchema = z.object({
  product_id: z.string().uuid('商品 ID 格式錯誤'),
  prices: z.array(
    z.object({
      tier_id: z.string().uuid('等級 ID 格式錯誤'),
      amount: z.number().nonnegative('價格不可為負數').nullable(),
    })
  ),
})

// ============================================================================
// TypeScript Types (型別定義)
// ============================================================================

/**
 * 商品價格矩陣（單一商品 × 所有等級）
 */
export type ProductPriceMatrix = {
  product_id: string
  product_name: string
  product_code: string
  retail_price: number // 零售價格（唯讀）
  prices: {
    tier_id: string
    tier_name: string
    amount: number | null
    is_retail: boolean // 是否為零售等級（零售等級價格唯讀）
  }[]
}

/**
 * 批次設定價格輸入型別
 */
export type BatchSetProductPricesInput = z.infer<typeof batchSetProductPricesSchema>

// ============================================================================
// Server Actions (API 端點)
// ============================================================================

/**
 * 查詢商品價格矩陣（管理端）
 *
 * @description
 * - 僅管理員可執行
 * - 查詢單一商品 × 所有會員等級的價格矩陣
 * - 零售等級的價格來自 products.retail_price（唯讀）
 * - 其他等級的價格來自 tier_prices 表
 *
 * @param product_id - 商品 ID
 * @returns ActionResult<ProductPriceMatrix>
 *
 * @example
 * const result = await getProductPriceMatrix('xxx-xxx-xxx')
 * if (result.success) {
 *   console.log(result.data.prices)
 *   // [
 *   //   { tier_id: '...', tier_name: '零售', amount: 100, is_retail: true },
 *   //   { tier_id: '...', tier_name: '批發', amount: 80, is_retail: false },
 *   //   { tier_id: '...', tier_name: 'VIP', amount: 70, is_retail: false }
 *   // ]
 * }
 */
export async function getProductPriceMatrix(
  product_id: string
): Promise<ActionResult<ProductPriceMatrix>>

/**
 * 批次設定商品價格（管理端）
 *
 * @description
 * - 僅管理員可執行
 * - 批次設定單一商品 × 多個等級的價格
 * - **零售等級價格不可透過此 API 修改**（需至商品編輯頁修改 retail_price）
 * - 使用 UPSERT 邏輯：若價格已存在則更新，否則新增
 * - 若 amount = null，則刪除該等級的價格設定
 *
 * @param input - 批次價格資料
 * @returns ActionResult<ProductPriceMatrix>
 *
 * @example
 * const result = await batchSetProductPrices({
 *   product_id: 'xxx-xxx-xxx',
 *   prices: [
 *     { tier_id: 'batch-tier-id', amount: 80 },
 *     { tier_id: 'vip-tier-id', amount: 70 },
 *   ]
 * })
 */
export async function batchSetProductPrices(
  input: BatchSetProductPricesInput
): Promise<ActionResult<ProductPriceMatrix>>

/**
 * 查詢商品列表（用於下拉選單，管理端）
 *
 * @description
 * - 僅管理員可執行
 * - 返回所有商品的 ID、名稱、商品編號
 * - 依系列分組排序
 *
 * @returns ActionResult<{ id: string; name: string; code: string; series_name: string }[]>
 *
 * @example
 * const result = await getProductsForPricing()
 * if (result.success) {
 *   // 用於下拉選單
 *   const options = result.data.map(p => ({
 *     value: p.id,
 *     label: `${p.code} - ${p.name} (${p.series_name})`
 *   }))
 * }
 */
export async function getProductsForPricing(): Promise<
  ActionResult<
    {
      id: string
      name: string
      code: string
      series_name: string
    }[]
  >
>

// ============================================================================
// ActionResult Type (統一回傳格式)
// ============================================================================

export type ActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; errors?: Record<string, string[]>; message: string }
