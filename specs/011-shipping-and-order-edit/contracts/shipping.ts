/**
 * Feature 011: 運費設定與訂單修改系統 - 運費相關 API 合約
 *
 * 本檔案定義運費計算與設定相關的 Server Actions 合約。
 *
 * @module shipping
 */

import type { ActionResult } from '@/types';

// ===================================
// 型別定義
// ===================================

/**
 * 運費計算結果
 */
export interface ShippingFeeResult {
  /** 運費金額 */
  shippingFee: number;
  /** 是否免運 */
  isFreeShipping: boolean;
  /** 免運門檻（若有） */
  freeShippingThreshold?: number;
  /** 是否因滿額而免運 */
  isFreeByThreshold?: boolean;
}

// ===================================
// Server Actions
// ===================================

/**
 * 計算運費
 *
 * 依據用戶的會員等級設定，計算訂單的運費金額。
 *
 * **計算邏輯**:
 * 1. 查詢用戶的會員等級
 * 2. 取得等級的運費設定（shipping_fee, free_shipping_threshold）
 * 3. 判斷是否免運：
 *    - 若 shipping_fee = 0 → 免運
 *    - 若有免運門檻且 subtotal >= threshold → 免運
 *    - 否則收取 shipping_fee
 *
 * **優惠券互動**:
 * - 免運門檻判定使用**原始商品金額**（subtotal），不扣除優惠券折扣
 * - 範例：商品 1200 元使用 500 元優惠券，折扣後 700 元。
 *   若免運門檻為 1000 元，依然免運（因原始金額 1200 >= 1000）
 *
 * @param userId - 使用者 ID
 * @param subtotal - 商品小計（不含優惠券折扣）
 * @returns ActionResult<ShippingFeeResult>
 *
 * @example
 * ```typescript
 * // 零售客戶（運費 100 元，滿 1000 免運）
 * const result = await calculateShippingFee('user-123', 800);
 * // result.data.shippingFee = 100, isFreeShipping = false
 *
 * const result2 = await calculateShippingFee('user-123', 1200);
 * // result2.data.shippingFee = 0, isFreeShipping = true, isFreeByThreshold = true
 *
 * // 批發客戶（完全免運）
 * const result3 = await calculateShippingFee('user-456', 500);
 * // result3.data.shippingFee = 0, isFreeShipping = true
 * ```
 */
export async function calculateShippingFee(
  userId: string,
  subtotal: number
): Promise<ActionResult<ShippingFeeResult>>;

/**
 * 更新訂單運費
 *
 * 管理員可手動調整個別訂單的運費金額。
 *
 * **權限要求**: 僅管理員（role = 'admin'）可執行
 *
 * **狀態限制**: 僅 `pending` 狀態訂單可修改運費
 *
 * **總金額更新**:
 * - 修改運費後會自動重新計算訂單總金額
 * - 總金額 = 商品合計 - 優惠券折扣 + **新運費** + 自訂費用
 *
 * **歷程記錄**:
 * - 會記錄於 `order_timelines` 表（action_type = 'order_modified'）
 * - modifications JSONB 包含舊運費與新運費
 *
 * @param orderId - 訂單 ID
 * @param newFee - 新的運費金額（必須 >= 0）
 * @returns ActionResult<void>
 *
 * @example
 * ```typescript
 * // 將訂單運費改為免運
 * const result = await updateShippingFee('order-123', 0);
 *
 * // 調整運費為 150 元
 * const result2 = await updateShippingFee('order-123', 150);
 * ```
 */
export async function updateShippingFee(
  orderId: string,
  newFee: number
): Promise<ActionResult<void>>;
