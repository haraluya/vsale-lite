/**
 * Pricing Management Page (價格管理頁面)
 * Feature: 003-series-and-pricing (US2 + Enhancement)
 *
 * 管理員系列批量價格設定頁面
 * - 選擇系列後批量設定該系列所有商品的價格
 */

import { getSeries } from '@/lib/actions/series'
import { getSeriesProductsForPricing } from '@/lib/actions/tier-prices'
import { SeriesSelector } from '@/components/admin/series-selector'
import { SeriesPriceTable } from '@/components/admin/series-price-table'
import { Suspense } from 'react'

interface PricingPageProps {
  searchParams: Promise<{ series_id?: string }>
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const params = await searchParams
  const seriesId = params.series_id

  // 取得所有系列列表
  const seriesResult = await getSeries()
  const series = (seriesResult.success ? seriesResult.data : []) || []

  // 若已選擇系列,載入該系列的商品與價格
  if (seriesId) {
    const selectedSeries = series.find((s) => s.id === seriesId) || null
    let seriesProducts: any[] = []

    if (selectedSeries) {
      const seriesProductsResult = await getSeriesProductsForPricing(seriesId)
      seriesProducts = (seriesProductsResult.success ? seriesProductsResult.data : []) || []
    }

    return (
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">價格管理 - 系列批量設定</h1>
          <p className="mt-2 text-gray-600">選擇系列後批量設定該系列所有商品的價格</p>
        </div>

        {/* 系列選擇器 */}
        <div className="mb-6">
          <SeriesSelector series={series} selectedSeriesId={seriesId} />
        </div>

        {/* 系列價格表格 */}
        {selectedSeries && seriesProducts.length > 0 ? (
          <Suspense fallback={<div>載入中...</div>}>
            <SeriesPriceTable series={selectedSeries} products={seriesProducts} />
          </Suspense>
        ) : selectedSeries ? (
          <div className="rounded-none border-3 border-black bg-white p-12 text-center shadow-neo">
            <p className="text-lg text-gray-500">此系列尚無商品</p>
          </div>
        ) : (
          <div className="rounded-none border-3 border-black bg-white p-12 text-center shadow-neo">
            <p className="text-lg text-gray-500">無法載入系列資料</p>
          </div>
        )}
      </div>
    )
  }

  // 預設狀態: 顯示系列選擇器
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">價格管理</h1>
        <p className="mt-2 text-gray-600">選擇系列後批量設定該系列所有商品的價格</p>
      </div>

      {/* 系列選擇器 */}
      <div className="mb-6">
        <SeriesSelector series={series} />
      </div>

      {/* 提示訊息 */}
      <div className="rounded-none border-3 border-black bg-blue-50 p-8 text-center shadow-neo">
        <p className="text-lg font-bold">請選擇系列</p>
        <p className="mt-4 text-sm text-gray-600">
          選擇系列後,可批量設定該系列所有商品在各會員等級的價格
        </p>
        <p className="mt-2 text-sm text-gray-600">
          💡 提示：零售價格由商品的零售價格欄位控制,無法在此修改
        </p>
      </div>
    </div>
  )
}
