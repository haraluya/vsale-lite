import { notFound } from 'next/navigation'
import { getProduct } from '@/lib/actions/products'
import { getSeries } from '@/lib/actions/series'
import { ProductForm } from '@/components/admin/product-form'
import { TagManager } from '@/components/admin/tag-manager'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [product, seriesResult] = await Promise.all([getProduct(id), getSeries()])

  const series = (seriesResult.success ? seriesResult.data : []) || []

  if (!product) {
    notFound()
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">編輯商品</h1>
        <p className="mt-2 text-gray-600">
          編輯商品: {product.name} ({product.code})
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* 商品表單 */}
        <div className="lg:col-span-2">
          <ProductForm product={product} series={series} mode="edit" />
        </div>

        {/* 標籤管理 */}
        <div className="lg:col-span-1">
          <div className="rounded-none border-2 md:border-3 border-black bg-white p-6 shadow-neo">
            <h2 className="mb-4 text-xl font-bold">標籤管理</h2>
            <TagManager productId={product.id} initialTags={product.tags || []} />
          </div>
        </div>
      </div>
    </div>
  )
}
