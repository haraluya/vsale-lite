/**
 * New Combo Deal Page (新增組合優惠頁面)
 * Feature: 021-combo-deals (T034)
 *
 * 管理員新增組合優惠頁面
 */

import { getActiveSeries } from '@/lib/actions/shop'
import { getTiers } from '@/lib/actions/tiers'
import { getCategories } from '@/lib/actions/categories'
import { ComboDealForm } from '@/components/admin/combo-deals/ComboDealForm'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  return generatePageMetadata('新增組合優惠', '建立新的組合優惠活動')
}

export default async function NewComboDealPage() {
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
        <h1 className="text-3xl font-bold">新增組合優惠</h1>
        <p className="mt-2 text-gray-600">建立新的組合優惠活動</p>
      </div>

      <ComboDealForm series={series} tiers={tiers} categories={categories} mode="create" />
    </div>
  )
}
