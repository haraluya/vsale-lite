'use client'

/**
 * Order Filters Component (Client Component)
 * Feature: Performance Optimization - Order List Streaming
 *
 * 篩選器立即渲染，不需等待訂單資料載入
 * 使用 URL Query 參數觸發 Server 端重新查詢
 */

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'
import type { OrderStatus } from '@/types'

const STATUS_OPTIONS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部狀態' },
  { value: 'pending', label: '待確認' },
  { value: 'shipping', label: '出貨中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

export function OrderFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>(
    (searchParams.get('status') as OrderStatus) || 'all'
  )
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')

  // 同步 URL 參數到狀態
  useEffect(() => {
    setStatusFilter((searchParams.get('status') as OrderStatus) || 'all')
    setSearchTerm(searchParams.get('search') || '')
  }, [searchParams])

  const handleStatusChange = (value: OrderStatus | 'all') => {
    setStatusFilter(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value !== 'all') {
      params.set('status', value)
    } else {
      params.delete('status')
    }
    // 重設為第一頁
    params.delete('page')
    router.push(`/admin/orders?${params.toString()}`)
  }

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (searchTerm) {
      params.set('search', searchTerm)
    } else {
      params.delete('search')
    }
    // 重設為第一頁
    params.delete('page')
    router.push(`/admin/orders?${params.toString()}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-none bg-white sm:flex-row',
        designTokens.neoBrutalism.border.full,
        designTokens.neoBrutalism.shadow.full,
        designTokens.spacing.card.padding
      )}
    >
      {/* 狀態篩選 */}
      <div className="flex items-center gap-2">
        <Filter className="h-5 w-5" />
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value as OrderStatus | 'all')}
          className={cn(
            'rounded-none border-2 border-black bg-white font-bold focus:outline-none',
            designTokens.input.base,
            designTokens.neoBrutalism.hover
          )}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* 搜尋框 */}
      <div
        className={cn(
          'flex flex-1 items-center gap-2 rounded-none border-2 border-black bg-white',
          designTokens.input.base
        )}
      >
        <Search className="h-5 w-5" />
        <input
          type="text"
          placeholder="搜尋訂單編號、客戶名稱或手機號碼..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSearch}
          className="flex-1 bg-transparent font-medium focus:outline-none"
        />
      </div>
    </div>
  )
}
