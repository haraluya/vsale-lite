/**
 * Feature 011: 運費設定與訂單修改系統 - 訂單修改相關 API 合約
 *
 * 本檔案定義訂單修改相關的 Server Actions 合約。
 *
 * @module order-modifications
 */

import type { ActionResult, Order, OrderItem, OrderCustomFee } from '@/types';

// ===================================
// 型別定義
// ===================================

/**
 * 訂單修改內容
 */
export interface OrderModifications {
  /** 修改摘要 */
  summary: {
    /** 修改前總金額 */
    old_total: number;
    /** 修改後總金額 */
    new_total: number;
    /** 修改的商品數量 */
    items_changed: number;
    /** 新增的費用項目數量 */
    fees_added: number;
  };

  /** 商品修改 */
  items: Array<{
    /** 修改類型 */
    type: 'price_changed' | 'quantity_changed' | 'removed' | 'added';
    /** 訂單明細 ID（新增時無） */
    item_id?: string;
    /** 商品 ID（新增時必填） */
    product_id?: string;
    /** 商品名稱 */
    product_name: string;
    /** 舊單價（price_changed） */
    old_price?: number;
    /** 新單價（price_changed, added） */
    new_price?: number;
    /** 舊數量（quantity_changed） */
    old_quantity?: number;
    /** 新數量（quantity_changed, added） */
    new_quantity?: number;
  }>;

  /** 自訂費用修改（可選） */
  fees?: Array<{
    /** 修改類型 */
    type: 'added' | 'removed';
    /** 費用名稱 */
    fee_name: string;
    /** 金額（可為負數表示減免） */
    amount: number;
  }>;

  /** 運費修改（可選） */
  shipping?: {
    /** 舊運費 */
    old_fee: number;
    /** 新運費 */
    new_fee: number;
  } | null;

  /** 優惠券處理（可選） */
  coupon?: {
    /** 處理方式 */
    action: 'removed' | 'kept';
    /** 原因說明 */
    reason?: string;
  } | null;

  /** 總額直接調整（可選） */
  totalAdjustment?: {
    /** 調整前總金額 */
    old_total: number;
    /** 調整後總金額 */
    new_total: number;
    /** 調整差額 */
    difference: number;
  } | null;
}

/**
 * 商品明細更新項目
 */
export interface OrderItemUpdate {
  /** 訂單明細 ID */
  itemId: string;
  /** 新數量（可選） */
  quantity?: number;
  /** 新單價（可選） */
  price?: number;
}

/**
 * 新增商品項目
 */
export interface OrderItemToAdd {
  /** 商品 ID */
  productId: string;
  /** 數量 */
  quantity: number;
  /** 單價 */
  price: number;
}

// ===================================
// Server Actions
// ===================================

/**
 * 批次修改訂單
 *
 * 管理員可一次性修改訂單的商品、價格、數量、運費、自訂費用。
 *
 * **權限要求**: 僅管理員（role = 'admin'）可執行
 *
 * **狀態限制**: 僅 `pending` 狀態訂單可修改
 *
 * **原子性保證**:
 * - 所有修改在單一 PostgreSQL Transaction 中執行
 * - 任何步驟失敗會自動 ROLLBACK，不留下部分修改
 *
 * **總金額更新**:
 * - 修改後自動重新計算訂單總金額
 * - 總金額 = Σ(商品小計) - 優惠券折扣 + 運費 + Σ(自訂費用)
 *
 * **優惠券驗證**:
 * - 修改後會檢查優惠券條件（最低金額限制）
 * - 若不符合條件，回傳警告並要求管理員確認是否移除優惠券
 *
 * **歷程記錄**:
 * - 所有修改記錄於 `order_timelines` 表（action_type = 'order_modified'）
 * - modifications JSONB 包含完整的修改內容
 *
 * @param orderId - 訂單 ID
 * @param modifications - 修改內容（JSONB 格式）
 * @returns ActionResult<Order> - 回傳更新後的訂單
 *
 * @example
 * ```typescript
 * const modifications: OrderModifications = {
 *   summary: {
 *     old_total: 1200,
 *     new_total: 950,
 *     items_changed: 2,
 *     fees_added: 1,
 *   },
 *   items: [
 *     {
 *       type: 'price_changed',
 *       item_id: 'item-123',
 *       product_name: '商品 A',
 *       old_price: 50,
 *       new_price: 40,
 *     },
 *     {
 *       type: 'quantity_changed',
 *       item_id: 'item-123',
 *       product_name: '商品 A',
 *       old_quantity: 5,
 *       new_quantity: 3,
 *     },
 *   ],
 *   fees: [
 *     {
 *       type: 'added',
 *       fee_name: '手續費',
 *       amount: 50,
 *     },
 *   ],
 *   shipping: {
 *     old_fee: 100,
 *     new_fee: 0,
 *   },
 * };
 *
 * const result = await updateOrderDetails('order-123', modifications);
 * // result.data.new_total = 950
 * ```
 */
export async function updateOrderDetails(
  orderId: string,
  modifications: OrderModifications
): Promise<ActionResult<Order>>;

/**
 * 加入商品至訂單
 *
 * 管理員可在現有訂單中新增商品。
 *
 * **權限要求**: 僅管理員（role = 'admin'）可執行
 *
 * **狀態限制**: 僅 `pending` 狀態訂單可修改
 *
 * **商品驗證**:
 * - 檢查商品是否存在
 * - 檢查數量是否 > 0
 * - 檢查單價是否 > 0
 *
 * **總金額更新**:
 * - 自動重新計算訂單總金額
 *
 * **歷程記錄**:
 * - 記錄於 `order_timelines` 表
 *
 * @param orderId - 訂單 ID
 * @param productId - 商品 ID
 * @param quantity - 數量
 * @param price - 單價
 * @returns ActionResult<OrderItem> - 回傳新增的訂單明細
 *
 * @example
 * ```typescript
 * // 新增商品 B × 2，單價 30 元
 * const result = await addOrderItem('order-123', 'product-456', 2, 30);
 * // result.data.subtotal = 60
 * ```
 */
export async function addOrderItem(
  orderId: string,
  productId: string,
  quantity: number,
  price: number
): Promise<ActionResult<OrderItem>>;

/**
 * 移除訂單商品
 *
 * 管理員可從訂單中移除商品。
 *
 * **權限要求**: 僅管理員（role = 'admin'）可執行
 *
 * **狀態限制**: 僅 `pending` 狀態訂單可修改
 *
 * **訂單明細檢查**:
 * - 訂單至少需保留一個商品（不可全部移除）
 *
 * **總金額更新**:
 * - 自動重新計算訂單總金額
 *
 * **歷程記錄**:
 * - 記錄於 `order_timelines` 表
 *
 * @param orderItemId - 訂單明細 ID
 * @returns ActionResult<void>
 *
 * @example
 * ```typescript
 * const result = await removeOrderItem('item-123');
 * ```
 */
export async function removeOrderItem(
  orderItemId: string
): Promise<ActionResult<void>>;

/**
 * 新增自訂費用項目
 *
 * 管理員可為訂單新增自訂費用（手續費、包裝費、額外運費、直接減免等）。
 *
 * **權限要求**: 僅管理員（role = 'admin'）可執行
 *
 * **狀態限制**: 僅 `pending` 狀態訂單可修改
 *
 * **費用類型**:
 * - 正數：額外收費（手續費、包裝費、額外運費）
 * - 負數：直接減免（優惠折扣、總額調整）
 *
 * **總金額更新**:
 * - 自動重新計算訂單總金額
 * - 總金額 = 商品合計 - 優惠券折扣 + 運費 + **所有自訂費用**
 *
 * **歷程記錄**:
 * - 記錄於 `order_timelines` 表
 *
 * @param orderId - 訂單 ID
 * @param name - 費用名稱（例：手續費、包裝費、總額調整）
 * @param amount - 金額（可為負數表示減免）
 * @returns ActionResult<OrderCustomFee> - 回傳新增的費用項目
 *
 * @example
 * ```typescript
 * // 新增手續費 50 元
 * const result1 = await addCustomFee('order-123', '手續費', 50);
 *
 * // 新增包裝費 20 元
 * const result2 = await addCustomFee('order-123', '包裝費', 20);
 *
 * // 總額調整（減免 100 元）
 * const result3 = await addCustomFee('order-123', '總額調整', -100);
 * ```
 */
export async function addCustomFee(
  orderId: string,
  name: string,
  amount: number
): Promise<ActionResult<OrderCustomFee>>;

/**
 * 直接調整訂單總金額
 *
 * 管理員可直接設定訂單的最終總金額，系統會自動計算差額並新增「總額調整」費用項目。
 *
 * **權限要求**: 僅管理員（role = 'admin'）可執行
 *
 * **狀態限制**: 僅 `pending` 狀態訂單可修改
 *
 * **調整邏輯**:
 * 1. 計算原始總金額（商品 - 優惠券 + 運費 + 費用）
 * 2. 計算差額（finalAmount - 原始總金額）
 * 3. 新增「總額調整」費用項目（金額 = 差額）
 *
 * **範例計算**:
 * - 原總額: 1000 元
 * - 目標總額: 800 元
 * - 差額: -200 元
 * - 新增費用: 「總額調整」-200 元
 *
 * **歷程記錄**:
 * - 記錄於 `order_timelines` 表
 * - modifications 包含調整前後的總金額
 *
 * @param orderId - 訂單 ID
 * @param finalAmount - 最終總金額
 * @returns ActionResult<Order> - 回傳更新後的訂單
 *
 * @example
 * ```typescript
 * // 將訂單總額直接改為 800 元
 * const result = await adjustTotalAmount('order-123', 800);
 * // 系統自動新增「總額調整: -200 元」
 * ```
 */
export async function adjustTotalAmount(
  orderId: string,
  finalAmount: number
): Promise<ActionResult<Order>>;
