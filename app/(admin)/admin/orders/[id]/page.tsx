import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getOrderById } from '@/lib/actions/orders'
import { confirmOrder } from '@/lib/actions/orders'
import { OrderStatusBadge } from '@/components/shop/order-status-badge'
import { OrderStatusUpdater } from '@/components/admin/order-status-updater'
import { OrderTimeline } from '@/components/admin/order-timeline'
import { OrderCancelButton } from '@/components/admin/order-cancel-button'
import { ArrowLeft, User, Phone, Award, Calendar, FileText } from 'lucide-react'

/**
 * 管理員訂單詳情頁面
 * Feature: 004-cart-and-orders / US3
 * Route: /admin/orders/[id]
 *
 * - 顯示訂單完整資訊
 * - 支援確認訂單、更新狀態、取消訂單
 * - 顯示操作歷史
 * - Neo-Brutalism 設計風格
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

  if (!result.success) {
    notFound()
  }

  const order = result.data

  // 格式化金額
  const formatAmount = (amount: number) => {
    return `NT$ ${amount.toLocaleString()}`
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* 返回按鈕 */}
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 rounded-none border-2 border-black bg-white px-4 py-2 font-bold shadow-neo transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>返回訂單列表</span>
        </Link>

        {/* 訂單標題 */}
        <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
          <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="mb-2 font-mono text-2xl font-bold">{order.order_number}</h1>
              <OrderStatusBadge status={order.status} size="lg" />
            </div>
            <div className="text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                建立時間：{formatDate(order.created_at)}
              </div>
            </div>
          </div>

          {/* 客戶資訊 */}
          <div className="grid gap-4 border-t-2 border-black pt-4 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-600" />
              <div>
                <div className="text-sm text-gray-600">客戶姓名</div>
                <div className="font-bold">{order.user.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-gray-600" />
              <div>
                <div className="text-sm text-gray-600">手機號碼</div>
                <div className="font-bold">{order.user.phone}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-gray-600" />
              <div>
                <div className="text-sm text-gray-600">會員等級</div>
                <div className="font-bold">{order.user.tier_name}</div>
              </div>
            </div>
          </div>

          {/* 備註 */}
          {order.notes && (
            <div className="mt-4 border-t-2 border-black pt-4">
              <div className="flex items-start gap-2">
                <FileText className="h-5 w-5 text-gray-600" />
                <div>
                  <div className="text-sm text-gray-600">客戶備註</div>
                  <div className="font-medium">{order.notes}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 訂單明細 */}
        <div className="rounded-none border-3 border-black bg-white shadow-neo">
          <h2 className="border-b-3 border-black bg-gray-100 p-4 text-xl font-bold">訂單明細</h2>
          <div className="divide-y-2 divide-black">
            {order.items.map(item => (
              <div key={item.id} className="grid grid-cols-12 gap-4 p-4">
                <div className="col-span-6 font-bold">{item.product_name_snapshot}</div>
                <div className="col-span-2 text-right">{formatAmount(item.deal_price)}</div>
                <div className="col-span-2 text-center">× {item.quantity}</div>
                <div className="col-span-2 text-right font-bold">{formatAmount(item.subtotal)}</div>
              </div>
            ))}
            <div className="grid grid-cols-12 gap-4 bg-yellow-100 p-4">
              <div className="col-span-8 text-right font-bold">訂單總金額</div>
              <div className="col-span-4 text-right text-2xl font-bold">{formatAmount(order.total_amount)}</div>
            </div>
          </div>
        </div>

        {/* 訂單操作 */}
        <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
          <h2 className="mb-4 text-xl font-bold">訂單操作</h2>
          <div className="flex flex-wrap gap-4">
            {order.status === 'pending' && (
              <form action={confirmOrder.bind(null, order.id)}>
                <button
                  type="submit"
                  className="rounded-none border-3 border-black bg-green-400 px-6 py-3 font-bold shadow-neo transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  確認訂單（扣減庫存）
                </button>
              </form>
            )}
            <OrderStatusUpdater orderId={order.id} currentStatus={order.status} />
            <OrderCancelButton orderId={order.id} currentStatus={order.status} orderNumber={order.order_number} />
          </div>
        </div>

        {/* 操作歷史 */}
        <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
          <h2 className="mb-4 text-xl font-bold">操作歷史</h2>
          <OrderTimeline timelines={order.timelines || []} />
        </div>
      </div>
    </div>
  )
}
