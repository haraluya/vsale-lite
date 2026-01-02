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

interface EditSeriesPageProps {
  params: Promise<{ id: string }>
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
