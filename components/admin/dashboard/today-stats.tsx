import { getDashboardStats } from '@/lib/actions/dashboard'
import { DashboardCard } from '@/components/admin/dashboard-card'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'
import { formatAmount } from '@/lib/date-utils'

/**
 * 今日統計組件 (Server Component - 支援 Streaming)
 * Feature: Performance Optimization - Dashboard Streaming
 */
export async function TodayStats() {
  const result = await getDashboardStats()

  if (!result.success || !result.data) {
    return (
      <div className={cn("card-neo", designTokens.spacing.card.padding)}>
        <p className={cn(designTokens.typography.body.base, "text-red-600")}>
          載入今日統計時發生錯誤
        </p>
      </div>
    )
  }

  const stats = result.data

  return (
    <div>
      <h2 className={cn(designTokens.typography.h3, "mb-3 flex items-center gap-2")}>
        <Calendar className="h-4 w-4 md:h-5 md:w-5" />
        今日概況
      </h2>
      <div className={cn("grid grid-cols-1 md:grid-cols-2", designTokens.spacing.grid.gap)}>
        {/* 今日訂單數 */}
        <DashboardCard
          title="今日訂單"
          value={stats.todayOrders}
          subtitle={`本月累計 ${stats.monthOrders} 筆`}
          iconName="cart"
          iconColor="bg-blue-500"
          href="/admin/orders"
        />

        {/* 今日營收 */}
        <DashboardCard
          title="今日營收"
          value={formatAmount(stats.todayRevenue)}
          subtitle={`本月累計 ${formatAmount(stats.monthRevenue)}`}
          iconName="dollar"
          iconColor="bg-green-500"
          href="/admin/orders"
        />
      </div>
    </div>
  )
}
