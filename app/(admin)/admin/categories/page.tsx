import { getCategories } from '@/lib/actions/categories'
import { CategoryTable } from '@/components/admin/category-table'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function CategoriesPage() {
  const categories = await getCategories()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">商品分類管理</h1>
          <p className="mt-2 text-gray-600">管理商品的分類類別</p>
        </div>
        <Link
          href="/admin/categories/new"
          className="inline-flex items-center gap-2 rounded-none border-3 border-black bg-primary px-6 py-3 font-bold text-white transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo"
        >
          <Plus className="h-5 w-5" />
          新增分類
        </Link>
      </div>

      <CategoryTable categories={categories} />
    </div>
  )
}
