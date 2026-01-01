import { getCategories } from '@/lib/actions/categories'
import { ProductForm } from '@/components/admin/product-form'

export default async function NewProductPage() {
  const categories = await getCategories()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">新增商品</h1>
        <p className="mt-2 text-gray-600">建立新的商品資料</p>
      </div>

      <ProductForm categories={categories} mode="create" />
    </div>
  )
}
