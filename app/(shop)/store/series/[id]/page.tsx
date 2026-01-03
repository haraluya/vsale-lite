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

interface SeriesDetailPageProps {
  params: Promise<{ id: string }>
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

  // 查詢系列資訊
  const seriesResult = await getSeriesById(id)

  if (!seriesResult.success || !seriesResult.data) {
    notFound()
  }

  const series = seriesResult.data

  // 查詢系列下的所有商品與價格
  const productsResult = await getSeriesProductsWithPrice(id)

  const products = productsResult.success ? productsResult.data : []

  const tierName = (profile.tiers as any).name

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        {/* 返回按鈕 */}
        <Link
          href="/store"
          className="mb-6 inline-flex items-center gap-2 rounded-none border-2 border-black bg-white px-4 py-2 font-bold shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          <ArrowLeft className="h-5 w-5" />
          返回系列列表
        </Link>

        {/* 系列標題 */}
        <div className="mb-6 rounded-none border-3 border-black bg-white p-6 shadow-neo">
          <h1 className="mb-2 text-3xl font-bold">{series.name}</h1>
          {series.description && (
            <p className="text-gray-600">{series.description}</p>
          )}
          <p className="mt-4 text-sm text-gray-500">
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
