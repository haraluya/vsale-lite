'use client'

/**
 * Series Filter Tags Component
 * Feature: 016-product-management-enhancements
 *
 * 系列標籤篩選器元件（多選模式）
 * - 顯示所有系列為彩色標籤
 * - 支援多選篩選（點擊切換）
 * - URL 參數同步（?series_ids=uuid1,uuid2）
 * - 系列使用專屬顏色顯示
 * - Neo-Brutalism 設計風格
 */

import type { Series } from '@/types'
import { useRouter, useSearchParams } from 'next/navigation'
import { X, Check } from 'lucide-react'

interface SeriesFilterTagsProps {
  series: Series[]
}

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

  // 分離已選中和未選中的系列
  const selectedSeries = series.filter((s) => selectedSeriesIds.includes(s.id))
  const unselectedSeries = series.filter((s) => !selectedSeriesIds.includes(s.id))

  return (
    <div className="flex flex-col gap-3">
      {/* 標題 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase text-gray-600">系列篩選</h3>
      </div>

      {/* 所有系列標籤（未選中的） */}
      <div className="flex flex-wrap gap-2">
        {unselectedSeries.map((s) => (
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
              backgroundColor: s.color,
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
            {selectedSeries.map((s) => (
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
                  backgroundColor: s.color,
                  color: '#000000',
                }}
              >
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 stroke-[3px]" />
                  {s.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
