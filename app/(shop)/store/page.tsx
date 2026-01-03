/**
 * Store Page (前台商店首頁)
 * Feature: 003-series-and-pricing (US1 - 客戶瀏覽系列)
 * Feature: 006-ux-enhancement (US1 - 全域搜尋)
 *
 * 客戶端商店首頁
 * - 全域搜尋商品 (US1)
 * - 顯示所有啟用的系列
 * - 點擊系列進入商品列表
 * - Neo-Brutalism 設計風格
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveSeries } from '@/lib/actions/shop'
import { getActiveAnnouncements } from '@/lib/actions/announcements'
import { getActiveCategories, getAvailableTags } from '@/lib/actions/products'
import { SeriesCard } from '@/components/shop/series-card'
import { AnnouncementCarousel } from '@/components/announcements/AnnouncementCarousel'
import { StoreSearch } from '@/components/shop/store-search'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export default async function StorePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 查詢使用者資料
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, phone, tier_id, tiers(name)')
    .eq('id', user.id)
    .single()

  // 查詢所有啟用的系列 (Feature 003)
  const seriesResult = await getActiveSeries()
  const series = seriesResult.success ? seriesResult.data : []

  // 查詢啟用的廣告 (Feature 007 - US4)
  const announcementsResult = await getActiveAnnouncements()
  const announcements = announcementsResult.success ? (announcementsResult.data || []) : []

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
        {/* Header */}
        <div className={cn(
          "rounded-none bg-white",
          designTokens.neoBrutalism.border.full,
          "border-black",
          designTokens.neoBrutalism.shadow.full,
          designTokens.spacing.card.padding,
          designTokens.spacing.section.marginBottom
        )}>
          <h1 className={cn(
            designTokens.typography.h1,
            "mb-2"
          )}>商品系列</h1>
          <p className={cn(
            designTokens.typography.body.base,
            "text-gray-600"
          )}>
            {profile?.display_name || profile?.phone} 您好!
          </p>
          {profile?.tiers && (
            <p className={cn(
              designTokens.typography.caption,
              "mt-2 text-gray-500"
            )}>
              會員等級: <span className="font-bold">{(profile.tiers as any).name}</span>
            </p>
          )}
        </div>

        {/* Announcement Carousel (Feature 007 - US4) */}
        {announcements.length > 0 && (
          <div className={designTokens.spacing.section.marginBottom}>
            <AnnouncementCarousel announcements={announcements} />
          </div>
        )}

        {/* Search Bar & Filters (Feature 006 - US1, US2) */}
        <div className={designTokens.spacing.section.marginBottom}>
          <StoreSearch
            categories={categories || []}
            availableTags={availableTags || []}
          />
        </div>

        {/* Series Grid */}
        {!series || series.length === 0 ? (
          <div className={cn(
            "rounded-none bg-white text-center",
            designTokens.neoBrutalism.border.full,
            "border-black",
            designTokens.neoBrutalism.shadow.full,
            "p-8 md:p-12"
          )}>
            <p className={cn(
              designTokens.typography.body.large,
              "text-gray-500"
            )}>目前沒有可用的商品系列</p>
          </div>
        ) : (
          <div className={cn(
            "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
            designTokens.spacing.grid.gap
          )}>
            {series?.map((s) => (
              <SeriesCard key={s.id} series={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
