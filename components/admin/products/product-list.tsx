import { getProducts } from '@/lib/actions/products'
import { getSeries } from '@/lib/actions/series'
import { SmartProductList } from '@/components/admin/products/smart-product-list'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'

/**
 * Product List Server Component
 * Feature: Performance Optimization - Product List Streaming + Virtual Scroll (Phase 3.1)
 *
 * 獨立的 Server Component，透過 Suspense 邊界支援 Streaming
 * - 商品數量 > 100：自動啟用虛擬滾動
 */

interface ProductListProps {
  search: string
  series_id: string
  series_ids?: string[]
  tag_ids?: string[]
  status?: 'active' | 'inactive' | 'all' | 'in_stock' | 'out_of_stock' | 'backorder'
  sort: 'code' | 'series_name' | 'retail_price'
  order: 'asc' | 'desc'
  page: number
  limit: number
}

export async function ProductList({
  search,
  series_id,
  series_ids,
  tag_ids,
  status = 'all',
  sort,
  order,
  page,
  limit,
}: ProductListProps) {
  // 並行查詢商品列表與系列
  const [productsResult, seriesResult] = await Promise.all([
    getProducts({
      search,
      series_id,
      series_ids,
      tag_ids,
      sort,
      order,
      status,
      page,
      limit,
    }),
    getSeries(),
  ])

  const { products, total } = productsResult
  const series = (seriesResult.success ? seriesResult.data : []) || []

  // 錯誤處理
  if (!products) {
    return (
      <div
        className={cn(
          'rounded-theme-sm bg-white',
          designTokens.cleanCommerce.border.full,
          designTokens.cleanCommerce.shadow.full,
          designTokens.spacing.card.padding
        )}
      >
        <p className={cn(designTokens.typography.body.base, 'text-red-600')}>
          載入商品列表時發生錯誤
        </p>
      </div>
    )
  }

  return (
    <SmartProductList
      products={products}
      series={series}
      total={total}
      currentPage={page}
      pageSize={limit}
      searchQuery={search}
      selectedSeries={series_id}
    />
  )
}
