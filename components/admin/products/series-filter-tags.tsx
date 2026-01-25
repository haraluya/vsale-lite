'use client'

/**
 * Series Filter Tags Component
 * Feature: 016-product-management-enhancements
 *
 * 系列標籤篩選器元件（多選模式）
 * - 顯示所有系列為彩色標籤
 * - 支援多選篩選（點擊切換）
 * - URL 參數同步（?series_ids=uuid1,uuid2）
 * - 同分類系列使用相同顏色
 * - 依分類排序顯示
 * - Neo-Brutalism 設計風格
 */

import type { Series } from '@/types'
import { useRouter, useSearchParams } from 'next/navigation'
import { X, Check } from 'lucide-react'

interface SeriesFilterTagsProps {
  series: Series[]
}

// 分類顏色循環（Neo-Brutalism 風格）
const CATEGORY_COLORS = [
  '#FBBF24', // Amber 400
  '#60A5FA', // Blue 400
  '#F87171', // Red 400
  '#34D399', // Emerald 400
  '#A78BFA', // Violet 400
  '#FB923C', // Orange 400
  '#22D3EE', // Cyan 400
  '#F472B6', // Pink 400
  '#84CC16', // Lime 400
  '#818CF8', // Indigo 400
] as const

export function SeriesFilterTags({ series }: SeriesFilterTagsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 從 URL 參數解析已選擇的系列 ID
  const selectedSeriesIdsParam = searchParams.get('series_ids') || ''
  const selectedSeriesIds = selectedSeriesIdsParam
    ? selectedSeriesIdsParam.split(',').filter(Boolean)
    : []

  const handleToggleSeries = (seriesId: string) => {
    const params = new URLSearchParams(searchParams.toString())

    let newSelectedIds: string[]
    if (selectedSeriesIds.includes(seriesId)) {
      // 移除該系列
      newSelectedIds = selectedSeriesIds.filter((id) => id !== seriesId)
    } else {
      // 新增該系列
      newSelectedIds = [...selectedSeriesIds, seriesId]
    }

    if (newSelectedIds.length > 0) {
      params.set('series_ids', newSelectedIds.join(','))
    } else {
      params.delete('series_ids')
    }

    // 保留其他參數（如 search、status）
    router.push(`?${params.toString()}`)
  }

  const handleClearAll = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('series_ids')
    router.push(`?${params.toString()}`)
  }

  // 按分類分組系列並分配顏色
  const categoryMap = new Map<string, { name: string; series: Series[]; color: string }>()
  const uncategorizedSeries: Series[] = []

  // 收集所有分類並按 sort_order 排序
  const categories = new Map<string, string>() // category_id -> category_name
  series.forEach((s) => {
    if (s.category_id && s.categories?.name) {
      categories.set(s.category_id, s.categories.name)
    }
  })

  // 為每個分類分配顏色
  const categoryIds = Array.from(categories.keys())
  categoryIds.forEach((categoryId, index) => {
    const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length]
    const categoryName = categories.get(categoryId) || '未分類'
    categoryMap.set(categoryId, { name: categoryName, series: [], color })
  })

  // 將系列分配到對應的分類
  series.forEach((s) => {
    if (s.category_id && categoryMap.has(s.category_id)) {
      categoryMap.get(s.category_id)!.series.push(s)
    } else {
      uncategorizedSeries.push(s)
    }
  })

  // 按分類名稱排序（中文排序）
  const sortedCategories = Array.from(categoryMap.entries()).sort(([, a], [, b]) => {
    return a.name.localeCompare(b.name, 'zh-TW')
  })

  // 分離已選中和未選中的系列
  const selectedSeries = series.filter((s) => selectedSeriesIds.includes(s.id))
  const unselectedSeries = series.filter((s) => !selectedSeriesIds.includes(s.id))

  return (
    <div className="flex flex-col gap-3">
      {/* 標題 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase text-gray-600">系列篩選</h3>
      </div>

      {/* 已選中的系列（獨立群組，置頂顯示） */}
      {selectedSeries.length > 0 && (
        <div className="flex flex-col gap-2 rounded-none border-2 border-black bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase text-gray-700">
              已選擇 {selectedSeries.length} 個系列
            </h4>
            <button
              onClick={handleClearAll}
              className="
                flex items-center gap-1
                rounded-none border-2 border-black
                bg-red-500
                px-2 py-1
                text-xs font-bold text-black
                shadow-neo-sm
                transition-transform
                hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none
              "
            >
              <X className="h-3 w-3" />
              清除篩選 ({selectedSeries.length})
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedSeries.map((s) => {
              // 找到該系列的分類顏色
              const categoryColor = s.category_id && categoryMap.has(s.category_id)
                ? categoryMap.get(s.category_id)!.color
                : '#D1D5DB' // 未分類使用灰色

              return (
                <button
                  key={s.id}
                  onClick={() => handleToggleSeries(s.id)}
                  className="
                    rounded-none border-2 border-black
                    px-3 py-1.5
                    text-sm font-bold
                    shadow-neo-sm
                    transition-transform
                    hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none
                  "
                  style={{
                    backgroundColor: categoryColor,
                    color: '#000000',
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 stroke-[3px]" />
                    {s.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 按分類分組顯示系列標籤 */}
      <div className="flex flex-col gap-4">
        {sortedCategories.map(([categoryId, { name: categoryName, series: categorySeries, color }]) => {
          const unselectedInCategory = categorySeries.filter((s) => !selectedSeriesIds.includes(s.id))

          // 只顯示有未選中系列的分類
          if (unselectedInCategory.length === 0) return null

          return (
            <div key={categoryId} className="flex flex-col gap-2">
              {/* 分類標題 */}
              <h4 className="text-xs font-bold uppercase text-gray-600">{categoryName}</h4>

              {/* 該分類下的系列標籤 */}
              <div className="flex flex-wrap gap-2">
                {unselectedInCategory.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleToggleSeries(s.id)}
                    className="
                      rounded-none border-2 border-black
                      px-3 py-1.5
                      text-sm font-bold
                      shadow-neo
                      transition-transform
                      hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
                    "
                    style={{
                      backgroundColor: color,
                      color: '#000000',
                      opacity: 0.7,
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        {/* 未分類系列 */}
        {uncategorizedSeries.filter((s) => !selectedSeriesIds.includes(s.id)).length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold uppercase text-gray-600">未分類</h4>
            <div className="flex flex-wrap gap-2">
              {uncategorizedSeries
                .filter((s) => !selectedSeriesIds.includes(s.id))
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleToggleSeries(s.id)}
                    className="
                      rounded-none border-2 border-black
                      px-3 py-1.5
                      text-sm font-bold
                      shadow-neo
                      transition-transform
                      hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
                    "
                    style={{
                      backgroundColor: '#D1D5DB', // 未分類使用灰色
                      color: '#000000',
                      opacity: 0.7,
                    }}
                  >
                    {s.name}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
