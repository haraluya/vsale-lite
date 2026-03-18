import { getCategories } from '@/lib/actions/categories'
import { CategoryTable } from '@/components/admin/category-table'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designTokens, getPageContainerClasses, getThemeClasses } from '@/lib/design-tokens'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  return generatePageMetadata('商品分類管理', '管理商品分類')
}

export default async function CategoriesPage() {
  const categories = await getCategories()

  return (
    <div className={getPageContainerClasses('default')}>
      <div className="flex flex-col gap-3 md:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={designTokens.typography.h1}>商品分類管理</h1>
          <p className={cn(designTokens.typography.body.base, "mt-1 md:mt-2 text-text-secondary")}>管理商品的分類類別</p>
        </div>
        <Link
          href="/admin/categories/new"
          className={cn(
            "inline-flex items-center gap-2 rounded-theme-sm bg-primary font-bold text-white transition-all",
            getThemeClasses({ hover: true }),
            designTokens.button.md
          )}
        >
          <Plus className="h-4 w-4 md:h-5 md:w-5" />
          新增分類
        </Link>
      </div>

      <CategoryTable categories={categories} />
    </div>
  )
}
