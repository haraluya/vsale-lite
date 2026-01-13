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
import { StorePageClient } from '@/components/shop/store-page-client'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export default async function ProductsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 查詢所有啟用的系列 (Feature 003)
  const seriesResult = await getActiveSeries()
  const series = seriesResult.success ? seriesResult.data : []

  // 查詢分類與標籤 (Feature 006 - US2)
  const categoriesResult = await getActiveCategories()
  const categories = categoriesResult.success ? categoriesResult.data : []

  const tagsResult = await getAvailableTags()
  const availableTags = tagsResult.success ? tagsResult.data : []

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
        />
      </div>
    </div>
  )
}
