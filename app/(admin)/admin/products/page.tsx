import Link from 'next/link'
import { Plus, Tags } from 'lucide-react'
import { getProducts } from '@/lib/actions/products'
import { getCategories } from '@/lib/actions/categories'
import { ProductTable } from '@/components/admin/product-table'
import { ProductTableWithTags } from '@/components/admin/product-table-with-tags'
import { SeriesFilterTags } from '@/components/admin/products/series-filter-tags'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { designTokens, getPageContainerClasses } from '@/lib/design-tokens'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  return generatePageMetadata('商品管理', '管理所有商品')
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    series?: string
    series_ids?: string  // 🆕 Feature 016: 多系列篩選
    tag_ids?: string  // 🆕 標籤篩選
    sort?: string  // 🆕 Feature 016: 排序欄位
    order?: string  // 🆕 Feature 016: 排序方向
    page?: string
    limit?: string
  }>
}) {
  const params = await searchParams
  const search = params.search || ''
  const series_id = params.series || ''  // 🔄 Feature 003: 改為 series_id
  const series_ids_param = params.series_ids || ''  // 🆕 Feature 016: 多系列篩選
  const series_ids = series_ids_param ? series_ids_param.split(',').filter(Boolean) : undefined
  const tag_ids_param = params.tag_ids || ''  // 🆕 標籤篩選
  const tag_ids = tag_ids_param ? tag_ids_param.split(',').filter(Boolean) : undefined
  const sort = (params.sort as 'code' | 'series_name' | 'retail_price') || 'code'  // 🆕 Feature 016
  const order = (params.order as 'asc' | 'desc') || 'asc'  // 🆕 Feature 016
  const page = parseInt(params.page || '1')
  const limit = parseInt(params.limit || '20')

  // 取得商品列表與系列
  const { products, total } = await getProducts({
    search,
    series_id,  // 🔄 Feature 003: 改為 series_id
    series_ids,  // 🆕 Feature 016: 多系列篩選
    tag_ids,  // 🆕 標籤篩選
    sort,  // 🆕 Feature 016: 排序欄位
    order,  // 🆕 Feature 016: 排序方向
    status: 'all', // 管理員可看所有狀態
    page,
    limit,
  })

  const { getSeries } = await import('@/lib/actions/series')
  const seriesResult = await getSeries()
  const series = (seriesResult.success ? seriesResult.data : []) || []

  return (
    <div className={getPageContainerClasses('default')}>
      {/* Header */}
      <div className="flex flex-col gap-3 md:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={designTokens.typography.h1}>商品管理</h1>
          <p className={cn(designTokens.typography.body.base, "mt-1 md:mt-2 text-gray-600")}>管理商品資料、庫存與分類</p>
        </div>

        <div className="flex gap-3">
          <Link href="/admin/products/new">
            <Button>
              <Plus className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              新增商品
            </Button>
          </Link>
        </div>
      </div>

      {/* Series Filter Tags (Feature 016) */}
      {series.length > 0 && (
        <div className="card-neo p-4">
          <SeriesFilterTags series={series} />
        </div>
      )}

      {/* Products Table with Tags Management */}
      <ProductTableWithTags
        products={products}
        series={series}
        total={total}
        currentPage={page}
        pageSize={limit}
        searchQuery={search}
        selectedSeries={series_id}
      />
    </div>
  )
}
