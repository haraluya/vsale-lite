/**
 * Shipping Fee Calculator Utility
 * Feature: 011-shipping-and-order-edit (US2 - 訂單建立時自動計算運費)
 *
 * 運費計算工具函式
 * - 格式化運費顯示文字
 * - 驗證運費金額
 * - 計算距離免運門檻的差額
 */

/**
 * 格式化運費顯示文字
 * @param shippingFee - 運費金額
 * @returns 格式化的運費文字 (例: "NT$100", "免運")
 */
export function formatShippingFeeDisplay(shippingFee: number): string {
  if (shippingFee === 0) {
    return '免運'
  }
  return `NT$ ${shippingFee.toLocaleString()}`
}

/**
 * 格式化運費顯示文字（含顏色資訊）
 * @param shippingFee - 運費金額
 * @returns 包含文字與顏色 class 的物件
 */
export function formatShippingFeeWithColor(shippingFee: number): {
  text: string
  colorClass: string
} {
  if (shippingFee === 0) {
    return {
      text: '免運',
      colorClass: 'text-green-600',
    }
  }
  return {
    text: `NT$ ${shippingFee.toLocaleString()}`,
    colorClass: 'text-black',
  }
}

/**
 * 驗證運費金額是否有效
 * @param shippingFee - 運費金額
 * @returns 是否有效
 */
export function validateShippingFee(shippingFee: number): boolean {
  return shippingFee >= 0
}

/**
 * 計算距離免運門檻的差額
 * @param subtotal - 商品原始金額（不含優惠券折扣）
 * @param freeShippingThreshold - 免運門檻
 * @returns 距離免運門檻的差額 (null 表示已達免運門檻或無免運門檻)
 */
export function calculateFreeShippingGap(
  subtotal: number,
  freeShippingThreshold: number | null
): number | null {
  if (freeShippingThreshold === null || freeShippingThreshold === undefined) {
    return null
  }

  if (subtotal >= freeShippingThreshold) {
    return null // 已達免運門檻
  }

  return freeShippingThreshold - subtotal
}

/**
 * 格式化免運提示訊息
 * @param gap - 距離免運門檻的差額
 * @returns 提示訊息 (null 表示已達免運門檻)
 */
export function formatFreeShippingMessage(gap: number | null): string | null {
  if (gap === null) {
    return null
  }

  return `再購 NT$ ${gap.toLocaleString()} 即可免運`
}

/**
 * 計算運費的描述文字（用於載入狀態）
 * @param isLoading - 是否正在載入
 * @param shippingFee - 運費金額
 * @returns 描述文字
 */
export function getShippingFeeStatusText(
  isLoading: boolean,
  shippingFee: number | null
): string {
  if (isLoading) {
    return '計算中...'
  }

  if (shippingFee === null) {
    return '計算中...'
  }

  return formatShippingFeeDisplay(shippingFee)
}

/**
 * 判斷運費顯示的顏色 class
 * @param isLoading - 是否正在載入
 * @param shippingFee - 運費金額
 * @returns Tailwind CSS class
 */
export function getShippingFeeColorClass(
  isLoading: boolean,
  shippingFee: number | null
): string {
  if (isLoading || shippingFee === null) {
    return 'text-gray-400'
  }

  if (shippingFee === 0) {
    return 'text-green-600 font-bold'
  }

  return 'text-black'
}
