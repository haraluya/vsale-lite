/**
 * Series Detail Page (系列詳情頁)
 * Feature: 003-series-and-pricing (US1 - 客戶瀏覽系列並查看等級價格)
 *
 * 顯示特定系列下的所有商品及其價格
 * - 根據會員等級顯示對應價格
 * - 顯示原價與會員價比較
 * - 顯示庫存狀態
 */

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getSeriesById } from '@/lib/actions/series'
import { getSeriesProductsWithPrice } from '@/lib/actions/shop'
import { SeriesDetailClient } from '@/components/series/SeriesDetailClient'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import { generatePageMetadata } from '@/lib/metadata'

// ISR 快取策略：5 分鐘
export const revalidate = 300

interface SeriesDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: SeriesDetailPageProps) {
  const { id } = await params
  const result = await getSeriesById(id)

  if (!result.success || !result.data) {
    return generatePageMetadata('系列商品', '瀏覽系列商品')
  }

  return generatePageMetadata(
    result.data.name,
    `查看 ${result.data.name} 系列的所有商品`
  )
}

export default async function SeriesDetailPage({ params }: SeriesDetailPageProps) {
  const { id } = await params

  const supabase = await createClient()

  // 檢查登入狀態
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 查詢使用者資料與會員等級
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier_id, tiers(id, name)')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.tiers) {
    redirect('/login')
  }

  // ⚡ 並行化查詢 - 使用 Promise.all 同時執行系列與商品查詢
  const [seriesResult, productsResult] = await Promise.all([
    getSeriesById(id), // 查詢系列資訊
    getSeriesProductsWithPrice(id), // 查詢系列下的所有商品與價格
  ])

  if (!seriesResult.success || !seriesResult.data) {
    notFound()
  }

  const series = seriesResult.data
  const products = productsResult.success ? productsResult.data : []

  const tierName = (profile.tiers as any).name

  return (
    <div className={cn(
      "min-h-screen bg-background",
      designTokens.spacing.page.padding
    )}>
      <div className={cn(
        designTokens.container.default,
        designTokens.spacing.page.gap
      )}>
        {/* 返回按鈕 */}
        <Link
          href="/store"
          className={cn(
            "inline-flex items-center gap-2 rounded-none bg-white font-bold transition-all",
            designTokens.neoBrutalism.border.full,
            "border-black",
            designTokens.neoBrutalism.shadow.mobile,
            "md:shadow-neo",
            designTokens.neoBrutalism.hover,
            "px-3 py-2 md:px-4",
            "min-h-[44px]",  // WCAG 2.1 AA
            designTokens.spacing.section.marginBottom
          )}
        >
          <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          <span className={designTokens.typography.body.base}>返回系列列表</span>
        </Link>

        {/* 系列標題 */}
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
          )}>{series.name}</h1>
          {series.description && (
            <p className={cn(
              designTokens.typography.body.base,
              "text-gray-600"
            )}>{series.description}</p>
          )}
          <p className={cn(
            designTokens.typography.caption,
            "mt-4 text-gray-500"
          )}>
            會員等級: <span className="font-bold">{tierName}</span>
          </p>
        </div>

        {/* 商品列表與圖片切換功能 */}
        <SeriesDetailClient
          series={series}
          products={products || []}
          tierName={tierName}
        />
      </div>
    </div>
  )
}
