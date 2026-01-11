/**
 * Category Badge Component
 * 分類標籤元件 - 使用顏色循環顯示
 */

import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'

interface CategoryBadgeProps {
  categoryName: string
  size?: 'sm' | 'md'
}

// 顏色循環配色（Neo-Brutalism 風格）
const CATEGORY_COLORS = [
  { bg: 'bg-blue-200', text: 'text-blue-800', border: 'border-blue-800' },      // 藍色
  { bg: 'bg-green-200', text: 'text-green-800', border: 'border-green-800' },   // 綠色
  { bg: 'bg-yellow-200', text: 'text-yellow-800', border: 'border-yellow-800' }, // 黃色
  { bg: 'bg-purple-200', text: 'text-purple-800', border: 'border-purple-800' }, // 紫色
  { bg: 'bg-pink-200', text: 'text-pink-800', border: 'border-pink-800' },       // 粉紅色
  { bg: 'bg-orange-200', text: 'text-orange-800', border: 'border-orange-800' }, // 橙色
  { bg: 'bg-teal-200', text: 'text-teal-800', border: 'border-teal-800' },       // 青色
  { bg: 'bg-red-200', text: 'text-red-800', border: 'border-red-800' },          // 紅色
]

/**
 * 根據分類名稱計算顏色索引（使用 hash 確保同名分類顏色一致）
 */
function getCategoryColorIndex(categoryName: string): number {
  let hash = 0
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % CATEGORY_COLORS.length
}

export function CategoryBadge({ categoryName, size = 'sm' }: CategoryBadgeProps) {
  const colorIndex = getCategoryColorIndex(categoryName)
  const colors = CATEGORY_COLORS[colorIndex]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-none border-2 font-bold whitespace-nowrap',
        colors.bg,
        colors.text,
        colors.border,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {categoryName}
    </span>
  )
}
