'use client'

/**
 * Series Filter Tags Component
 * Feature: 016-product-management-enhancements
 *
 * 系列與標籤篩選器元件（多選模式）
 * - 系列篩選：顯示所有系列為彩色標籤
 * - 標籤篩選：顯示所有標籤
 * - 支援多選篩選（點擊切換）
 * - 支援折疊/展開
 * - URL 參數同步（?series_ids=uuid1,uuid2&tag_ids=tag1,tag2）
 * - 同分類系列使用相同顏色
 * - 依分類排序顯示
 * - Neo-Brutalism 設計風格
 */

import type { Series } from '@/types'
import { useRouter, useSearchParams } from 'next/navigation'
import { X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getAvailableTags } from '@/lib/actions/tags'

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

  // 折疊狀態
  const [isSeriesExpanded, setIsSeriesExpanded] = useState(true)
  const [isTagsExpanded, setIsTagsExpanded] = useState(false)

  // 標籤列表
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [isLoadingTags, setIsLoadingTags] = useState(false)

  // 從 URL 參數解析已選擇的系列 ID
  const selectedSeriesIdsParam = searchParams.get('series_ids') || ''
  const selectedSeriesIds = selectedSeriesIdsParam
    ? selectedSeriesIdsParam.split(',').filter(Boolean)
    : []

  // 從 URL 參數解析已選擇的標籤
  const selectedTagsParam = searchParams.get('tag_ids') || ''
  const selectedTags = selectedTagsParam
    ? selectedTagsParam.split(',').filter(Boolean)
    : []

  // 載入所有標籤
  useEffect(() => {
    async function loadTags() {
      setIsLoadingTags(true)
      try {
        const result = await getAvailableTags()
        if (result.success && result.data) {
          setAvailableTags(result.data)
        }
      } catch (error) {
        console.error('載入標籤失敗:', error)
      } finally {
        setIsLoadingTags(false)
      }
    }
    loadTags()
  }, [])

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

  const handleToggleTag = (tag: string) => {
    const params = new URLSearchParams(searchParams.toString())

    let newSelectedTags: string[]
    if (selectedTags.includes(tag)) {
      // 移除該標籤
      newSelectedTags = selectedTags.filter((t) => t !== tag)
    } else {
      // 新增該標籤
      newSelectedTags = [...selectedTags, tag]
    }

    if (newSelectedTags.length > 0) {
      params.set('tag_ids', newSelectedTags.join(','))
    } else {
      params.delete('tag_ids')
    }

    // 保留其他參數（如 search、series_ids）
    router.push(`?${params.toString()}`)
  }

  const handleClearAllTags = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('tag_ids')
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

  // 將所有系列按分類排序後平鋪顯示
  const sortedAllSeries: Array<{ series: Series; color: string }> = []

  // 先加入已排序的分類系列
  sortedCategories.forEach(([categoryId, { series: categorySeries, color }]) => {
    categorySeries.forEach((s) => {
      sortedAllSeries.push({ series: s, color })
    })
  })

  // 再加入未分類系列
  uncategorizedSeries.forEach((s) => {
    sortedAllSeries.push({ series: s, color: '#D1D5DB' })
  })

  // 分離已選中和未選中的系列（使用排序後的列表）
  const sortedUnselectedSeries = sortedAllSeries.filter(
    ({ series: s }) => !selectedSeriesIds.includes(s.id)
  )

  // 分離已選中和未選中的標籤
  const selectedTagsList = availableTags.filter((tag) => selectedTags.includes(tag))
  const unselectedTagsList = availableTags.filter((tag) => !selectedTags.includes(tag))

  return (
    <div className="flex flex-col gap-4">
      {/* 系列篩選區塊 */}
      <div className="flex flex-col gap-3">
        {/* 系列篩選標題（可點擊折疊） */}
        <button
          onClick={() => setIsSeriesExpanded(!isSeriesExpanded)}
          className="flex items-center justify-between hover:opacity-80 transition-opacity"
        >
          <h3 className="text-sm font-bold uppercase text-gray-600">系列篩選</h3>
          {isSeriesExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </button>

        {/* 系列篩選內容（可折疊） */}
        {isSeriesExpanded && (
          <>
            {/* 所有系列標籤（未選中的，按分類排序平鋪） */}
            <div className="flex flex-wrap gap-2">
              {sortedUnselectedSeries.map(({ series: s, color }) => (
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

            {/* 已選中的系列（獨立群組） */}
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
                    const categoryColor =
                      s.category_id && categoryMap.has(s.category_id)
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
          </>
        )}
      </div>

      {/* 標籤篩選區塊 */}
      <div className="flex flex-col gap-3 border-t-2 border-black pt-4">
        {/* 標籤篩選標題（可點擊折疊） */}
        <button
          onClick={() => setIsTagsExpanded(!isTagsExpanded)}
          className="flex items-center justify-between hover:opacity-80 transition-opacity"
        >
          <h3 className="text-sm font-bold uppercase text-gray-600">標籤篩選</h3>
          {isTagsExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </button>

        {/* 標籤篩選內容（可折疊） */}
        {isTagsExpanded && (
          <>
            {isLoadingTags ? (
              <div className="text-sm text-gray-500">載入標籤中...</div>
            ) : availableTags.length === 0 ? (
              <div className="text-sm text-gray-500">尚無標籤</div>
            ) : (
              <>
                {/* 所有標籤（未選中的） */}
                <div className="flex flex-wrap gap-2">
                  {unselectedTagsList.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleToggleTag(tag)}
                      className="
                        rounded-none border-2 border-black
                        bg-white
                        px-3 py-1.5
                        text-sm font-bold
                        shadow-neo
                        transition-transform
                        hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
                      "
                      style={{ opacity: 0.7 }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* 已選中的標籤（獨立群組） */}
                {selectedTagsList.length > 0 && (
                  <div className="flex flex-col gap-2 rounded-none border-2 border-black bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase text-gray-700">
                        已選擇 {selectedTagsList.length} 個標籤
                      </h4>
                      <button
                        onClick={handleClearAllTags}
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
                        清除標籤 ({selectedTagsList.length})
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTagsList.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleToggleTag(tag)}
                          className="
                            rounded-none border-2 border-black
                            bg-blue-300
                            px-3 py-1.5
                            text-sm font-bold
                            shadow-neo-sm
                            transition-transform
                            hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none
                          "
                        >
                          <span className="flex items-center gap-1.5">
                            <Check className="h-4 w-4 stroke-[3px]" />
                            {tag}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
