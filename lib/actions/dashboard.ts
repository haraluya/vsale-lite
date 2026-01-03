'use server'

import { createClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import type { ActionResult } from '@/types'

/**
 * 儀表板統計資料 Server Actions
 * Feature: 006-ux-enhancement / US10
 */

export interface DashboardStats {
  // 今日訂單統計
  todayOrders: number
  todayRevenue: number

  // 本月訂單統計
  monthOrders: number
  monthRevenue: number

  // 警示與待處理
  lowStockProducts: number // 庫存 < 10
  pendingOrders: number // status = 'pending'

  // 近 7 日趨勢
  orderTrend: Array<{
    date: string // YYYY-MM-DD
    orders: number
    revenue: number
  }>
}

/**
 * 取得儀表板統計資料 (T074)
 * - 今日/本月訂單數與營收 (T078, T079)
 * - 庫存警示商品數 (T080)
 * - 待處理訂單數 (T081)
 * - 近 7 日訂單趨勢 (T082)
 */
export async function getDashboardStats(): Promise<ActionResult<DashboardStats>> {
  try {
    const supabase = await createClient()
    const { role } = await checkAuth()

    // 僅管理員可查看儀表板統計
    if (role !== 'admin') {
      return {
        success: false,
        message: '無權限查看儀表板統計',
      }
    }

    // 計算日期範圍
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const last7Days = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000) // 包含今天共 7 天
    last7Days.setHours(0, 0, 0, 0)

    // T078 - 今日訂單數查詢
    const { count: todayOrdersCount, error: todayOrdersError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())

    if (todayOrdersError) {
      console.error('查詢今日訂單錯誤:', todayOrdersError)
    }

    // T079 - 今日營收查詢
    const { data: todayRevenueData, error: todayRevenueError } = await supabase
      .from('orders')
      .select('total_amount')
      .gte('created_at', todayStart.toISOString())
      .neq('status', 'cancelled') // 不計算已取消訂單

    if (todayRevenueError) {
      console.error('查詢今日營收錯誤:', todayRevenueError)
    }

    const todayRevenue = todayRevenueData?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0

    // T078 - 本月訂單數查詢
    const { count: monthOrdersCount, error: monthOrdersError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthStart.toISOString())

    if (monthOrdersError) {
      console.error('查詢本月訂單錯誤:', monthOrdersError)
    }

    // T079 - 本月營收查詢
    const { data: monthRevenueData, error: monthRevenueError } = await supabase
      .from('orders')
      .select('total_amount')
      .gte('created_at', monthStart.toISOString())
      .neq('status', 'cancelled') // 不計算已取消訂單

    if (monthRevenueError) {
      console.error('查詢本月營收錯誤:', monthRevenueError)
    }

    const monthRevenue = monthRevenueData?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0

    // T080 - 庫存警示商品數查詢 (stock < 10)
    const { count: lowStockCount, error: lowStockError } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .lt('stock', 10)
      .eq('status', 'active')

    if (lowStockError) {
      console.error('查詢庫存警示錯誤:', lowStockError)
    }

    // T081 - 待處理訂單數查詢 (status = 'pending')
    const { count: pendingOrdersCount, error: pendingOrdersError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (pendingOrdersError) {
      console.error('查詢待處理訂單錯誤:', pendingOrdersError)
    }

    // T082 - 近 7 日訂單趨勢圖表
    const { data: trendData, error: trendError } = await supabase
      .from('orders')
      .select('created_at, total_amount, status')
      .gte('created_at', last7Days.toISOString())
      .order('created_at', { ascending: true })

    if (trendError) {
      console.error('查詢訂單趨勢錯誤:', trendError)
    }

    // 處理趨勢資料 - 依日期分組
    const trendMap = new Map<string, { orders: number; revenue: number }>()

    // 初始化近 7 日的日期
    for (let i = 0; i < 7; i++) {
      const date = new Date(last7Days.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      trendMap.set(dateStr, { orders: 0, revenue: 0 })
    }

    // 填充實際資料
    trendData?.forEach((order) => {
      const dateStr = order.created_at.split('T')[0]
      const existing = trendMap.get(dateStr)
      if (existing) {
        existing.orders += 1
        if (order.status !== 'cancelled') {
          existing.revenue += Number(order.total_amount)
        }
      }
    })

    // 轉換為陣列
    const orderTrend = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      orders: data.orders,
      revenue: data.revenue,
    }))

    const stats: DashboardStats = {
      todayOrders: todayOrdersCount || 0,
      todayRevenue,
      monthOrders: monthOrdersCount || 0,
      monthRevenue,
      lowStockProducts: lowStockCount || 0,
      pendingOrders: pendingOrdersCount || 0,
      orderTrend,
    }

    return {
      success: true,
      data: stats,
    }
  } catch (error) {
    console.error('取得儀表板統計錯誤:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '取得儀表板統計時發生未知錯誤',
    }
  }
}
