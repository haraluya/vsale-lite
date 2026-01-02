/**
 * Pricing Management Page (價格管理頁面)
 * Feature: 003-series-and-pricing (US2 + Enhancement)
 *
 * 管理員批量價格設定頁面
 * - 模式 1: 單一商品設定 (選擇商品)
 * - 模式 2: 系列批量設定 (選擇系列)
 */

import { getProducts } from '@/lib/actions/products'
import { getSeries } from '@/lib/actions/series'
import { getAllTiersWithPrices, getSeriesProductsForPricing } from '@/lib/actions/tier-prices'
import { TierPriceTable } from '@/components/admin/tier-price-table'
import { ProductSelector } from '@/components/admin/product-selector'
import { SeriesSelector } from '@/components/admin/series-selector'
import { SeriesPriceTable } from '@/components/admin/series-price-table'
import { Suspense } from 'react'

interface PricingPageProps {
  searchParams: Promise<{ product_id?: string; series_id?: string }>
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const params = await searchParams
  const productId = params.product_id
  const seriesId = params.series_id

  // 取得所有系列與商品列表
  const seriesResult = await getSeries()
  const series = (seriesResult.success ? seriesResult.data : []) || []

  const { products } = await getProducts({
    status: 'all',
    limit: 1000,
  })

  // 模式 1: 系列批量設定
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

  // 模式 2: 單一商品設定
  if (productId) {
    const selectedProduct = products.find((p) => p.id === productId) || null
    let tiersWithPrices: any[] = []

    if (selectedProduct) {
      const tiersResult = await getAllTiersWithPrices(productId)
      tiersWithPrices = (tiersResult.success ? tiersResult.data : []) || []
    }

    return (
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">價格管理 - 單一商品設定</h1>
          <p className="mt-2 text-gray-600">選擇商品後設定各等級的價格</p>
        </div>

        {/* 商品選擇器 */}
        <div className="mb-6">
          <ProductSelector products={products} selectedProductId={productId} />
        </div>

        {/* 等級價格設定表格 */}
        {selectedProduct && tiersWithPrices.length > 0 ? (
          <Suspense fallback={<div>載入中...</div>}>
            <TierPriceTable product={selectedProduct} tiersWithPrices={tiersWithPrices} />
          </Suspense>
        ) : selectedProduct ? (
          <div className="rounded-none border-3 border-black bg-white p-12 text-center shadow-neo">
            <p className="text-lg text-gray-500">無法載入等級資料</p>
          </div>
        ) : (
          <div className="rounded-none border-3 border-black bg-white p-12 text-center shadow-neo">
            <p className="text-lg text-gray-500">無法載入商品資料</p>
          </div>
        )}
      </div>
    )
  }

  // 預設狀態: 顯示選擇器
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">價格管理</h1>
        <p className="mt-2 text-gray-600">選擇系列或商品來批量設定價格</p>
      </div>

      {/* 系列選擇器 */}
      <div className="mb-6">
        <SeriesSelector series={series} />
      </div>

      {/* 分隔線 */}
      <div className="my-8 flex items-center">
        <div className="flex-1 border-t-2 border-black"></div>
        <span className="mx-4 font-bold text-gray-500">或</span>
        <div className="flex-1 border-t-2 border-black"></div>
      </div>

      {/* 商品選擇器 */}
      <div className="mb-6">
        <ProductSelector products={products} />
      </div>

      {/* 提示訊息 */}
      <div className="rounded-none border-3 border-black bg-blue-50 p-8 text-center shadow-neo">
        <p className="text-lg font-bold">請選擇設定模式</p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-none border-2 border-black bg-white p-4">
            <h3 className="font-bold">系列批量設定</h3>
            <p className="mt-2 text-sm text-gray-600">
              一次設定整個系列所有商品的價格,適合批量操作
            </p>
          </div>
          <div className="rounded-none border-2 border-black bg-white p-4">
            <h3 className="font-bold">單一商品設定</h3>
            <p className="mt-2 text-sm text-gray-600">
              針對單一商品精確設定價格,適合個別調整
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
