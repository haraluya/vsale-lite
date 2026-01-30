'use client'

/**
 * 系列選擇器元件
 * Feature: 021-combo-deals (T030, T031)
 *
 * 選擇系列並設定順位與數量
 * - 從可用系列中選擇
 * - 調整顯示順位（上移/下移）
 * - 設定每個系列的數量（各選模式）
 */

import { ChevronUp, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Series, Category, ComboMode } from '@/types'
import { designTokens } from '@/lib/design-tokens'

interface SelectedSeries {
  series_id: string
  required_quantity?: number
  display_order: number
}

interface SeriesSelectorProps {
  availableSeries: Series[]
  categories: Category[]
  selectedSeries: SelectedSeries[]
  onChange: (series: SelectedSeries[]) => void
  comboMode: ComboMode
  disabled?: boolean
}

export function SeriesSelector({
  availableSeries,
  categories,
  selectedSeries,
  onChange,
  comboMode,
  disabled = false,
}: SeriesSelectorProps) {
  /**
   * 新增系列
   */
  const handleAddSeries = (seriesId: string) => {
    // 檢查是否已選擇
    if (selectedSeries.some((s) => s.series_id === seriesId)) {
      return
    }

    // 新增到列表末尾
    const newSeries: SelectedSeries = {
      series_id: seriesId,
      required_quantity: comboMode === 'each' ? 1 : undefined,
      display_order: selectedSeries.length,
    }

    onChange([...selectedSeries, newSeries])
  }

  /**
   * 移除系列
   */
  const handleRemoveSeries = (seriesId: string) => {
    const filtered = selectedSeries.filter((s) => s.series_id !== seriesId)

    // 重新計算 display_order
    const reordered = filtered.map((s, index) => ({
      ...s,
      display_order: index,
    }))

    onChange(reordered)
  }

  /**
   * 上移系列
   */
  const handleMoveUp = (index: number) => {
    if (index === 0) return

    const newSeries = [...selectedSeries]
    const temp = newSeries[index]
    newSeries[index] = newSeries[index - 1]
    newSeries[index - 1] = temp

    // 更新 display_order
    const reordered = newSeries.map((s, i) => ({
      ...s,
      display_order: i,
    }))

    onChange(reordered)
  }

  /**
   * 下移系列
   */
  const handleMoveDown = (index: number) => {
    if (index === selectedSeries.length - 1) return

    const newSeries = [...selectedSeries]
    const temp = newSeries[index]
    newSeries[index] = newSeries[index + 1]
    newSeries[index + 1] = temp

    // 更新 display_order
    const reordered = newSeries.map((s, i) => ({
      ...s,
      display_order: i,
    }))

    onChange(reordered)
  }

  /**
   * T031: 更新系列數量（各選模式）
   */
  const handleQuantityChange = (seriesId: string, quantity: number) => {
    const updated = selectedSeries.map((s) =>
      s.series_id === seriesId ? { ...s, required_quantity: quantity } : s
    )
    onChange(updated)
  }

  /**
   * 取得系列名稱
   */
  const getSeriesName = (seriesId: string) => {
    return availableSeries.find((s) => s.id === seriesId)?.name || '未知系列'
  }

  /**
   * 按分類分組系列
   */
  const groupSeriesByCategory = () => {
    // 過濾出未選擇且啟用的系列
    const unselectedSeries = availableSeries
      .filter((s) => !selectedSeries.some((selected) => selected.series_id === s.id))
      .filter((s) => s.status === 'active')

    // 按分類分組
    const grouped = new Map<string, Series[]>()
    const uncategorizedSeries: Series[] = []

    unselectedSeries.forEach((series) => {
      if (!series.category_id) {
        // 未分類的系列
        uncategorizedSeries.push(series)
      } else {
        // 有分類的系列
        if (!grouped.has(series.category_id)) {
          grouped.set(series.category_id, [])
        }
        grouped.get(series.category_id)!.push(series)
      }
    })

    // 按分類的 sort_order 排序
    const sortedCategories = categories
      .sort((a, b) => a.sort_order - b.sort_order)
      .filter((c) => grouped.has(c.id))

    return { grouped, sortedCategories, uncategorizedSeries }
  }

  return (
    <div className="space-y-4">
      {/* 已選擇的系列列表 */}
      {selectedSeries.length > 0 && (
        <div className="space-y-2">
          <p className={`${designTokens.typography.label} mb-2`}>
            已選擇的系列 ({selectedSeries.length})
          </p>

          {selectedSeries.map((series, index) => (
            <div
              key={series.series_id}
              className="border-2 border-black rounded-none p-3 bg-white shadow-neo-sm"
            >
              <div className="flex items-center gap-3">
                {/* 順位調整按鈕 */}
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0 || disabled}
                    className="p-1 border border-black rounded-none hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="上移"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === selectedSeries.length - 1 || disabled}
                    className="p-1 border border-black rounded-none hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="下移"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>

                {/* 順位編號 */}
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center border-2 border-black rounded-none bg-purple-100 font-bold">
                  {index + 1}
                </div>

                {/* 系列名稱 */}
                <div className="flex-1">
                  <span className="font-bold">{getSeriesName(series.series_id)}</span>
                </div>

                {/* T031: 各選模式 - 數量輸入框 */}
                {comboMode === 'each' && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-bold">數量:</label>
                    <input
                      type="number"
                      value={series.required_quantity || 1}
                      onChange={(e) =>
                        handleQuantityChange(series.series_id, parseInt(e.target.value) || 1)
                      }
                      className="w-20 px-2 py-1 border-2 border-black rounded-none text-center font-bold"
                      min="1"
                      disabled={disabled}
                    />
                  </div>
                )}

                {/* 移除按鈕 */}
                <button
                  type="button"
                  onClick={() => handleRemoveSeries(series.series_id)}
                  disabled={disabled}
                  className="p-2 border-2 border-black rounded-none bg-red-100 hover:bg-red-200 disabled:opacity-50"
                  title="移除系列"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 可選擇的系列 */}
      <div>
        <p className={`${designTokens.typography.label} mb-2`}>
          選擇系列 <span className="text-gray-500 text-sm">(最多 5 個)</span>
        </p>

        {selectedSeries.length >= 5 ? (
          <p className="text-sm text-gray-600 py-4 text-center border-2 border-dashed border-gray-300 rounded-none">
            已達最大系列數量 (5 個)
          </p>
        ) : (() => {
          const { grouped, sortedCategories, uncategorizedSeries } = groupSeriesByCategory()

          if (sortedCategories.length === 0 && uncategorizedSeries.length === 0) {
            return (
              <p className="text-sm text-gray-600 py-4 text-center border-2 border-dashed border-gray-300 rounded-none">
                沒有可用的系列，請先建立系列
              </p>
            )
          }

          return (
            <div className="space-y-4">
              {/* 已分類的系列 */}
              {sortedCategories.map((category) => {
                const seriesInCategory = grouped.get(category.id) || []
                if (seriesInCategory.length === 0) return null

                return (
                  <div key={category.id}>
                    {/* 分類標題 */}
                    <h4 className="text-sm font-bold text-gray-700 mb-2 pb-1 border-b-2 border-gray-300">
                      {category.name}
                    </h4>

                    {/* 該分類下的系列 */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {seriesInCategory.map((series) => (
                        <button
                          key={series.id}
                          type="button"
                          onClick={() => handleAddSeries(series.id)}
                          disabled={disabled}
                          className="p-3 border-2 border-black rounded-none bg-white hover:bg-gray-50 hover:shadow-neo-sm transition text-left disabled:opacity-50"
                        >
                          <span className="font-bold text-sm">{series.name}</span>
                          {series.code && (
                            <span className="block text-xs text-gray-600 mt-1">{series.code}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* 未分類的系列 */}
              {uncategorizedSeries.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-2 pb-1 border-b-2 border-gray-300">
                    未分類
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {uncategorizedSeries.map((series) => (
                      <button
                        key={series.id}
                        type="button"
                        onClick={() => handleAddSeries(series.id)}
                        disabled={disabled}
                        className="p-3 border-2 border-black rounded-none bg-white hover:bg-gray-50 hover:shadow-neo-sm transition text-left disabled:opacity-50"
                      >
                        <span className="font-bold text-sm">{series.name}</span>
                        {series.code && (
                          <span className="block text-xs text-gray-600 mt-1">{series.code}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* 提示訊息 */}
      {selectedSeries.length === 0 && (
        <p className="text-sm text-gray-600">請至少選擇一個系列</p>
      )}
    </div>
  )
}
