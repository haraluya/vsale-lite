/**
 * Feature 011: 運費設定與訂單修改系統 - 訂單狀態相關 API 合約
 *
 * 本檔案定義訂單狀態流程相關的 Server Actions 合約。
 *
 * **重要變更**: 移除 `confirmed` 狀態，簡化訂單流程
 *
 * **新的狀態流程**:
 * ```
 * pending (待確認) → shipping (出貨中) → completed (已完成)
 *        ↓                   ↓
 *    cancelled          cancelled
 * ```
 *
 * **庫存扣減時機**:
 * - 舊邏輯: 確認訂單（confirmed）時扣減
 * - 新邏輯: 標記出貨（shipping）時扣減
 *
 * @module order-status
 */

import type { ActionResult, Order, OrderStatus } from '@/types';

// ===================================
// 型別定義
// ===================================

/**
 * 訂單狀態（移除 confirmed）
 *
 * @deprecated 'confirmed' 狀態已移除，請使用 'shipping' 代替
 */
export type OrderStatusNew = 'pending' | 'shipping' | 'completed' | 'cancelled';

// ===================================
// Server Actions
// ===================================

/**
 * 標記訂單為出貨中（取代 confirmOrder）
 *
 * 管理員標記訂單為出貨中，並扣減商品庫存。
 *
 * **權限要求**: 僅管理員（role = 'admin'）可執行
 *
 * **狀態限制**: 僅 `pending` 狀態訂單可標記出貨
 *
 * **庫存處理**:
 * - 扣減所有訂單商品的庫存（原子性操作）
 * - 支援負庫存（不檢查 stock > 0）
 * - 使用 PostgreSQL `FOR UPDATE` 鎖定，避免併發問題
 *
 * **原子性保證**:
 * - 所有操作在單一 Transaction 中執行
 * - 若任何步驟失敗，自動 ROLLBACK 並回傳錯誤
 *
 * **歷程記錄**:
 * - 記錄於 `order_timelines` 表（action_type = 'status_changed'）
 * - old_status = 'pending', new_status = 'shipping'
 *
 * **取代關係**:
 * - 本函數取代 Feature 004 的 `confirmOrder()`
 * - 舊函數將在 Migration 中刪除
 *
 * @param orderId - 訂單 ID
 * @returns ActionResult<Order> - 回傳更新後的訂單
 *
 * @example
 * ```typescript
 * // 標記訂單為出貨中（扣減庫存）
 * const result = await markAsShipping('order-123');
 *
 * if (result.success) {
 *   console.log('訂單已標記為出貨中，庫存已扣減');
 * } else {
 *   console.error(result.message);
 *   // 可能的錯誤：「訂單不存在」、「僅待確認訂單可標記出貨」
 * }
 * ```
 */
export async function markAsShipping(
  orderId: string
): Promise<ActionResult<Order>>;

/**
 * 更新訂單狀態
 *
 * 管理員可更新訂單狀態（簡化版，移除 confirmed 相關邏輯）。
 *
 * **權限要求**: 僅管理員（role = 'admin'）可執行
 *
 * **允許的狀態轉換**:
 * - `shipping` → `completed`: 標記訂單為已完成
 * - `pending` → `cancelled`: 取消待確認訂單（不涉及庫存）
 * - `shipping` → `cancelled`: 取消出貨中訂單（回補庫存）
 *
 * **禁止的狀態轉換**:
 * - `pending` → `shipping`: 必須使用 `markAsShipping()` 函數（確保庫存扣減）
 * - `completed` / `cancelled` → 任何狀態: 已完成/已取消訂單不可變更
 *
 * **庫存處理**:
 * - `shipping` → `cancelled`: 自動回補庫存（原子性操作）
 * - 其他狀態轉換: 不涉及庫存
 *
 * **歷程記錄**:
 * - 記錄於 `order_timelines` 表（action_type = 'status_changed'）
 *
 * @param orderId - 訂單 ID
 * @param newStatus - 新狀態（'shipping', 'completed', 'cancelled'）
 * @returns ActionResult<Order> - 回傳更新後的訂單
 *
 * @example
 * ```typescript
 * // 標記出貨中訂單為已完成
 * const result1 = await updateOrderStatus('order-123', 'completed');
 *
 * // 取消待確認訂單
 * const result2 = await updateOrderStatus('order-456', 'cancelled');
 *
 * // 取消出貨中訂單（會回補庫存）
 * const result3 = await updateOrderStatus('order-789', 'cancelled');
 * ```
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: 'shipping' | 'completed' | 'cancelled'
): Promise<ActionResult<Order>>;

/**
 * 取消訂單
 *
 * 管理員可取消訂單，並根據訂單狀態決定是否回補庫存。
 *
 * **權限要求**: 僅管理員（role = 'admin'）可執行
 *
 * **狀態限制**:
 * - `pending`: ✅ 可取消（不涉及庫存）
 * - `shipping`: ✅ 可取消（回補庫存）
 * - `completed`: ❌ 不可取消（已完成訂單不可變更）
 * - `cancelled`: ❌ 不可取消（已取消訂單不可重複取消）
 *
 * **庫存處理**:
 * - `pending` 取消: 不涉及庫存回補（尚未扣減）
 * - `shipping` 取消: 回補庫存（已扣減的部分）
 *
 * **原子性保證**:
 * - 所有操作在單一 Transaction 中執行
 * - 若庫存回補失敗，訂單狀態不會變更
 *
 * **取消原因記錄**:
 * - 記錄於 `order_timelines` 表（action_type = 'cancelled'）
 * - content 欄位儲存取消原因
 *
 * @param orderId - 訂單 ID
 * @param reason - 取消原因（必填）
 * @returns ActionResult<Order> - 回傳更新後的訂單
 *
 * @example
 * ```typescript
 * // 取消訂單並說明原因
 * const result = await cancelOrder('order-123', '客戶要求取消訂單');
 *
 * if (result.success) {
 *   console.log('訂單已取消');
 *   if (result.data.status === 'shipping') {
 *     console.log('庫存已回補');
 *   }
 * }
 * ```
 */
export async function cancelOrder(
  orderId: string,
  reason: string
): Promise<ActionResult<Order>>;

// ===================================
// 輔助函式
// ===================================

/**
 * 檢查訂單狀態轉換是否合法
 *
 * @param currentStatus - 當前狀態
 * @param newStatus - 新狀態
 * @returns 是否允許轉換
 *
 * @example
 * ```typescript
 * isValidStatusTransition('pending', 'shipping'); // false (必須使用 markAsShipping)
 * isValidStatusTransition('shipping', 'completed'); // true
 * isValidStatusTransition('completed', 'cancelled'); // false
 * ```
 */
export function isValidStatusTransition(
  currentStatus: OrderStatusNew,
  newStatus: OrderStatusNew
): boolean;

/**
 * 取得訂單狀態的中文標籤
 *
 * @param status - 訂單狀態
 * @returns 中文標籤
 *
 * @example
 * ```typescript
 * getOrderStatusLabel('pending'); // '待確認'
 * getOrderStatusLabel('shipping'); // '出貨中'
 * getOrderStatusLabel('completed'); // '已完成'
 * getOrderStatusLabel('cancelled'); // '已取消'
 * ```
 */
export function getOrderStatusLabel(status: OrderStatusNew): string;

/**
 * 取得訂單狀態的顏色配置
 *
 * @param status - 訂單狀態
 * @returns Tailwind CSS 顏色類別
 *
 * @example
 * ```typescript
 * getOrderStatusColor('pending'); // 'bg-yellow-500'
 * getOrderStatusColor('shipping'); // 'bg-blue-500'
 * getOrderStatusColor('completed'); // 'bg-green-500'
 * getOrderStatusColor('cancelled'); // 'bg-gray-500'
 * ```
 */
export function getOrderStatusColor(status: OrderStatusNew): string;
