/**
 * Series Management Page (系列管理頁面)
 * Feature: 003-series-and-pricing (US2)
 * Updated: 列表式系列管理 UI
 *
 * 管理員系列列表頁面
 * - 支援搜尋系列代碼或名稱
 * - 支援分類篩選
 * - 列表式顯示：縮圖-系列代碼-系列名稱-分類-狀態-[編輯鈕]-[刪除鈕]
 */

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getSeries } from '@/lib/actions/series'
import { getCategories } from '@/lib/actions/categories'
import { Button } from '@/components/ui/button'
import { SeriesTable } from '@/components/admin/series/SeriesTable'
import { cn } from '@/lib/utils'
import { designTokens, getPageContainerClasses } from '@/lib/design-tokens'

export default async function SeriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    category?: string
  }>
}) {
  const params = await searchParams
  const search = params.search || ''
  const category_id = params.category || ''

  // 取得系列列表與分類列表
  const seriesResult = await getSeries({
    search,
    category_id,
  })
  const series = (seriesResult.success ? seriesResult.data : []) || []
  const categories = await getCategories()

  return (
    <div className={getPageContainerClasses('default')}>
      {/* Header */}
      <div className="flex flex-col gap-3 md:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={designTokens.typography.h1}>系列管理</h1>
          <p className={cn(designTokens.typography.body.base, "mt-1 md:mt-2 text-gray-600")}>管理商品系列、分類與圖片</p>
        </div>

        <div className="flex gap-3">
          <Link href="/admin/series/new">
            <Button>
              <Plus className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              新增系列
            </Button>
          </Link>
        </div>
      </div>

      {/* Series Table */}
      <SeriesTable
        series={series}
        categories={categories}
        searchQuery={search}
        selectedCategory={category_id}
      />
    </div>
  )
}
