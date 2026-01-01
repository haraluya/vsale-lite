import { CategoryForm } from '@/components/admin/category-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewCategoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/categories"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回分類列表
        </Link>
        <h1 className="text-3xl font-bold mt-4">新增商品分類</h1>
        <p className="mt-2 text-gray-600">建立新的商品分類</p>
      </div>

      <div className="card-neo max-w-2xl p-8">
        <CategoryForm mode="create" />
      </div>
    </div>
  )
}
