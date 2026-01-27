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
import { getCategories } from '@/lib/actions/categories'
import { getCategoryProductsForPricing } from '@/lib/actions/categories-pricing'
import { getTiers } from '@/lib/actions/tiers'
import { PricingPageClient } from '@/components/admin/pricing/PricingPageClient'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  return generatePageMetadata('批次價格設定', '批量設定商品價格')
}

// 禁用所有快取，確保每次都取得最新資料
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PricingPageProps {
  searchParams: Promise<{ series_id?: string; category_id?: string }>
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const params = await searchParams
  const seriesId = params.series_id
  const categoryId = params.category_id

  // 取得所有系列列表
  const seriesResult = await getSeries()
  const series = (seriesResult.success ? seriesResult.data : []) || []

  // 取得所有分類列表
  const categories = await getCategories()

  // 取得所有等級列表 (用於報價功能)
  const tiersResult = await getTiers()
  const tiers = (tiersResult.success ? tiersResult.data : []) || []

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

  // 若已選擇分類,載入該分類的商品與價格
  let selectedCategory = null
  let categoryProducts: any[] = []

  if (categoryId) {
    selectedCategory = categories.find((c) => c.id === categoryId) || null

    if (selectedCategory) {
      const categoryProductsResult = await getCategoryProductsForPricing(categoryId)
      categoryProducts = (categoryProductsResult.success ? categoryProductsResult.data : []) || []
    }
  }

  return (
    <PricingPageClient
      series={series}
      selectedSeriesId={seriesId}
      seriesProducts={seriesProducts}
      selectedSeries={selectedSeries}
      categories={categories}
      selectedCategoryId={categoryId}
      categoryProducts={categoryProducts}
      selectedCategory={selectedCategory}
      tiers={tiers}
    />
  )
}
