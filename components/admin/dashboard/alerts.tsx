import { getDashboardStats } from '@/lib/actions/dashboard'
import { DashboardCard } from '@/components/admin/dashboard-card'
import { TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'

/**
 * 警示與待處理組件 (Server Component - 支援 Streaming)
 * Feature: Performance Optimization - Dashboard Streaming
 */
export async function Alerts() {
  const result = await getDashboardStats()

  if (!result.success || !result.data) {
    return (
      <div className={cn("card-neo", designTokens.spacing.card.padding)}>
        <p className={cn(designTokens.typography.body.base, "text-red-600")}>
          載入警示資訊時發生錯誤
        </p>
      </div>
    )
  }

  const stats = result.data

  return (
    <div>
      <h2 className={cn(designTokens.typography.h3, "mb-3 flex items-center gap-2")}>
        <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
        重要提醒
      </h2>
      <div className={cn("grid grid-cols-1 md:grid-cols-2", designTokens.spacing.grid.gap)}>
        {/* 庫存警示商品數 */}
        <DashboardCard
          title="庫存警示"
          value={stats.lowStockProducts}
          subtitle="庫存低於 10 件的商品"
          iconName="package"
          iconColor={stats.lowStockProducts > 0 ? 'bg-orange-500' : 'bg-gray-400'}
          href="/admin/products"
        />

        {/* 待處理訂單數 */}
        <DashboardCard
          title="待處理訂單"
          value={stats.pendingOrders}
          subtitle="等待確認的訂單"
          iconName="clock"
          iconColor={stats.pendingOrders > 0 ? 'bg-red-500' : 'bg-gray-400'}
          href="/admin/orders?status=pending"
        />
      </div>
    </div>
  )
}
