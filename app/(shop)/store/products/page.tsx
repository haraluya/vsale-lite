/**
 * Products Page (前台商品頁)
 * Feature: 003-series-and-pricing (US1 - 客戶瀏覽系列)
 * Feature: 006-ux-enhancement (US1 - 全域搜尋)
 * Feature: 016-home-page-blocks (US1 - 前台路由與導覽切換)
 *
 * 客戶端商品頁
 * - 全域搜尋商品 (US1)
 * - 顯示所有啟用的系列
 * - 點擊系列進入商品列表
 * - Neo-Brutalism 設計風格
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveSeries } from '@/lib/actions/shop'
import { getActiveCategories, getAvailableTags } from '@/lib/actions/products'
import { getActiveComboDealsByTier } from '@/lib/actions/combo-deals'
import { StorePageClient } from '@/components/shop/store-page-client'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import { generatePageMetadata } from '@/lib/metadata'

// ISR 快取策略：5 分鐘
export const revalidate = 300

export async function generateMetadata() {
  return generatePageMetadata('商品列表', '瀏覽所有商品')
}

export default async function ProductsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ⚡ 並行化查詢 - 使用 Promise.all 同時執行所有獨立查詢
  const [seriesResult, categoriesResult, tagsResult, comboDealsResult] = await Promise.all([
    getActiveSeries(), // 查詢所有啟用的系列 (Feature 003)
    getActiveCategories(), // 查詢分類 (Feature 006 - US2)
    getAvailableTags(), // 查詢標籤 (Feature 006 - US2)
    getActiveComboDealsByTier(), // 查詢符合等級的組合優惠 (Feature 021)
  ])

  const series = seriesResult.success ? seriesResult.data : []
  const categories = categoriesResult.success ? categoriesResult.data : []
  const availableTags = tagsResult.success ? tagsResult.data : []
  const comboDeals = comboDealsResult.success ? comboDealsResult.data : []

  return (
    <div className={cn(
      "min-h-screen bg-background",
      designTokens.spacing.page.padding
    )}>
      <div className={cn(
        designTokens.container.default,
        designTokens.spacing.page.gap
      )}>
        {/* Store Content (Search, Filters, Series Grid) */}
        <StorePageClient
          series={series || []}
          categories={categories || []}
          availableTags={availableTags || []}
          comboDeals={comboDeals || []}
        />
      </div>
    </div>
  )
}
