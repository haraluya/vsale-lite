/**
 * Store Page (前台商品系列列表頁)
 * Feature: 003-series-and-pricing (US1 - 客戶瀏覽系列)
 *
 * 客戶端系列列表頁面
 * - 顯示所有啟用的系列
 * - 點擊系列進入商品列表
 * - Neo-Brutalism 設計風格
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveSeries } from '@/lib/actions/shop'
import { getActiveAnnouncements } from '@/lib/actions/announcements'
import { SeriesCard } from '@/components/shop/series-card'
import { AnnouncementCarousel } from '@/components/announcements/AnnouncementCarousel'

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
  const announcements = announcementsResult.success ? announcementsResult.data : []

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 rounded-none border-3 border-black bg-white p-6 shadow-neo">
          <h1 className="mb-2 text-3xl font-bold">商品系列</h1>
          <p className="text-gray-600">
            {profile?.display_name || profile?.phone} 您好!
          </p>
          {profile?.tiers && (
            <p className="mt-2 text-sm text-gray-500">
              會員等級: <span className="font-bold">{(profile.tiers as any).name}</span>
            </p>
          )}
        </div>

        {/* Announcement Carousel (Feature 007 - US4) */}
        {announcements.length > 0 && (
          <div className="mb-6">
            <AnnouncementCarousel announcements={announcements} />
          </div>
        )}

        {/* Series Grid */}
        {!series || series.length === 0 ? (
          <div className="rounded-none border-3 border-black bg-white p-12 text-center shadow-neo">
            <p className="text-lg text-gray-500">目前沒有可用的商品系列</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {series?.map((s) => (
              <SeriesCard key={s.id} series={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
