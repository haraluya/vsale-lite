import Link from 'next/link'
import { Plus, Tags } from 'lucide-react'
import { getProducts } from '@/lib/actions/products'
import { getCategories } from '@/lib/actions/categories'
import { ProductTable } from '@/components/admin/product-table'
import { ProductTableWithTags } from '@/components/admin/product-table-with-tags'
import { Button } from '@/components/ui/button'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; series?: string; page?: string; limit?: string }>
}) {
  const params = await searchParams
  const search = params.search || ''
  const series_id = params.series || ''  // 🔄 Feature 003: 改為 series_id
  const page = parseInt(params.page || '1')
  const limit = parseInt(params.limit || '20')

  // 取得商品列表與系列
  const { products, total } = await getProducts({
    search,
    series_id,  // 🔄 Feature 003: 改為 series_id
    status: 'all', // 管理員可看所有狀態
    page,
    limit,
  })

  const { getSeries } = await import('@/lib/actions/series')
  const seriesResult = await getSeries()
  const series = (seriesResult.success ? seriesResult.data : []) || []

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">商品管理</h1>
          <p className="mt-2 text-gray-600">管理商品資料、庫存與分類</p>
        </div>

        <Link href="/admin/products/new">
          <Button>
            <Plus className="mr-2 h-5 w-5" />
            新增商品
          </Button>
        </Link>
      </div>

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
