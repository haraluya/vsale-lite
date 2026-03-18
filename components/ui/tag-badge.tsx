'use client'

import { cn } from '@/lib/utils'

interface TagBadgeProps {
  tag: string
  variant?: 'default' | 'hot' | 'new' | 'limited' | 'sale'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function getTagVariant(tag: string): TagBadgeProps['variant'] {
  const tagLower = tag.toLowerCase()

  if (tagLower.includes('熱銷') || tagLower.includes('hot')) return 'hot'
  if (tagLower.includes('新品') || tagLower.includes('new')) return 'new'
  if (tagLower.includes('限量') || tagLower.includes('limited')) return 'limited'
  if (tagLower.includes('促銷') || tagLower.includes('sale')) return 'sale'

  return 'default'
}

export function TagBadge({ tag, variant, size = 'md', className = '' }: TagBadgeProps) {
  const finalVariant = variant || getTagVariant(tag)

  const colorClasses: Record<Exclude<TagBadgeProps['variant'], undefined>, string> = {
    default: 'bg-surface-secondary text-text-secondary',
    hot: 'bg-[var(--color-tag-hot-bg)] border-[var(--color-tag-hot-border)] text-[var(--color-tag-hot-text)]',
    new: 'bg-[var(--color-tag-new-bg)] border-[var(--color-tag-new-border)] text-[var(--color-tag-new-text)]',
    limited: 'bg-[var(--color-tag-limited-bg)] border-[var(--color-tag-limited-border)] text-[var(--color-tag-limited-text)]',
    sale: 'bg-[var(--color-tag-sale-bg)] border-[var(--color-tag-sale-border)] text-[var(--color-tag-sale-text)]',
  }

  const sizeClasses: Record<Exclude<TagBadgeProps['size'], undefined>, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  return (
    <span
      className={cn(
        'inline-block rounded-none border-2 font-bold',
        colorClasses[finalVariant!],
        sizeClasses[size!],
        className
      )}
    >
      {tag}
    </span>
  )
}

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
            'inline-block rounded-none border-2 bg-surface-secondary font-bold text-text-secondary',
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
