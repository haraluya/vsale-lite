import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrderById, getOrderTimeline } from '@/lib/actions/orders'
import { OrderDetailContent } from '@/components/admin/orders/order-detail-content'

/**
 * 管理員訂單詳情頁面
 * Feature: 004-cart-and-orders / US3
 * Feature: 005-responsive-ui (Phase 4 - T022)
 * Feature: 011-shipping-and-order-edit / US3 (Phase 6 - 訂單編輯)
 * Route: /admin/orders/[id]
 *
 * - 顯示訂單完整資訊
 * - 支援訂單編輯（僅 pending 狀態）
 * - 支援確認訂單、更新狀態、取消訂單
 * - 顯示操作歷史與修改記錄
 * - Neo-Brutalism 設計風格
 * - 響應式布局（手機/平板/桌面）
 */

interface AdminOrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const { id } = await params

  // 驗證管理員權限
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') {
    redirect('/store')
  }

  // 取得訂單詳情
  const result = await getOrderById(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const order = result.data

  // 取得訂單時間軸（含留言）
  const timelineResult = await getOrderTimeline(id)
  const timelines = timelineResult.success && timelineResult.data ? timelineResult.data : []

  return <OrderDetailContent order={order} timelines={timelines} />
}
