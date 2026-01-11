/**
 * SeriesSelector Component
 * Feature: 003-series-and-pricing (Enhancement)
 *
 * 系列選擇器 - 用於價格管理頁面
 */

'use client'

import { useRouter } from 'next/navigation'
import type { Series } from '@/types'

interface SeriesSelectorProps {
  series: Series[]
  selectedSeriesId?: string
}

export function SeriesSelector({ series, selectedSeriesId }: SeriesSelectorProps) {
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const seriesId = e.target.value
    if (seriesId) {
      router.push(`/admin/pricing?series_id=${seriesId}`)
    } else {
      router.push('/admin/pricing')
    }
  }

  // 依分類分組系列
  const groupedSeries = series.reduce((acc, s: any) => {
    const categoryName = s.categories?.name || '未分類'
    const categoryColor = s.categories?.color || '#94a3b8'

    if (!acc[categoryName]) {
      acc[categoryName] = {
        color: categoryColor,
        series: []
      }
    }

    acc[categoryName].series.push(s)
    return acc
  }, {} as Record<string, { color: string; series: typeof series }>)

  // 定義10個循環顏色
  const categoryColors = [
    '#93c5fd', // 藍色
    '#86efac', // 綠色
    '#fcd34d', // 黃色
    '#fca5a5', // 紅色
    '#c4b5fd', // 紫色
    '#fdba74', // 橘色
    '#a5f3fc', // 青色
    '#fda4af', // 粉紅色
    '#d9f99d', // 萊姆綠
    '#cbd5e1', // 灰色
  ]

  // 為每個分類分配顏色（循環使用）
  const categoryList = Object.keys(groupedSeries).sort((a, b) =>
    a.localeCompare(b, 'zh-TW')
  )
  const categoryColorMap = categoryList.reduce((acc, category, index) => {
    acc[category] = groupedSeries[category].color || categoryColors[index % categoryColors.length]
    return acc
  }, {} as Record<string, string>)

  return (
    <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
      <div className="mb-4">
        <h2 className="text-xl font-bold">選擇系列 (批量設定)</h2>
        <p className="mt-1 text-sm text-gray-600">
          選擇系列後可批量設定該系列所有商品的價格
        </p>
      </div>

      <select
        value={selectedSeriesId || ''}
        onChange={handleChange}
        className="w-full rounded-none border-3 border-black bg-white px-4 py-3 font-bold shadow-neo-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none focus:outline-none focus:ring-2 focus:ring-black"
      >
        <option value="">請選擇系列...</option>
        {categoryList.map((categoryName) => {
          const categoryData = groupedSeries[categoryName]

          return (
            <optgroup key={categoryName} label={`━━ ${categoryName} ━━`}>
              {categoryData.series
                .sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'))
                .map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {`  ├─ ${s.name}`} {s.status === 'inactive' && '(已停用)'}
                  </option>
                ))}
            </optgroup>
          )
        })}
      </select>

      {/* 分類顏色圖例 */}
      {categoryList.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {categoryList.map((categoryName) => (
            <div
              key={categoryName}
              className="flex items-center gap-1.5 rounded-none border-2 border-black px-2 py-1 text-xs"
              style={{ backgroundColor: categoryColorMap[categoryName] }}
            >
              <div
                className="h-3 w-3 rounded-none border border-black"
                style={{ backgroundColor: categoryColorMap[categoryName] }}
              />
              <span className="font-bold">{categoryName}</span>
            </div>
          ))}
        </div>
      )}

      {series.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">目前沒有可用的系列</p>
      )}
    </div>
  )
}
