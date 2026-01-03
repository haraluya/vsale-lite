import { getDashboardStats } from '@/lib/actions/dashboard'
import { DashboardCard, DashboardTrendCard } from '@/components/admin/dashboard-card'
import { OrderTrendChart } from '@/components/admin/order-trend-chart'
import { TrendingUp, Calendar } from 'lucide-react'

/**
 * 管理員儀表板頁面
 * Feature: 006-ux-enhancement / US10
 * T077 - 更新儀表板頁面整合指標卡片
 */
export default async function DashboardPage() {
  const result = await getDashboardStats()

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">儀表板</h1>
          <p className="mt-2 text-gray-600">歡迎使用 Vsale-lite 管理後台</p>
        </div>
        <div className="card-neo p-6">
          <p className="text-red-600">載入儀表板資料時發生錯誤，請稍後再試。</p>
        </div>
      </div>
    )
  }

  const stats = result.data

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-3xl font-bold">儀表板</h1>
        <p className="mt-2 text-gray-600">歡迎使用 Vsale-lite 管理後台</p>
      </div>

      {/* 今日統計 */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          今日概況
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          重要提醒
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
