/**
 * Formatting Utilities
 * Feature: Common utilities
 * Created: 2026-01-30
 */

/**
 * 格式化日期為 YYYY/MM/DD
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

/**
 * 格式化日期時間為 YYYY/MM/DD HH:mm
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  const dateStr = formatDate(dateString)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${dateStr} ${hours}:${minutes}`
}

/**
 * 格式化金額（無小數點）
 */
export function formatCurrency(amount: number): string {
  return `$${Math.round(amount).toLocaleString('zh-TW')}`
}

/**
 * 格式化折扣（固定折價或百分比）
 */
export function formatDiscount(
  type: 'fixed' | 'percentage',
  value: number
): string {
  if (type === 'fixed') {
    return `省 ${formatCurrency(value)}`
  }
  return `${value / 10} 折`
}
