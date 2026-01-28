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
 * 根據等級 ID 產生一致的顏色（Neo-Brutalism 風格 - 鮮豔飽和）
 */
const TIER_COLORS = [
  'bg-blue-300',
  'bg-purple-300',
  'bg-green-300',
  'bg-yellow-300',
  'bg-pink-300',
  'bg-orange-300',
] as const

/**
 * 根據字串產生穩定的 hash 值（使用改進的 FNV-1a 演算法）
 * 對 UUID 字串有更好的分佈特性
 */
function stringHash(str: string): number {
  let hash = 2166136261 // FNV offset basis

  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    // FNV prime: 16777619
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }

  return Math.abs(hash >>> 0) // Convert to unsigned 32-bit integer
}

/**
 * 根據等級 ID 取得對應的顏色類別
 * @param tierId 等級 ID
 * @returns Tailwind 背景色類別
 */
export function getTierColor(tierId: string): string {
  const hash = stringHash(tierId)
  const colorIndex = hash % TIER_COLORS.length
  return TIER_COLORS[colorIndex]
}
