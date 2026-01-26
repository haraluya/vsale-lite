import { Suspense } from 'react'
import { getSeries } from '@/lib/actions/series'
import { ProductFilters } from '@/components/admin/products/product-filters'
import { ProductList } from '@/components/admin/products/product-list'
import { ProductListSkeleton } from '@/components/admin/products/product-list-skeleton'
import { SeriesFilterTags } from '@/components/admin/products/series-filter-tags'
import { getPageContainerClasses } from '@/lib/design-tokens'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  return generatePageMetadata('商品管理', '管理所有商品')
}

/**
 * 商品管理頁面
 * Feature: Performance Optimization - Product List Streaming
 *
 * 優化重點：
 * - 篩選器立即顯示（不需等待商品資料載入）
 * - 系列標籤立即顯示（series 資料優先載入）
 * - 商品列表使用 Suspense 邊界支援 Streaming
 * - 預期 FCP: 1.2s → 0.6s (50% 改善)
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    series?: string
    series_ids?: string
    tag_ids?: string
    status?: string
    sort?: string
    order?: string
    page?: string
    limit?: string
  }>
}) {
  const params = await searchParams
  const search = params.search || ''
  const series_id = params.series || ''
  const series_ids_param = params.series_ids || ''
  const series_ids = series_ids_param ? series_ids_param.split(',').filter(Boolean) : undefined
  const tag_ids_param = params.tag_ids || ''
  const tag_ids = tag_ids_param ? tag_ids_param.split(',').filter(Boolean) : undefined
  const status = (params.status as 'active' | 'inactive' | 'all' | 'in_stock' | 'out_of_stock' | 'backorder') || 'all'
  const sort = (params.sort as 'code' | 'series_name' | 'retail_price') || 'code'
  const order = (params.order as 'asc' | 'desc') || 'asc'
  const page = parseInt(params.page || '1')
  const limit = parseInt(params.limit || '20')

  // 立即載入系列資料（優先級高，用於篩選器）
  const seriesResult = await getSeries()
  const series = (seriesResult.success ? seriesResult.data : []) || []

  return (
    <div className={getPageContainerClasses('default')}>
      {/* 篩選器 - 立即顯示 */}
      <ProductFilters series={series} />

      {/* 系列標籤篩選 - 立即顯示 */}
      {series.length > 0 && (
        <div className="card-neo p-4">
          <SeriesFilterTags series={series} />
        </div>
      )}

      {/* 商品列表 - Suspense 邊界支援 Streaming */}
      <Suspense fallback={<ProductListSkeleton />}>
        <ProductList
          search={search}
          series_id={series_id}
          series_ids={series_ids}
          tag_ids={tag_ids}
          status={status}
          sort={sort}
          order={order}
          page={page}
          limit={limit}
        />
      </Suspense>
    </div>
  )
}
