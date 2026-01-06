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

/**
 * 格式化日期為顯示格式
 * @param date 日期字串（ISO 8601 格式）
 * @returns 格式化後的日期字串 (例: 2026/01/31)
 */
export function formatDate(date: string): string {
  const d = new Date(date)
  return d.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '/')
}
