/**
 * Home Page (前台首頁)
 * Feature: 016-home-page-blocks (Phase 11 - BlockRenderer 整合)
 * ⭐ 優化：Streaming SSR 實現漸進式渲染
 *
 * 客戶端首頁
 * - 使用 Suspense 實現 Streaming SSR（解決白屏問題）
 * - 批次查詢區塊與商品資料（減少 N+1 查詢）
 * - 骨架屏提升使用者體驗
 */

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HomeBlocksList } from './home-blocks-list'
import { HomeBlocksSkeleton } from '@/components/shop/home-blocks-skeleton'
import { generatePageMetadata } from '@/lib/metadata'

// ISR 快取策略：5 分鐘
export const revalidate = 300

export async function generateMetadata() {
  return generatePageMetadata('首頁', '首頁廣告與商品展示')
}

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ⭐ 優化：使用 Streaming SSR 漸進式渲染
  // - 認證檢查優先完成（快速）
  // - 區塊查詢使用 Suspense 包裹（允許漸進式渲染）
  // - 用戶先看到骨架屏，而非白屏
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<HomeBlocksSkeleton />}>
        <HomeBlocksList />
      </Suspense>
    </div>
  )
}
