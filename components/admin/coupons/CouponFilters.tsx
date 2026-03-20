/**
 * CouponFilters Component
 * Feature: 009-coupon-system (US2)
 *
 * 優惠券篩選器元件 (管理員用)
 * - 狀態篩選 (active/inactive/all)
 * - 折扣方式篩選 (fixed/percentage/all)
 * - 代碼搜尋
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter, X } from 'lucide-react'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export function CouponFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [status, setStatus] = useState(searchParams.get('status') || 'all')
  const [discountType, setDiscountType] = useState(searchParams.get('discountType') || 'all')
  const [search, setSearch] = useState(searchParams.get('search') || '')

  // 更新 URL 參數
  const updateFilters = (newFilters: {
    status?: string
    discountType?: string
    search?: string
  }) => {
    const params = new URLSearchParams(searchParams.toString())

    if (newFilters.status !== undefined) {
      if (newFilters.status === 'all') {
        params.delete('status')
      } else {
        params.set('status', newFilters.status)
      }
    }

    if (newFilters.discountType !== undefined) {
      if (newFilters.discountType === 'all') {
        params.delete('discountType')
      } else {
        params.set('discountType', newFilters.discountType)
      }
    }

    if (newFilters.search !== undefined) {
      if (newFilters.search.trim() === '') {
        params.delete('search')
      } else {
        params.set('search', newFilters.search.trim())
      }
    }

    router.push(`/admin/coupons?${params.toString()}`)
  }

  const handleStatusChange = (value: string) => {
    setStatus(value)
    updateFilters({ status: value })
  }

  const handleDiscountTypeChange = (value: string) => {
    setDiscountType(value)
    updateFilters({ discountType: value })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters({ search })
  }

  const handleClearSearch = () => {
    setSearch('')
    updateFilters({ search: '' })
  }

  const handleClearFilters = () => {
    setStatus('all')
    setDiscountType('all')
    setSearch('')
    router.push('/admin/coupons')
  }

  const hasActiveFilters =
    status !== 'all' || discountType !== 'all' || search.trim() !== ''

  return (
    <div className="border-theme bg-surface p-4 shadow-neo-sm md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-5 w-5" />
        <h2 className="font-black text-lg">篩選條件</h2>
      </div>

      <div className="space-y-4">
        {/* 搜尋框 */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value.toUpperCase())}
              placeholder="搜尋優惠券代碼..."
              className="w-full border p-3 pr-10 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-black"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-secondary rounded"
              >
                <X className="h-5 w-5 text-muted" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className={cn(
              'inline-flex items-center gap-2 bg-foreground font-bold text-text-inverse transition-all',
              designTokens.cleanCommerce.border.full,
              designTokens.cleanCommerce.shadow.base,
              designTokens.cleanCommerce.hover,
              designTokens.button.md
            )}
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">搜尋</span>
          </button>
        </form>

        <div className="grid gap-4 md:grid-cols-2">
          {/* 狀態篩選 */}
          <div>
            <label className="mb-2 block font-bold text-sm">狀態</label>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full border p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="all">全部狀態</option>
              <option value="active">啟用</option>
              <option value="inactive">停用</option>
            </select>
          </div>

          {/* 折扣方式篩選 */}
          <div>
            <label className="mb-2 block font-bold text-sm">折扣方式</label>
            <select
              value={discountType}
              onChange={(e) => handleDiscountTypeChange(e.target.value)}
              className="w-full border p-3 font-bold focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="all">全部方式</option>
              <option value="fixed">現金折扣</option>
              <option value="percentage">百分比折扣</option>
            </select>
          </div>
        </div>

        {/* 清除篩選按鈕 */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className={cn(
              'inline-flex items-center gap-2 bg-surface font-bold transition-all',
              designTokens.cleanCommerce.border.full,
              designTokens.cleanCommerce.shadow.base,
              designTokens.cleanCommerce.hover,
              designTokens.button.sm
            )}
          >
            <X className="h-4 w-4" />
            清除所有篩選
          </button>
        )}
      </div>
    </div>
  )
}
