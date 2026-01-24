/**
 * Edit Series Page (編輯系列頁面)
 * Feature: 003-series-and-pricing (US2)
 *
 * 管理員編輯系列頁面
 */

import { notFound } from 'next/navigation'
import { getSeriesById } from '@/lib/actions/series'
import { getCategories } from '@/lib/actions/categories'
import { SeriesForm } from '@/components/admin/series-form'
import { generatePageMetadata } from '@/lib/metadata'

interface EditSeriesPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: EditSeriesPageProps) {
  const { id } = await params
  const result = await getSeriesById(id)

  if (!result.success || !result.data) {
    return generatePageMetadata('編輯系列', '修改系列資訊')
  }

  return generatePageMetadata(
    `編輯系列：${result.data.name}`,
    `修改系列 ${result.data.name} 的資訊`
  )
}

export default async function EditSeriesPage({ params }: EditSeriesPageProps) {
  const { id } = await params

  const [seriesResult, categories] = await Promise.all([
    getSeriesById(id),
    getCategories(),
  ])

  if (!seriesResult.success || !seriesResult.data) {
    notFound()
  }

  const series = seriesResult.data

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">編輯系列</h1>
        <p className="mt-2 text-gray-600">編輯系列: {series.name}</p>
      </div>

      <SeriesForm series={series} categories={categories} mode="edit" />
    </div>
  )
}
