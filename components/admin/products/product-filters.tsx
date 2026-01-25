'use client'

/**
 * Product Filters Component (Client Component)
 * Feature: Performance Optimization - Product List Streaming
 *
 * 篩選器立即渲染，不需等待商品資料載入
 * 使用 URL Query 參數觸發 Server 端重新查詢
 */

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'
import type { Series } from '@/types'

interface ProductFiltersProps {
  series: Series[]
}

export function ProductFilters({ series }: ProductFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [seriesFilter, setSeriesFilter] = useState(searchParams.get('series') || '')

  // 同步 URL 參數到狀態
  useEffect(() => {
    setSearch(searchParams.get('search') || '')
    setSeriesFilter(searchParams.get('series') || '')
  }, [searchParams])

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (search) {
      params.set('search', search)
    } else {
      params.delete('search')
    }
    if (seriesFilter) {
      params.set('series', seriesFilter)
    } else {
      params.delete('series')
    }
    // 重設為第一頁
    params.delete('page')
    router.push(`/admin/products?${params.toString()}`)
  }

  const handleSeriesChange = (value: string) => {
    setSeriesFilter(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('series', value)
    } else {
      params.delete('series')
    }
    // 保留搜尋但重設頁碼
    params.delete('page')
    router.push(`/admin/products?${params.toString()}`)
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-3 md:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={designTokens.typography.h1}>商品管理</h1>
          <p className={cn(designTokens.typography.body.base, 'mt-1 md:mt-2 text-gray-600')}>
            管理商品資料、庫存與分類
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/admin/products/new">
            <Button>
              <Plus className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              新增商品
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Filter */}
      <div
        className={cn(
          'rounded-none bg-white',
          designTokens.neoBrutalism.border.full,
          designTokens.neoBrutalism.shadow.full,
          designTokens.spacing.card.padding
        )}
      >
        <div className="flex flex-col gap-3 md:flex-row md:gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜尋商品編號或名稱..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <select
            className={cn(
              'rounded-none border-2 border-black bg-white font-bold',
              designTokens.input.base,
              designTokens.neoBrutalism.shadow.mobile
            )}
            value={seriesFilter}
            onChange={(e) => handleSeriesChange(e.target.value)}
          >
            <option value="">所有系列</option>
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <Button onClick={handleSearch}>
            <Search className="mr-2 h-4 w-4" />
            搜尋
          </Button>
        </div>
      </div>
    </>
  )
}
