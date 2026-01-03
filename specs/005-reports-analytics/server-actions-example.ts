/**
 * Analytics Server Actions 實作範例
 * Feature: 005-reports-analytics
 * Date: 2026-01-03
 *
 * 說明: 此檔案展示如何建立 Server Actions 來查詢各種 Views 與 Materialized Views
 * 並整合權限檢查、效能監控、快取策略等最佳實踐
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

/**
 * ================================================================
 * 型別定義
 * ================================================================
 */

interface DailySalesData {
  order_date: string
  total_orders: number
  pending_count: number
  confirmed_count: number
  shipping_count: number
  completed_count: number
  cancelled_count: number
  confirmed_revenue: number
  avg_order_value: number
  max_order_value: number
}

interface TopProduct {
  product_id: string
  product_name_snapshot: string
  order_count: number
  total_quantity: number
  total_revenue: number
  avg_price: number
}

interface OrderStatusDist {
  status: string
  order_count: number
  percentage: number
  total_amount: number
  avg_amount: number
}

interface SalesOverviewResponse {
  dailySales: DailySalesData[]
  topProducts: TopProduct[]
  statusDistribution: OrderStatusDist[]
  performanceMetrics?: {
    queryTimeMs: number
    dataPointsRetrieved: number
  }
}

interface StockStatus {
  id: string
  name: string
  sku: string
  current_stock: number
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'negative_stock'
  stock_label: string
  category_name: string
  series_code: string
}

interface LowStockAlert {
  id: string
  name: string
  sku: string
  stock: number
  alert_level: string
  alert_priority: number
}

interface InventoryStatusResponse {
  stockStatus: StockStatus[]
  lowStockAlerts: LowStockAlert[]
  criticalCount: number
  performanceMetrics?: {
    queryTimeMs: number
  }
}

interface CustomerStats {
  id: string
  phone: string
  display_name: string
  tier_name: string
  total_orders: number
  total_spent: number
  avg_order_value: number
  last_order_date: string
  days_since_last_order: number
  orders_last_30days: number
  spent_last_30days: number
}

interface TierDistribution {
  id: string
  tier_name: string
  customer_count: number
  customer_percentage: number
  total_tier_revenue: number
  avg_customer_lifetime_value: number
  active_customers_30days: number
  revenue_last_30days: number
}

interface CustomerAnalyticsResponse {
  customers: CustomerStats[]
  tierDistribution: TierDistribution[]
  totalCustomers: number
  totalRevenue: number
  performanceMetrics?: {
    queryTimeMs: number
  }
}

/**
 * ================================================================
 * 效能監控工具函數
 * ================================================================
 */

function measurePerformance<T>(
  name: string,
  duration: number,
  result: T
): T & { _metrics?: { queryTimeMs: number; operationName: string } } {
  if (duration > 500) {
    console.warn(`[SLOW QUERY] ${name} took ${duration}ms`)
  } else if (duration > 300) {
    console.info(`[QUERY] ${name} took ${duration}ms`)
  }

  return {
    ...result,
    _metrics: {
      queryTimeMs: duration,
      operationName: name,
    },
  }
}

/**
 * ================================================================
 * 銷售報表 Server Actions
 * ================================================================
 */

/**
 * 查詢銷售概況
 * 包含: 日銷售統計、熱銷商品、訂單狀態分佈
 * 效能目標: < 500ms
 * 緩存: 1 小時
 */
export async function getSalesOverview(
  params?: { days?: number; limit?: number }
): Promise<ActionResult<SalesOverviewResponse>> {
  const startTime = performance.now()

  try {
    const { role } = await checkAuth()

    // 僅管理員可存取
    if (role !== 'admin') {
      return {
        success: false,
        message: '僅管理員可存取銷售報表',
      }
    }

    const supabase = await createClient()
    const days = params?.days || 30
    const limit = params?.limit || 20

    // 並行查詢三個視圖（充分利用資料庫連線池）
    const [dailySalesRes, topProductsRes, statusDistRes] = await Promise.all([
      supabase
        .from('vw_daily_sales_summary')
        .select('*')
        .order('order_date', { ascending: false })
        .limit(days),

      supabase
        .from('vw_top_products')
        .select('*')
        .limit(limit),

      supabase
        .from('vw_order_status_distribution')
        .select('*'),
    ])

    // 錯誤檢查
    if (
      dailySalesRes.error ||
      topProductsRes.error ||
      statusDistRes.error
    ) {
      throw new Error(
        `查詢失敗: ${dailySalesRes.error?.message || topProductsRes.error?.message || statusDistRes.error?.message}`
      )
    }

    const duration = performance.now() - startTime

    const response: SalesOverviewResponse = {
      dailySales: dailySalesRes.data || [],
      topProducts: topProductsRes.data || [],
      statusDistribution: statusDistRes.data || [],
    }

    return {
      success: true,
      data: measurePerformance('getSalesOverview', duration, response),
      message: `成功查詢銷售概況 (${duration.toFixed(0)}ms)`,
    }
  } catch (error) {
    const duration = performance.now() - startTime
    console.error('getSalesOverview error:', error)

    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢銷售報表失敗',
    }
  }
}

/**
 * 查詢周度營收趨勢
 * 用途: 繪製營收折線圖
 * 效能目標: < 300ms
 */
export async function getWeeklyRevenueTrend(
  params?: { weeks?: number }
): Promise<ActionResult<any>> {
  const startTime = performance.now()

  try {
    const { role } = await checkAuth()

    if (role !== 'admin') {
      return { success: false, message: '無權限' }
    }

    const supabase = await createClient()
    const weeks = params?.weeks || 12

    const { data, error } = await supabase
      .from('vw_weekly_revenue_trend')
      .select('*')
      .order('week_start', { ascending: false })
      .limit(weeks)

    if (error) {
      throw new Error(`查詢失敗: ${error.message}`)
    }

    const duration = performance.now() - startTime

    return {
      success: true,
      data: measurePerformance('getWeeklyRevenueTrend', duration, {
        trends: data || [],
      }),
      message: `成功查詢週度趨勢 (${duration.toFixed(0)}ms)`,
    }
  } catch (error) {
    console.error('getWeeklyRevenueTrend error:', error)

    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢趨勢資料失敗',
    }
  }
}

/**
 * ================================================================
 * 庫存分析 Server Actions
 * ================================================================
 */

/**
 * 查詢庫存狀態
 * 包含: 即時庫存、缺貨預警、週轉率分析
 * 效能目標: < 300ms
 * 更新頻率: 實時
 */
export async function getInventoryStatus(
  params?: { alert_only?: boolean }
): Promise<ActionResult<InventoryStatusResponse>> {
  const startTime = performance.now()

  try {
    const { role } = await checkAuth()

    if (role !== 'admin') {
      return {
        success: false,
        message: '無權限',
      }
    }

    const supabase = await createClient()

    // 並行查詢
    const [stockRes, alertRes] = await Promise.all([
      params?.alert_only
        ? Promise.resolve({ data: [] }) // 跳過庫存狀態查詢
        : supabase
            .from('vw_stock_status')
            .select('*')
            .order('current_stock', { ascending: true }),

      supabase
        .from('vw_low_stock_alert')
        .select('*')
        .order('alert_priority', { ascending: true }),
    ])

    if ((stockRes.error && !params?.alert_only) || alertRes.error) {
      throw new Error('查詢庫存資料失敗')
    }

    const duration = performance.now() - startTime

    // 統計緊急缺貨數量
    const criticalCount = (alertRes.data || []).filter(
      item => item.alert_level.includes('緊急')
    ).length

    const response: InventoryStatusResponse = {
      stockStatus: (stockRes.data as StockStatus[]) || [],
      lowStockAlerts: (alertRes.data as LowStockAlert[]) || [],
      criticalCount,
    }

    return {
      success: true,
      data: measurePerformance('getInventoryStatus', duration, response),
      message: `成功查詢庫存狀態 (${duration.toFixed(0)}ms, 緊急 ${criticalCount})`,
    }
  } catch (error) {
    const duration = performance.now() - startTime
    console.error('getInventoryStatus error:', error)

    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢庫存分析失敗',
    }
  }
}

/**
 * 查詢庫存週轉率
 * 用途: 分析商品銷售速度與滯銷品
 * 效能目標: < 400ms
 */
export async function getStockTurnoverAnalysis(
  params?: { top_n?: number; sales_velocity?: string }
): Promise<ActionResult<any>> {
  const startTime = performance.now()

  try {
    const { role } = await checkAuth()

    if (role !== 'admin') {
      return { success: false, message: '無權限' }
    }

    const supabase = await createClient()

    let query = supabase
      .from('vw_stock_turnover_analysis')
      .select('*')
      .order('units_sold_last_30days', { ascending: false })

    // 可選過濾: 僅顯示特定銷售速度的商品
    if (params?.sales_velocity) {
      query = query.eq('sales_velocity', params.sales_velocity)
    }

    const { data, error } = await query.limit(params?.top_n || 30)

    if (error) {
      throw new Error(`查詢失敗: ${error.message}`)
    }

    const duration = performance.now() - startTime

    return {
      success: true,
      data: measurePerformance('getStockTurnoverAnalysis', duration, {
        analysis: data || [],
      }),
      message: `成功查詢週轉率分析 (${duration.toFixed(0)}ms)`,
    }
  } catch (error) {
    console.error('getStockTurnoverAnalysis error:', error)

    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢週轉率資料失敗',
    }
  }
}

/**
 * ================================================================
 * 客戶分析 Server Actions
 * ================================================================
 */

/**
 * 查詢客戶分析
 * 資料來源: mv_customer_stats (Materialized View - 需日更新)
 * 效能目標: < 100ms (已預先計算)
 * 快取: 6 小時（因為是 Materialized View，資料延遲 < 24h）
 */
export async function getCustomerAnalytics(
  params?: {
    tierId?: string
    sortBy?: 'spent' | 'orders' | 'recent'
    limit?: number
  }
): Promise<ActionResult<CustomerAnalyticsResponse>> {
  const startTime = performance.now()

  try {
    const { role } = await checkAuth()

    if (role !== 'admin') {
      return {
        success: false,
        message: '無權限',
      }
    }

    const supabase = await createClient()

    // 並行查詢客戶統計與等級分佈
    const [customerRes, tierRes] = await Promise.all([
      (async () => {
        let query = supabase
          .from('mv_customer_stats')
          .select('*')

        // 依等級篩選
        if (params?.tierId) {
          query = query.eq('tier_id', params.tierId)
        }

        // 排序選項
        const sortMap: Record<
          string,
          { column: string; ascending: boolean }
        > = {
          spent: { column: 'total_spent', ascending: false },
          orders: { column: 'total_orders', ascending: false },
          recent: { column: 'last_order_date', ascending: false },
        }
        const sort = sortMap[params?.sortBy || 'spent']
        query = query.order(sort.column, { ascending: sort.ascending })

        return query.limit(params?.limit || 100)
      })(),

      supabase
        .from('mv_tier_distribution')
        .select('*')
        .order('tier_rank', { ascending: true }),
    ])

    if (customerRes.error || tierRes.error) {
      throw new Error('查詢客戶資料失敗')
    }

    const duration = performance.now() - startTime
    const customers = customerRes.data as CustomerStats[]

    // 計算總體統計
    const totalRevenue = (customers || []).reduce(
      (sum, c) => sum + (c.total_spent || 0),
      0
    )

    const response: CustomerAnalyticsResponse = {
      customers,
      tierDistribution: (tierRes.data as TierDistribution[]) || [],
      totalCustomers: customers?.length || 0,
      totalRevenue,
    }

    return {
      success: true,
      data: measurePerformance('getCustomerAnalytics', duration, response),
      message: `成功查詢客戶分析 (${duration.toFixed(0)}ms, ${response.totalCustomers} 客戶)`,
    }
  } catch (error) {
    const duration = performance.now() - startTime
    console.error('getCustomerAnalytics error:', error)

    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢客戶分析失敗',
    }
  }
}

/**
 * ================================================================
 * 自動化與維護 Server Actions
 * ================================================================
 */

/**
 * 刷新客戶分析 Materialized Views
 * 用途: 由 Firebase Cloud Scheduler 定期呼叫 (每日凌晨 2 點)
 * 返回值: 刷新統計資訊
 *
 * 注意: 此 Action 需要 SUPABASE_SERVICE_ROLE_KEY 權限
 * 不應該被前端直接呼叫
 */
export async function refreshCustomerAnalytics(): Promise<
  ActionResult<{
    views: Array<{
      viewName: string
      refreshTimeMs: number
      success: boolean
    }>
    totalTimeMs: number
  }>
> {
  const startTime = performance.now()

  try {
    // 驗證來源 (可選)
    // 實際部署時應驗證 Cron Job 的授權

    const supabase = await createClient()

    // 呼叫 PostgreSQL Function 執行 REFRESH
    const { data, error } = await supabase.rpc('refresh_customer_analytics')

    if (error) {
      throw new Error(`REFRESH 失敗: ${error.message}`)
    }

    const duration = performance.now() - startTime

    // 重新驗證報表頁面快取
    revalidatePath('/admin/analytics')
    revalidatePath('/admin/analytics/customers')

    return {
      success: true,
      data: {
        views: data || [],
        totalTimeMs: duration,
      },
      message: `成功刷新客戶分析視圖 (${duration.toFixed(0)}ms)`,
    }
  } catch (error) {
    const duration = performance.now() - startTime
    console.error('refreshCustomerAnalytics error:', error)

    return {
      success: false,
      message: error instanceof Error ? error.message : '刷新視圖失敗',
    }
  }
}

/**
 * ================================================================
 * 資料匯出 Server Actions
 * ================================================================
 */

/**
 * 匯出銷售報表為 CSV
 * 用途: 管理員下載銷售資料進行進一步分析
 * 效能: < 1 秒 (資料預先計算)
 */
export async function exportSalesReportToCSV(
  params?: { days?: number }
): Promise<ActionResult<{ csvContent: string; fileName: string }>> {
  try {
    const { role } = await checkAuth()

    if (role !== 'admin') {
      return { success: false, message: '無權限' }
    }

    const supabase = await createClient()

    // 查詢資料
    const { data, error } = await supabase
      .from('vw_daily_sales_summary')
      .select('*')
      .order('order_date', { ascending: false })
      .limit(params?.days || 90)

    if (error) {
      throw new Error('查詢資料失敗')
    }

    // 轉換為 CSV
    const headers = [
      '日期',
      '總訂單數',
      '待確認',
      '已確認',
      '出貨中',
      '已完成',
      '已取消',
      '確認營收',
      '平均客單價',
    ]

    const rows = (data || []).map(d => [
      d.order_date,
      d.total_orders,
      d.pending_count,
      d.confirmed_count,
      d.shipping_count,
      d.completed_count,
      d.cancelled_count,
      d.confirmed_revenue.toFixed(2),
      d.avg_order_value.toFixed(2),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n')

    const fileName = `sales_report_${new Date().toISOString().split('T')[0]}.csv`

    return {
      success: true,
      data: { csvContent, fileName },
      message: '銷售報表匯出成功',
    }
  } catch (error) {
    console.error('exportSalesReportToCSV error:', error)

    return {
      success: false,
      message: error instanceof Error ? error.message : '匯出失敗',
    }
  }
}

/**
 * ================================================================
 * 健康檢查 Server Action
 * ================================================================
 */

/**
 * 檢查所有報表視圖的健康狀態
 * 用途: 監控視圖可用性與效能
 */
export async function checkAnalyticsHealth(): Promise<
  ActionResult<{
    views: Array<{
      viewName: string
      exists: boolean
      rowCount: number
      lastQueryMs: number
    }>
    isHealthy: boolean
  }>
> {
  try {
    const { role } = await checkAuth()

    if (role !== 'admin') {
      return { success: false, message: '無權限' }
    }

    const supabase = await createClient()

    const views = [
      'vw_daily_sales_summary',
      'vw_top_products',
      'vw_order_status_distribution',
      'vw_stock_status',
      'vw_low_stock_alert',
      'mv_customer_stats',
      'mv_tier_distribution',
    ]

    const results = await Promise.all(
      views.map(async viewName => {
        const startTime = performance.now()

        try {
          const { data, count, error } = await supabase
            .from(viewName)
            .select('*', { count: 'exact' })
            .limit(1)

          const queryMs = performance.now() - startTime

          return {
            viewName,
            exists: !error,
            rowCount: count || 0,
            lastQueryMs: queryMs,
          }
        } catch {
          return {
            viewName,
            exists: false,
            rowCount: 0,
            lastQueryMs: 0,
          }
        }
      })
    )

    const isHealthy = results.every(
      r => r.exists && r.lastQueryMs < 1000
    )

    return {
      success: true,
      data: { views: results, isHealthy },
      message: isHealthy ? '所有視圖正常' : '部分視圖性能下降',
    }
  } catch (error) {
    console.error('checkAnalyticsHealth error:', error)

    return {
      success: false,
      message: error instanceof Error ? error.message : '健康檢查失敗',
    }
  }
}
