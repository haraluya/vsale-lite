import Link from 'next/link'
import { Plus, Tags } from 'lucide-react'
import { getProducts } from '@/lib/actions/products'
import { getCategories } from '@/lib/actions/categories'
import { ProductTable } from '@/components/admin/product-table'
import { ProductTableWithTags } from '@/components/admin/product-table-with-tags'
import { ExcelTemplateDownload } from '@/components/admin/products/excel-template-download'
import { ExcelExport } from '@/components/admin/products/excel-export'
import { ExcelImport } from '@/components/admin/products/excel-import'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { designTokens, getPageContainerClasses } from '@/lib/design-tokens'

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
    <div className={getPageContainerClasses('default')}>
      {/* Header */}
      <div className="flex flex-col gap-3 md:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={designTokens.typography.h1}>商品管理</h1>
          <p className={cn(designTokens.typography.body.base, "mt-1 md:mt-2 text-gray-600")}>管理商品資料、庫存與分類</p>
        </div>

        <div className="flex gap-3">
          <ExcelTemplateDownload />
          <ExcelExport />
          <Link href="/admin/products/new">
            <Button>
              <Plus className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              新增商品
            </Button>
          </Link>
        </div>
      </div>

      {/* Excel 匯入區塊 */}
      <ExcelImport />

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
