import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化金額為新台幣格式
 * @param amount 金額
 * @returns 格式化後的字串 (例: $1,234)
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}
