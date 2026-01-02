import { notFound } from 'next/navigation'
import { getProduct } from '@/lib/actions/products'
import { getSeries } from '@/lib/actions/series'
import { ProductForm } from '@/components/admin/product-form'

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

      <ProductForm product={product} series={series} mode="edit" />
    </div>
  )
}
