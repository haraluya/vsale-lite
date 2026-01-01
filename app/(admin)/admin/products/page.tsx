import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getProducts } from '@/lib/actions/products'
import { getCategories } from '@/lib/actions/categories'
import { ProductTable } from '@/components/admin/product-table'
import { Button } from '@/components/ui/button'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; page?: string; limit?: string }>
}) {
  const params = await searchParams
  const search = params.search || ''
  const category_id = params.category || ''
  const page = parseInt(params.page || '1')
  const limit = parseInt(params.limit || '20')

  // 取得商品列表與分類
  const { products, total } = await getProducts({
    search,
    category_id,
    status: 'all', // 管理員可看所有狀態
    page,
    limit,
  })

  const categories = await getCategories()

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

      {/* Products Table */}
      <ProductTable
        products={products}
        categories={categories}
        total={total}
        currentPage={page}
        pageSize={limit}
        searchQuery={search}
        selectedCategory={category_id}
      />
    </div>
  )
}
