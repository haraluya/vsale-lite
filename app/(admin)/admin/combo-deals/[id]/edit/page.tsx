/**
 * Edit Combo Deal Page (編輯組合優惠頁面)
 * Feature: 021-combo-deals (T035)
 *
 * 管理員編輯組合優惠頁面
 */

import { notFound } from 'next/navigation'
import { getComboDealDetail } from '@/lib/actions/combo-deals'
import { getActiveSeries } from '@/lib/actions/shop'
import { getTiers } from '@/lib/actions/tiers'
import { getCategories } from '@/lib/actions/categories'
import { ComboDealForm } from '@/components/admin/combo-deals/ComboDealForm'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return generatePageMetadata('編輯組合優惠', '編輯現有的組合優惠活動')
}

export default async function EditComboDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 載入組合優惠資料
  const result = await getComboDealDetail(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const comboDeal = result.data

  // 載入系列資料
  const seriesResult = await getActiveSeries()
  const series = seriesResult.success && seriesResult.data ? seriesResult.data : []

  // 載入等級資料
  const tiersResult = await getTiers()
  const tiers = tiersResult.success && tiersResult.data ? tiersResult.data : []

  // 載入分類資料
  const categoriesResult = await getCategories()
  const categories = categoriesResult.success && categoriesResult.data ? categoriesResult.data : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">編輯組合優惠</h1>
        <p className="mt-2 text-gray-600">{comboDeal.name}</p>
      </div>

      <ComboDealForm comboDeal={comboDeal} series={series} tiers={tiers} categories={categories} mode="edit" />
    </div>
  )
}
