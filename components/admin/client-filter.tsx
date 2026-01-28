'use client'

import { Tier } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn, getTierColor } from '@/lib/utils'

type ClientFilterProps = {
  tiers: Tier[]
  initialSearch?: string
  initialTierIds?: string[]
  onFilterChange: (filters: { search: string; tier_ids: string[] }) => void
  totalCount: number
}

/**
 * 客戶篩選元件
 * Feature 006 - US6: 客戶管理快速切換與搜尋
 */
export function ClientFilter({
  tiers,
  initialSearch = '',
  initialTierIds = [],
  onFilterChange,
  totalCount,
}: ClientFilterProps) {
  const [search, setSearch] = useState(initialSearch)
  const [selectedTierIds, setSelectedTierIds] = useState<string[]>(initialTierIds)
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch)

  // 防抖搜尋 (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  // 當防抖搜尋或等級篩選變更時,觸發回調
  useEffect(() => {
    onFilterChange({
      search: debouncedSearch,
      tier_ids: selectedTierIds,
    })
  }, [debouncedSearch, selectedTierIds, onFilterChange])

  // 切換等級篩選
  const toggleTier = (tierId: string) => {
    setSelectedTierIds((prev) =>
      prev.includes(tierId)
        ? prev.filter((id) => id !== tierId)
        : [...prev, tierId]
    )
  }

  // 清除所有篩選
  const clearFilters = () => {
    setSearch('')
    setSelectedTierIds([])
  }

  // 檢查是否有啟用篩選
  const hasActiveFilters = search || selectedTierIds.length > 0

  // 高亮關鍵字 (用於搜尋結果顯示)
  const highlightKeyword = (text: string, keyword: string) => {
    if (!keyword) return text

    const parts = text.split(new RegExp(`(${keyword})`, 'gi'))
    return parts.map((part, index) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 font-bold">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  return (
    <div className="card-neo bg-white p-4">
      {/* 搜尋欄與清除按鈕 */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="搜尋手機號碼或顯示名稱..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="secondary"
            onClick={clearFilters}
            className="border-2 md:border-3 border-black bg-red-500 text-white hover:bg-red-600 flex-shrink-0"
          >
            <X className="mr-2 h-4 w-4" />
            清除篩選
          </Button>
        )}
      </div>

      {/* 等級篩選按鈕 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700">等級篩選</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {tiers.map((tier) => {
            const isSelected = selectedTierIds.includes(tier.id)
            const tierColor = getTierColor(tier.id)
            return (
              <button
                key={tier.id}
                onClick={() => toggleTier(tier.id)}
                className={cn(
                  'rounded-none border-2 md:border-3 border-black px-4 py-2 text-sm font-bold transition-all duration-150',
                  isSelected
                    ? 'bg-blue-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                    : `${tierColor} text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-opacity-80`
                )}
              >
                {tier.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* 篩選結果數量提示 */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t-2 border-gray-200 flex items-center gap-2 text-sm text-gray-600">
          <span>
            找到 <span className="font-bold text-blue-600">{totalCount}</span> 位客戶
          </span>
          {selectedTierIds.length > 0 && (
            <span className="text-gray-400">
              • 已選擇 {selectedTierIds.length} 個等級
            </span>
          )}
          {search && (
            <span className="text-gray-400">
              • 搜尋關鍵字: <span className="font-mono font-bold">{search}</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * 高亮關鍵字的 Hook (供外部元件使用)
 */
export function useHighlightKeyword(keyword: string) {
  return (text: string) => {
    if (!keyword || !text) return text

    const parts = text.split(new RegExp(`(${keyword})`, 'gi'))
    return parts.map((part, index) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 font-bold">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }
}
