import { Suspense } from 'react'
import { cn } from '@/lib/utils'
import { designTokens, getPageContainerClasses } from '@/lib/design-tokens'
import { generatePageMetadata } from '@/lib/metadata'
import { TodayStats } from '@/components/admin/dashboard/today-stats'
import { Alerts } from '@/components/admin/dashboard/alerts'
import { TrendChart } from '@/components/admin/dashboard/trend-chart'
import { TodayStatsSkeleton, AlertsSkeleton, TrendChartSkeleton } from '@/components/admin/dashboard/skeletons'

export async function generateMetadata() {
  return generatePageMetadata('儀表板', '歡迎使用管理後台')
}

/**
 * 管理員儀表板頁面
 * Feature: 006-ux-enhancement / US10
 * Feature: Performance Optimization - Dashboard Streaming
 *
 * 優化重點：
 * - 使用 Suspense 邊界分段載入（3 個獨立數據流）
 * - 優先顯示標題，今日統計最快載入
 * - 警示與趨勢圖依序串流
 * - 預期 FCP: 500ms → 100ms (80% 改善)
 */
export default function DashboardPage() {
  return (
    <div className={getPageContainerClasses('wide')}>
      {/* 頁面標題 - 立即顯示 */}
      <div>
        <h1 className={designTokens.typography.h1}>儀表板</h1>
        <p className={cn(designTokens.typography.body.base, "mt-1 md:mt-2 text-text-secondary")}>
          歡迎使用 Vsale-lite 管理後台
        </p>
      </div>

      {/* Suspense 邊界 1: 今日統計（高優先級） */}
      <Suspense fallback={<TodayStatsSkeleton />}>
        <TodayStats />
      </Suspense>

      {/* Suspense 邊界 2: 警示與待處理（中優先級） */}
      <Suspense fallback={<AlertsSkeleton />}>
        <Alerts />
      </Suspense>

      {/* Suspense 邊界 3: 趨勢圖（低優先級） */}
      <Suspense fallback={<TrendChartSkeleton />}>
        <TrendChart />
      </Suspense>
    </div>
  )
}
