import { getDashboardStats } from '@/lib/actions/dashboard'
import { DashboardTrendCard } from '@/components/admin/dashboard-card'
import { LazyTrendChart } from '@/components/admin/dashboard/lazy-trend-chart'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'

/**
 * 趨勢圖組件 (Server Component - 支援 Streaming)
 * Feature: Performance Optimization - Dashboard Streaming
 */
export async function TrendChart() {
  const result = await getDashboardStats()

  if (!result.success || !result.data) {
    return (
      <div className={cn("card-neo", designTokens.spacing.card.padding)}>
        <p className={cn(designTokens.typography.body.base, "text-red-600")}>
          載入趨勢圖時發生錯誤
        </p>
      </div>
    )
  }

  const stats = result.data

  return (
    <DashboardTrendCard title="近 7 日訂單趨勢" subtitle="訂單數與營收變化趨勢">
      <LazyTrendChart data={stats.orderTrend} />
    </DashboardTrendCard>
  )
}
