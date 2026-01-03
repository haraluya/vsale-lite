/**
 * Pricing Management Page (價格管理頁面)
 * Feature: 007-system-enhancement (US5 - 價格管理優化)
 *
 * 管理員價格設定頁面
 * - 選擇系列模式：批量設定該系列所有商品的價格
 * - 選擇商品模式：設定單一商品在所有等級的價格 (NEW)
 */

import { getSeries } from '@/lib/actions/series'
import { getSeriesProductsForPricing } from '@/lib/actions/tier-prices'
import { PricingPageClient } from '@/components/admin/pricing/PricingPageClient'

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
  let selectedSeries = null
  let seriesProducts: any[] = []

  if (seriesId) {
    selectedSeries = series.find((s) => s.id === seriesId) || null

    if (selectedSeries) {
      const seriesProductsResult = await getSeriesProductsForPricing(seriesId)
      seriesProducts = (seriesProductsResult.success ? seriesProductsResult.data : []) || []
    }
  }

  return (
    <PricingPageClient
      series={series}
      selectedSeriesId={seriesId}
      seriesProducts={seriesProducts}
      selectedSeries={selectedSeries}
    />
  )
}
