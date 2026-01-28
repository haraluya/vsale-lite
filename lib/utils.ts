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

/**
 * 等級標籤色彩循環系統
 * 根據等級 ID 產生一致的顏色（Neo-Brutalism 風格）
 */
const TIER_COLORS = [
  'bg-blue-100',
  'bg-purple-100',
  'bg-green-100',
  'bg-yellow-100',
  'bg-pink-100',
  'bg-orange-100',
] as const

/**
 * 根據字串產生簡單的 hash 值
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * 根據等級 ID 取得對應的顏色類別
 * @param tierId 等級 ID
 * @returns Tailwind 背景色類別
 */
export function getTierColor(tierId: string): string {
  const hash = simpleHash(tierId)
  const colorIndex = hash % TIER_COLORS.length
  return TIER_COLORS[colorIndex]
}
