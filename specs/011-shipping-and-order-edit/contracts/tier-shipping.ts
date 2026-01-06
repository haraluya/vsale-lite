/**
 * Feature 011: 運費設定與訂單修改系統 - 會員等級運費設定 API 合約
 *
 * 本檔案定義會員等級運費設定相關的 Server Actions 合約。
 *
 * @module tier-shipping
 */

import type { ActionResult, Tier } from '@/types';

// ===================================
// 型別定義
// ===================================

/**
 * 會員等級運費設定
 */
export interface TierShippingSettings {
  /** 基本運費（0 = 免運，NULL = 使用預設值 0） */
  shippingFee: number | null;
  /** 滿額免運門檻（NULL = 不提供免運） */
  freeShippingThreshold: number | null;
}

/**
 * 運費設定驗證結果
 */
export interface ShippingSettingsValidation {
  /** 是否有效 */
  valid: boolean;
  /** 錯誤訊息（若無效） */
  errors?: string[];
}

// ===================================
// Server Actions
// ===================================

/**
 * 更新會員等級運費設定
 *
 * 管理員可為每個會員等級設定獨立的運費規則。
 *
 * **權限要求**: 僅管理員（role = 'admin'）可執行
 *
 * **運費設定邏輯**:
 * 1. **完全免運**: `shippingFee = 0` 或 `NULL`
 *    - 該等級的所有訂單都免運費
 *    - `freeShippingThreshold` 設定無效
 *
 * 2. **固定運費**: `shippingFee > 0`, `freeShippingThreshold = NULL`
 *    - 該等級的所有訂單收取固定運費
 *    - 不提供滿額免運
 *
 * 3. **滿額免運**: `shippingFee > 0`, `freeShippingThreshold > 0`
 *    - 訂單商品金額 < 門檻 → 收取運費
 *    - 訂單商品金額 >= 門檻 → 免運
 *
 * **驗證規則**:
 * - `shippingFee` 必須 >= 0
 * - `freeShippingThreshold` 必須 > 0 或為 NULL
 * - 若設定免運門檻，`shippingFee` 必須 > 0（邏輯一致性）
 *
 * **影響範圍**:
 * - 僅影響**新建立**的訂單
 * - 現有訂單的運費不受影響（快照機制）
 *
 * @param tierId - 會員等級 ID
 * @param shippingFee - 基本運費（0 或 NULL 表示免運）
 * @param freeShippingThreshold - 滿額免運門檻（NULL 表示不提供免運）
 * @returns ActionResult<Tier> - 回傳更新後的會員等級
 *
 * @example
 * ```typescript
 * // 零售客戶：收運費 100 元，滿 1000 免運
 * const result1 = await updateTierShipping('tier-retail', 100, 1000);
 *
 * // 批發客戶：完全免運
 * const result2 = await updateTierShipping('tier-wholesale', 0, null);
 *
 * // 經銷商：固定運費 200 元（不提供滿額免運）
 * const result3 = await updateTierShipping('tier-distributor', 200, null);
 *
 * // 錯誤範例：免運但設定免運門檻（邏輯不一致）
 * const result4 = await updateTierShipping('tier-vip', 0, 1000);
 * // result4.success = false, message = '免運等級不應設定免運門檻'
 * ```
 */
export async function updateTierShipping(
  tierId: string,
  shippingFee: number | null,
  freeShippingThreshold: number | null
): Promise<ActionResult<Tier>>;

/**
 * 取得會員等級運費設定
 *
 * 查詢指定會員等級的運費設定。
 *
 * **權限要求**: 所有已登入用戶可查詢
 *
 * @param tierId - 會員等級 ID
 * @returns ActionResult<TierShippingSettings> - 回傳運費設定
 *
 * @example
 * ```typescript
 * const result = await getTierShipping('tier-retail');
 *
 * if (result.success) {
 *   const { shippingFee, freeShippingThreshold } = result.data;
 *
 *   if (shippingFee === 0) {
 *     console.log('完全免運');
 *   } else if (freeShippingThreshold) {
 *     console.log(`運費 ${shippingFee} 元，滿 ${freeShippingThreshold} 元免運`);
 *   } else {
 *     console.log(`固定運費 ${shippingFee} 元`);
 *   }
 * }
 * ```
 */
export async function getTierShipping(
  tierId: string
): Promise<ActionResult<TierShippingSettings>>;

/**
 * 批次更新多個等級的運費設定
 *
 * 管理員可一次性更新多個會員等級的運費設定。
 *
 * **權限要求**: 僅管理員（role = 'admin'）可執行
 *
 * **原子性保證**:
 * - 所有更新在單一 Transaction 中執行
 * - 若任何等級更新失敗，全部回滾
 *
 * **使用情境**:
 * - 系統初始化運費設定
 * - 批次調整運費政策
 *
 * @param settings - 多個等級的運費設定
 * @returns ActionResult<Tier[]> - 回傳更新後的等級列表
 *
 * @example
 * ```typescript
 * const settings = [
 *   { tierId: 'tier-retail', shippingFee: 100, freeShippingThreshold: 1000 },
 *   { tierId: 'tier-wholesale', shippingFee: 0, freeShippingThreshold: null },
 *   { tierId: 'tier-distributor', shippingFee: 0, freeShippingThreshold: null },
 * ];
 *
 * const result = await batchUpdateTierShipping(settings);
 * ```
 */
export async function batchUpdateTierShipping(
  settings: Array<{
    tierId: string;
    shippingFee: number | null;
    freeShippingThreshold: number | null;
  }>
): Promise<ActionResult<Tier[]>>;

// ===================================
// 輔助函式
// ===================================

/**
 * 驗證運費設定是否合法
 *
 * @param shippingFee - 基本運費
 * @param freeShippingThreshold - 滿額免運門檻
 * @returns 驗證結果
 *
 * @example
 * ```typescript
 * validateShippingSettings(100, 1000); // { valid: true }
 * validateShippingSettings(0, 1000); // { valid: false, errors: ['免運等級不應設定免運門檻'] }
 * validateShippingSettings(-50, null); // { valid: false, errors: ['運費不可為負數'] }
 * validateShippingSettings(100, -500); // { valid: false, errors: ['免運門檻必須為正數'] }
 * ```
 */
export function validateShippingSettings(
  shippingFee: number | null,
  freeShippingThreshold: number | null
): ShippingSettingsValidation;

/**
 * 計算指定等級的訂單運費（預覽功能）
 *
 * 根據會員等級設定與訂單商品金額，預覽運費計算結果。
 *
 * @param tierId - 會員等級 ID
 * @param subtotal - 商品小計
 * @returns 運費金額
 *
 * @example
 * ```typescript
 * // 零售客戶（運費 100 元，滿 1000 免運）
 * previewShippingFee('tier-retail', 800); // 100
 * previewShippingFee('tier-retail', 1200); // 0
 *
 * // 批發客戶（完全免運）
 * previewShippingFee('tier-wholesale', 500); // 0
 * ```
 */
export async function previewShippingFee(
  tierId: string,
  subtotal: number
): Promise<number>;

/**
 * 取得運費設定描述文字
 *
 * @param shippingFee - 基本運費
 * @param freeShippingThreshold - 滿額免運門檻
 * @returns 運費設定描述
 *
 * @example
 * ```typescript
 * getShippingDescription(100, 1000); // '運費 100 元，滿 1000 元免運'
 * getShippingDescription(0, null); // '免運'
 * getShippingDescription(200, null); // '固定運費 200 元'
 * ```
 */
export function getShippingDescription(
  shippingFee: number | null,
  freeShippingThreshold: number | null
): string;
