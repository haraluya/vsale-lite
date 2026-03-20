/**
 * New Series Page (新增系列頁面)
 * Feature: 003-series-and-pricing (US2)
 *
 * 管理員新增系列頁面
 */

import { getCategories } from '@/lib/actions/categories'
import { SeriesForm } from '@/components/admin/series-form'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  return generatePageMetadata('新增商品系列', '建立新的商品系列')
}

export default async function NewSeriesPage() {
  const categories = await getCategories()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">新增系列</h1>
        <p className="mt-2 text-text-secondary">建立新的商品系列</p>
      </div>

      <SeriesForm categories={categories} mode="create" />
    </div>
  )
}
