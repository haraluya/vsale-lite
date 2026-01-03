import { getDashboardStats } from '@/lib/actions/dashboard'
import { DashboardCard, DashboardTrendCard } from '@/components/admin/dashboard-card'
import { OrderTrendChart } from '@/components/admin/order-trend-chart'
import { TrendingUp, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designTokens, getPageContainerClasses } from '@/lib/design-tokens'

/**
 * 管理員儀表板頁面
 * Feature: 006-ux-enhancement / US10
 * T077 - 更新儀表板頁面整合指標卡片
 */
export default async function DashboardPage() {
  const result = await getDashboardStats()

  if (!result.success || !result.data) {
    return (
      <div className={getPageContainerClasses('default')}>
        <div>
          <h1 className={designTokens.typography.h1}>儀表板</h1>
          <p className={cn(designTokens.typography.body.base, "mt-1 md:mt-2 text-gray-600")}>歡迎使用 Vsale-lite 管理後台</p>
        </div>
        <div className={cn("card-neo", designTokens.spacing.card.padding)}>
          <p className={cn(designTokens.typography.body.base, "text-red-600")}>載入儀表板資料時發生錯誤,請稍後再試。</p>
        </div>
      </div>
    )
  }

  const stats = result.data

  return (
    <div className={getPageContainerClasses('wide')}>
      {/* 頁面標題 */}
      <div>
        <h1 className={designTokens.typography.h1}>儀表板</h1>
        <p className={cn(designTokens.typography.body.base, "mt-1 md:mt-2 text-gray-600")}>歡迎使用 Vsale-lite 管理後台</p>
      </div>

      {/* 今日統計 */}
      <div>
        <h2 className={cn(designTokens.typography.h3, "mb-3 flex items-center gap-2")}>
          <Calendar className="h-4 w-4 md:h-5 md:w-5" />
          今日概況
        </h2>
        <div className={cn("grid grid-cols-1 md:grid-cols-2", designTokens.spacing.grid.gap)}>
          {/* T078 - 今日訂單數 */}
          <DashboardCard
            title="今日訂單"
            value={stats.todayOrders}
            subtitle={`本月累計 ${stats.monthOrders} 筆`}
            iconName="cart"
            iconColor="bg-blue-500"
            href="/admin/orders"
          />

          {/* T079 - 今日營收 */}
          <DashboardCard
            title="今日營收"
            value={`$${stats.todayRevenue.toLocaleString()}`}
            subtitle={`本月累計 $${stats.monthRevenue.toLocaleString()}`}
            iconName="dollar"
            iconColor="bg-green-500"
            href="/admin/orders"
          />
        </div>
      </div>

      {/* 警示與待處理 */}
      <div>
        <h2 className={cn(designTokens.typography.h3, "mb-3 flex items-center gap-2")}>
          <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
          重要提醒
        </h2>
        <div className={cn("grid grid-cols-1 md:grid-cols-2", designTokens.spacing.grid.gap)}>
          {/* T080 - 庫存警示商品數 */}
          <DashboardCard
            title="庫存警示"
            value={stats.lowStockProducts}
            subtitle="庫存低於 10 件的商品"
            iconName="package"
            iconColor={stats.lowStockProducts > 0 ? 'bg-orange-500' : 'bg-gray-400'}
            href="/admin/products"
          />

          {/* T081 - 待處理訂單數 */}
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

      {/* T082 - 近 7 日訂單趨勢圖表 */}
      <DashboardTrendCard title="近 7 日訂單趨勢" subtitle="訂單數與營收變化趨勢">
        <OrderTrendChart data={stats.orderTrend} />
      </DashboardTrendCard>
    </div>
  )
}
