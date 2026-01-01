import { createClient } from '@/lib/supabase/server'
import { CategoryForm } from '@/components/admin/category-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Category } from '@/types'

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: category, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !category) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/categories"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        返回分類列表
      </Link>

      <div>
        <h1 className="text-3xl font-bold">編輯商品分類</h1>
        <p className="mt-2 text-gray-600">修改「{category.name}」分類資訊</p>
      </div>

      <div className="card-neo max-w-2xl p-8">
        <CategoryForm mode="edit" category={category as Category} />
      </div>
    </div>
  )
}
