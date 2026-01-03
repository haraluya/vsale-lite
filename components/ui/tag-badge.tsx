'use client'

/**
 * 標籤徽章元件
 * Feature: 006-ux-enhancement (US4)
 */

import { cn } from '@/lib/utils'

interface TagBadgeProps {
  tag: string
  variant?: 'default' | 'hot' | 'new' | 'limited' | 'sale'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * 根據標籤名稱自動判斷樣式
 */
function getTagVariant(tag: string): TagBadgeProps['variant'] {
  const tagLower = tag.toLowerCase()

  if (tagLower.includes('熱銷') || tagLower.includes('hot')) return 'hot'
  if (tagLower.includes('新品') || tagLower.includes('new')) return 'new'
  if (tagLower.includes('限量') || tagLower.includes('limited')) return 'limited'
  if (tagLower.includes('促銷') || tagLower.includes('sale')) return 'sale'

  return 'default'
}

export function TagBadge({ tag, variant, size = 'md', className = '' }: TagBadgeProps) {
  // 若未指定 variant，根據標籤名稱自動判斷
  const finalVariant = variant || getTagVariant(tag)

  // 根據 variant 決定顏色
  const colorClasses: Record<NonNullable<TagBadgeProps['variant']>, string> = {
    default: 'bg-gray-100 border-gray-600 text-gray-900',
    hot: 'bg-red-100 border-red-600 text-red-900',
    new: 'bg-green-100 border-green-600 text-green-900',
    limited: 'bg-purple-100 border-purple-600 text-purple-900',
    sale: 'bg-yellow-100 border-yellow-600 text-yellow-900',
  }

  // 根據 size 決定尺寸
  const sizeClasses: Record<NonNullable<TagBadgeProps['size']>, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  return (
    <span
      className={cn(
        'inline-block rounded-none border-2 font-bold',
        colorClasses[finalVariant],
        sizeClasses[size],
        className
      )}
    >
      {tag}
    </span>
  )
}

/**
 * 標籤徽章列表（限制數量）
 */
interface TagBadgeListProps {
  tags: string[]
  maxTags?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function TagBadgeList({ tags, maxTags = 2, size = 'sm', className = '' }: TagBadgeListProps) {
  const displayTags = tags.slice(0, maxTags)
  const remainingCount = tags.length - maxTags

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {displayTags.map((tag) => (
        <TagBadge key={tag} tag={tag} size={size} />
      ))}
      {remainingCount > 0 && (
        <span
          className={cn(
            'inline-block rounded-none border-2 border-gray-400 bg-gray-100 font-bold text-gray-600',
            size === 'sm' && 'px-2 py-0.5 text-xs',
            size === 'md' && 'px-3 py-1 text-sm',
            size === 'lg' && 'px-4 py-1.5 text-base'
          )}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  )
}
