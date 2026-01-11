'use client'

/**
 * Series Table Component (列表式系列管理)
 * Feature: 系列管理 UI 優化
 *
 * 欄位順序：縮圖-系列代碼-[分類] 系列名稱-狀態-[編輯鈕]-[刪除鈕]
 * 支援排序：系列代碼、分類+系列名稱
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Edit, Trash2, Search } from 'lucide-react'
import { deleteSeries } from '@/lib/actions/series'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CategoryBadge } from './CategoryBadge'
import { SortableHeader } from './SortableHeader'
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import type { Series, Category } from '@/types'
import { useConfirm, useAlert } from '@/lib/contexts/dialog-context'

interface SeriesTableProps {
  series: Series[]
  categories: Category[]
  searchQuery?: string
  selectedCategory?: string
}

export function SeriesTable({
  series,
  categories,
  searchQuery = '',
  selectedCategory = '',
}: SeriesTableProps) {
  const router = useRouter()
  const confirm = useConfirm()
  const alert = useAlert()
  const [search, setSearch] = useState(searchQuery)
  const [categoryFilter, setCategoryFilter] = useState(selectedCategory)

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (categoryFilter) params.set('category', categoryFilter)
    router.push(`/admin/series?${params.toString()}`)
  }

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: '刪除系列',
      description: `確定要刪除系列「${name}」嗎？此操作無法復原。`,
      variant: 'danger',
    })

    if (!confirmed) return

    const result = await deleteSeries(id)
    if (result.success) {
      await alert({
        title: '刪除成功',
        message: result.message || '系列已成功刪除',
        variant: 'success',
      })
      router.refresh()
    } else {
      await alert({
        title: '刪除失敗',
        message: result.message || '刪除系列失敗',
        variant: 'error',
      })
    }
  }

  return (
    <div className={designTokens.spacing.page.gap}>
      <div className={cn('card-neo', designTokens.spacing.card.padding)}>
        {/* Search & Filter */}
        <div className="mb-4 md:mb-6 flex flex-col gap-3 md:flex-row md:gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜尋系列代碼或名稱..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <select
            className={cn(
              'rounded-none border-2 md:border-3 border-black font-bold',
              'px-3 py-2 md:px-4 md:py-2',
              designTokens.neoBrutalism.shadow.mobile,
              designTokens.typography.body.base
            )}
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              const params = new URLSearchParams()
              if (search) params.set('search', search)
              if (e.target.value) params.set('category', e.target.value)
              router.push(`/admin/series?${params.toString()}`)
            }}
          >
            <option value="">所有分類</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <Button onClick={handleSearch}>
            <Search className="mr-2 h-4 w-4 md:h-5 md:w-5" />
            搜尋
          </Button>
        </div>

        {/* 桌面版: 完整表格 */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-3 border-black">
                <th className={cn('px-4 py-3 text-left font-bold', designTokens.typography.body.base)}>縮圖</th>
                <th className={cn('px-4 py-3 text-left', designTokens.typography.body.base)}>
                  <SortableHeader label="系列代碼" sortKey="code" />
                </th>
                <th className={cn('px-4 py-3 text-left', designTokens.typography.body.base)}>
                  <SortableHeader label="分類 / 系列名稱" sortKey="category_name" />
                </th>
                <th className={cn('px-4 py-3 text-left font-bold', designTokens.typography.body.base)}>狀態</th>
                <th className={cn('px-4 py-3 text-right font-bold', designTokens.typography.body.base)}>操作</th>
              </tr>
            </thead>
            <tbody>
              {series.length === 0 ? (
                <tr>
                  <td colSpan={5} className={cn('px-4 py-8 text-center text-gray-500', designTokens.typography.body.base)}>
                    {searchQuery || selectedCategory
                      ? '找不到符合條件的系列'
                      : '尚未建立任何系列'}
                  </td>
                </tr>
              ) : (
                series.map((s) => (
                  <tr key={s.id} className="border-b border-gray-200 hover:bg-gray-50">
                    {/* 縮圖 */}
                    <td className="px-4 py-3">
                      <div className="relative h-12 w-12 border-2 border-black bg-gray-100">
                        {s.image_url ? (
                          <Image
                            src={s.image_url}
                            alt={s.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-2xl">
                            📦
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 系列代碼 */}
                    <td className={cn('px-4 py-3 font-mono', designTokens.typography.caption)}>
                      {s.code}
                    </td>

                    {/* 分類 / 系列名稱 */}
                    <td className={cn('px-4 py-3', designTokens.typography.body.base)}>
                      <div className="flex flex-col gap-1">
                        <CategoryBadge categoryName={s.categories?.name || '未分類'} size="sm" />
                        <div className="font-medium">{s.name}</div>
                      </div>
                    </td>

                    {/* 狀態 */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-none border-2 border-black px-2 py-1 font-bold',
                          designTokens.typography.caption,
                          s.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        )}
                      >
                        {s.status === 'active' ? '啟用' : '停用'}
                      </span>
                    </td>

                    {/* 操作 */}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/series/${s.id}`}
                          className="rounded-none border-2 border-black bg-blue-100 p-2 shadow-neo-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                          title="編輯"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(s.id, s.name)}
                          className="rounded-none border-2 border-black bg-red-100 p-2 shadow-neo-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                          title="刪除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 手機版: 卡片視圖 */}
        <div className="lg:hidden space-y-3 md:space-y-4">
          {series.length === 0 ? (
            <div className={cn('text-center py-8 text-gray-500', designTokens.typography.body.base)}>
              {searchQuery || selectedCategory
                ? '找不到符合條件的系列'
                : '尚未建立任何系列'}
            </div>
          ) : (
            series.map((s) => (
              <div
                key={s.id}
                className={cn(
                  'rounded-none bg-white',
                  getNeoBrutalismClasses(),
                  designTokens.spacing.card.padding
                )}
              >
                {/* 縮圖與基本資訊 */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative h-16 w-16 min-w-[64px] border-2 border-black bg-gray-100">
                    {s.image_url ? (
                      <Image
                        src={s.image_url}
                        alt={s.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl">
                        📦
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className={cn('font-mono text-gray-600 mb-1', designTokens.typography.caption)}>
                      {s.code}
                    </div>
                    <div className="mb-1">
                      <CategoryBadge categoryName={s.categories?.name || '未分類'} size="sm" />
                    </div>
                    <div className={cn('font-bold truncate', designTokens.typography.body.base)}>
                      {s.name}
                    </div>
                  </div>
                </div>

                {/* 狀態 */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={cn(
                      'rounded-none border-2 border-black px-2 py-1 font-bold',
                      designTokens.typography.caption,
                      s.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    )}
                  >
                    {s.status === 'active' ? '啟用' : '停用'}
                  </span>
                </div>

                {/* 操作按鈕 */}
                <div className="flex gap-2">
                  <Link
                    href={`/admin/series/${s.id}`}
                    className={cn(
                      'flex-1 inline-flex items-center justify-center gap-2 bg-blue-100 font-bold transition-all',
                      getNeoBrutalismClasses({ active: true }),
                      designTokens.button.md
                    )}
                  >
                    <Edit className="h-4 w-4" />
                    編輯
                  </Link>
                  <button
                    onClick={() => handleDelete(s.id, s.name)}
                    className={cn(
                      'flex-1 inline-flex items-center justify-center gap-2 bg-red-100 font-bold transition-all',
                      getNeoBrutalismClasses({ active: true }),
                      designTokens.button.md
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                    刪除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
