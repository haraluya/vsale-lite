import { notFound } from 'next/navigation'
import { getProduct } from '@/lib/actions/products'
import { getCategories } from '@/lib/actions/categories'
import { ProductForm } from '@/components/admin/product-form'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [product, categories] = await Promise.all([getProduct(id), getCategories()])

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

      <ProductForm product={product} categories={categories} mode="edit" />
    </div>
  )
}
