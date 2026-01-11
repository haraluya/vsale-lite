'use client'

/**
 * Sortable Table Header Component
 * 可排序的表格標頭元件
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'

interface SortableHeaderProps {
  label: string
  sortKey: string
  className?: string
}

export function SortableHeader({ label, sortKey, className }: SortableHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentSort = searchParams.get('sort') || ''
  const currentOrder = searchParams.get('order') || 'asc'

  const isActive = currentSort === sortKey
  const isAsc = isActive && currentOrder === 'asc'
  const isDesc = isActive && currentOrder === 'desc'

  const handleSort = () => {
    const params = new URLSearchParams(searchParams.toString())

    // 如果點擊相同欄位，切換排序方向
    if (isActive) {
      if (isAsc) {
        params.set('order', 'desc')
      } else {
        // 如果已經是降序，取消排序
        params.delete('sort')
        params.delete('order')
      }
    } else {
      // 點擊新欄位，設定為升序
      params.set('sort', sortKey)
      params.set('order', 'asc')
    }

    router.push(`?${params.toString()}`)
  }

  return (
    <button
      onClick={handleSort}
      className={cn(
        'inline-flex items-center gap-1 font-bold hover:text-blue-600 transition-colors',
        designTokens.typography.body.base,
        isActive && 'text-blue-600',
        className
      )}
    >
      {label}
      {isActive ? (
        isAsc ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-30" />
      )}
    </button>
  )
}
