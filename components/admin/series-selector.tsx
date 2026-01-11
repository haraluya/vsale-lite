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

    if (!acc[categoryName]) {
      acc[categoryName] = {
        series: []
      }
    }

    acc[categoryName].series.push(s)
    return acc
  }, {} as Record<string, { series: typeof series }>)

  const categoryList = Object.keys(groupedSeries).sort((a, b) =>
    a.localeCompare(b, 'zh-TW')
  )

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

      {series.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">目前沒有可用的系列</p>
      )}
    </div>
  )
}
