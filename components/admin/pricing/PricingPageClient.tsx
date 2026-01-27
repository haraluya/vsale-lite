/**
 * PricingPageClient Component
 * Feature: 007-system-enhancement (US5 - 價格管理優化)
 *
 * 價格管理頁面客戶端包裝元件
 * - 標籤切換（選擇系列 / 選擇商品）
 * - 管理兩種模式的狀態
 */

'use client'

import { useState } from 'react'
import { SeriesSelector } from '@/components/admin/series-selector'
import { SeriesPriceTable } from '@/components/admin/series-price-table'
import { CategorySelector } from '@/components/admin/category-selector'
import { CategoryPriceTable } from '@/components/admin/pricing/CategoryPriceTable'
import { QuotationGenerator } from '@/components/admin/pricing/QuotationGenerator'
import type { Series, Category, Tier } from '@/types'

interface PricingPageClientProps {
  initialMode?: 'series' | 'category' | 'quotation'
  series: Series[]
  selectedSeriesId?: string
  seriesProducts?: any[]
  selectedSeries?: Series | null
  categories: Category[]
  selectedCategoryId?: string
  categoryProducts?: any[]
  selectedCategory?: Category | null
  tiers: Tier[]
}

export function PricingPageClient({
  initialMode,
  series,
  selectedSeriesId,
  seriesProducts = [],
  selectedSeries = null,
  categories,
  selectedCategoryId,
  categoryProducts = [],
  selectedCategory = null,
  tiers,
}: PricingPageClientProps) {
  const [mode, setMode] = useState<'series' | 'category' | 'quotation'>(initialMode || 'series')

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">價格管理</h1>
        <p className="mt-2 text-gray-600">批量設定商品在各會員等級的價格</p>
      </div>

      {/* 標籤切換 */}
      <div className="mb-6 flex gap-2 rounded-none border-2 md:border-3 border-black bg-white p-2 shadow-neo">
        <button
          onClick={() => setMode('series')}
          className={`flex-1 rounded-none border-2 border-black px-6 py-3 font-bold transition-all ${
            mode === 'series'
              ? 'bg-blue-400 shadow-neo-sm md:shadow-neo translate-x-0 translate-y-0'
              : 'bg-white hover:translate-x-[2px] hover:translate-y-[2px]'
          }`}
        >
          選擇系列
        </button>
        <button
          onClick={() => setMode('category')}
          className={`flex-1 rounded-none border-2 border-black px-6 py-3 font-bold transition-all ${
            mode === 'category'
              ? 'bg-green-400 shadow-neo-sm md:shadow-neo translate-x-0 translate-y-0'
              : 'bg-white hover:translate-x-[2px] hover:translate-y-[2px]'
          }`}
        >
          選擇分類
        </button>
        <button
          onClick={() => setMode('quotation')}
          className={`flex-1 rounded-none border-2 border-black px-6 py-3 font-bold transition-all ${
            mode === 'quotation'
              ? 'bg-purple-400 shadow-neo-sm md:shadow-neo translate-x-0 translate-y-0'
              : 'bg-white hover:translate-x-[2px] hover:translate-y-[2px]'
          }`}
        >
          報價
        </button>
      </div>

      {/* 選擇系列模式 */}
      {mode === 'series' && (
        <div className="space-y-6">
          {/* 系列選擇器 */}
          <SeriesSelector series={series} selectedSeriesId={selectedSeriesId} />

          {/* 系列價格表格 */}
          {selectedSeries && seriesProducts.length > 0 ? (
            <SeriesPriceTable series={selectedSeries} products={seriesProducts} />
          ) : selectedSeriesId && selectedSeries ? (
            <div className="rounded-none border-2 md:border-3 border-black bg-white p-12 text-center shadow-neo">
              <p className="text-lg text-gray-500">此系列尚無商品</p>
            </div>
          ) : (
            <div className="rounded-none border-2 md:border-3 border-black bg-blue-50 p-8 text-center shadow-neo">
              <p className="text-lg font-bold">請選擇系列</p>
              <p className="mt-4 text-sm text-gray-600">
                選擇系列後,可批量設定該系列所有商品在各會員等級的價格
              </p>
              <p className="mt-2 text-sm text-gray-600">
                💡 提示：零售價格由商品的零售價格欄位控制,無法在此修改
              </p>
            </div>
          )}
        </div>
      )}

      {/* 選擇分類模式 */}
      {mode === 'category' && (
        <div className="space-y-6">
          {/* 分類選擇器 */}
          <CategorySelector categories={categories} selectedCategoryId={selectedCategoryId} />

          {/* 分類價格表格 */}
          {selectedCategory && categoryProducts.length > 0 ? (
            <CategoryPriceTable category={selectedCategory} products={categoryProducts} />
          ) : selectedCategoryId && selectedCategory ? (
            <div className="rounded-none border-2 md:border-3 border-black bg-white p-12 text-center shadow-neo">
              <p className="text-lg text-gray-500">此分類尚無商品</p>
            </div>
          ) : (
            <div className="rounded-none border-2 md:border-3 border-black bg-green-50 p-8 text-center shadow-neo">
              <p className="text-lg font-bold">請選擇分類</p>
              <p className="mt-4 text-sm text-gray-600">
                選擇分類後,可批量設定該分類所有商品在各會員等級的價格
              </p>
              <p className="mt-2 text-sm text-gray-600">
                💡 提示：零售價格由商品的零售價格欄位控制,無法在此修改
              </p>
            </div>
          )}
        </div>
      )}

      {/* 報價模式 */}
      {mode === 'quotation' && (
        <div className="space-y-6">
          <QuotationGenerator tiers={tiers} />
        </div>
      )}
    </div>
  )
}
