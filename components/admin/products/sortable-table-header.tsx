'use client'

/**
 * Sortable Table Header Component
 * Feature: 016-product-management-enhancements
 *
 * 可排序表頭元件
 * - 點擊切換排序方向（無排序 → 升序 → 降序 → 無排序）
 * - 顯示排序圖示（↑ / ↓ / ↕）
 * - 當前排序欄位高亮（藍色文字）
 * - URL 參數同步（?sort=code&order=asc）
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

interface SortableTableHeaderProps {
  label: string
  sortKey: string
  className?: string
}

export function SortableTableHeader({
  label,
  sortKey,
  className = '',
}: SortableTableHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentSort = searchParams.get('sort') || ''
  const currentOrder = searchParams.get('order') || 'asc'

  // 判斷當前欄位是否正在排序
  const isActive = currentSort === sortKey

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString())

    if (!isActive) {
      // 當前欄位未排序 → 設為升序
      params.set('sort', sortKey)
      params.set('order', 'asc')
    } else if (currentOrder === 'asc') {
      // 當前欄位升序 → 設為降序
      params.set('order', 'desc')
    } else {
      // 當前欄位降序 → 清除排序
      params.delete('sort')
      params.delete('order')
    }

    router.push(`?${params.toString()}`)
  }

  // 決定顯示的圖示
  const Icon = !isActive
    ? ArrowUpDown
    : currentOrder === 'asc'
      ? ArrowUp
      : ArrowDown

  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center gap-1.5
        font-bold text-sm
        transition-colors
        hover:text-blue-600
        ${isActive ? 'text-blue-600' : 'text-gray-700'}
        ${className}
      `}
    >
      {label}
      <Icon
        className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
      />
    </button>
  )
}
