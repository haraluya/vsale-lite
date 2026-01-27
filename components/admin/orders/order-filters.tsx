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
    <div className="flex flex-col gap-4">
      {/* 搜尋框 */}
      <div
        className={cn(
          'flex flex-1 items-center gap-2 rounded-none border-2 border-black bg-white',
          designTokens.neoBrutalism.shadow.full,
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

      {/* 狀態快篩按鈕列 */}
      <div
        className={cn(
          'flex flex-wrap gap-2 rounded-none bg-white',
          designTokens.neoBrutalism.border.full,
          designTokens.neoBrutalism.shadow.full,
          designTokens.spacing.card.padding
        )}
      >
        <div className="flex items-center gap-2 text-sm font-bold">
          <Filter className="h-4 w-4" />
          <span>狀態篩選：</span>
        </div>
        {STATUS_OPTIONS.map((option) => {
          const isActive = statusFilter === option.value
          const baseClasses = cn(
            'rounded-none border-2 border-black px-3 py-1.5 text-sm font-bold transition-all',
            designTokens.neoBrutalism.hover
          )

          // 根據狀態設定不同顏色
          let bgColor = 'bg-white'
          let activeBgColor = 'bg-gray-800 text-white'

          if (option.value === 'pending') {
            bgColor = 'bg-yellow-100'
            activeBgColor = 'bg-yellow-500 text-white'
          } else if (option.value === 'shipping') {
            bgColor = 'bg-blue-100'
            activeBgColor = 'bg-blue-500 text-white'
          } else if (option.value === 'completed') {
            bgColor = 'bg-green-100'
            activeBgColor = 'bg-green-500 text-white'
          } else if (option.value === 'cancelled') {
            bgColor = 'bg-red-100'
            activeBgColor = 'bg-red-500 text-white'
          }

          return (
            <button
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              className={cn(
                baseClasses,
                isActive ? activeBgColor : bgColor,
                isActive && 'shadow-none translate-x-[2px] translate-y-[2px]'
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
