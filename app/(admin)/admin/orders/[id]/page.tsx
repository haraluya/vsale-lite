import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getOrderById, getOrderTimeline } from '@/lib/actions/orders'
import { OrderStatusBadge } from '@/components/shop/order-status-badge'
import { OrderActions } from '@/components/admin/order-actions'
import { OrderCommentSection } from '@/components/admin/order-comment-section'
import { ArrowLeft, User, Phone, Award, Calendar, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designTokens, getPageContainerClasses, getNeoBrutalismClasses } from '@/lib/design-tokens'

/**
 * 管理員訂單詳情頁面
 * Feature: 004-cart-and-orders / US3
 * Feature: 005-responsive-ui (Phase 4 - T022)
 * Route: /admin/orders/[id]
 *
 * - 顯示訂單完整資訊
 * - 支援確認訂單、更新狀態、取消訂單
 * - 顯示操作歷史
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
    <div className={getPageContainerClasses('default')}>
      {/* 返回按鈕 */}
      <Link
        href="/admin/orders"
        className={cn(
          "inline-flex items-center gap-2 rounded-none bg-white font-bold transition-transform",
          getNeoBrutalismClasses({ hover: true }),
          designTokens.button.md
        )}
      >
        <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
        <span>返回訂單列表</span>
      </Link>

      {/* 訂單標題 */}
      <div className={cn(
        "rounded-none bg-white",
        getNeoBrutalismClasses(),
        designTokens.spacing.card.padding
      )}>
        <div className="mb-4 flex flex-col justify-between gap-3 md:gap-4 md:flex-row md:items-center">
          <div>
            <h1 className={cn(designTokens.typography.h1, "mb-2 font-mono")}>{order.order_number}</h1>
            <OrderStatusBadge status={order.status} size="lg" />
          </div>
          <div className={cn(designTokens.typography.caption, "text-gray-600")}>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              建立時間：{formatDate(order.created_at)}
            </div>
          </div>
        </div>

        {/* 客戶資訊 - 響應式單欄/三欄布局 */}
        <div className="grid gap-3 md:gap-4 border-t-2 border-black pt-4 grid-cols-1 md:grid-cols-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
            <div>
              <div className={cn(designTokens.typography.caption, "text-gray-600")}>客戶姓名</div>
              <div className={cn(designTokens.typography.body.base, "font-bold")}>{order.user.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
            <div>
              <div className={cn(designTokens.typography.caption, "text-gray-600")}>手機號碼</div>
              <div className={cn(designTokens.typography.body.base, "font-bold")}>{order.user.phone}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
            <div>
              <div className={cn(designTokens.typography.caption, "text-gray-600")}>會員等級</div>
              <div className={cn(designTokens.typography.body.base, "font-bold")}>{order.user.tier_name}</div>
            </div>
          </div>
        </div>

        {/* 客戶地址與備註 (Feature 007 - US2) */}
        {(order.user.address || order.user.admin_notes) && (
          <div className={cn("mt-3 md:mt-4 border-t-2 border-black pt-3 md:pt-4", designTokens.spacing.card.gap)}>
            {order.user.address && (
              <div>
                <div className={cn(designTokens.typography.caption, "font-bold text-gray-700")}>客戶地址</div>
                <div className={cn(designTokens.typography.body.base, "mt-1 text-gray-900")}>{order.user.address}</div>
              </div>
            )}
            {order.user.admin_notes && (
              <div>
                <div className={cn(designTokens.typography.caption, "font-bold text-yellow-700")}>管理員備註</div>
                <div className={cn(
                  "mt-1 rounded-none border-2 border-yellow-500 bg-yellow-50 p-2 md:p-3 text-yellow-900",
                  designTokens.typography.body.base
                )}>
                  {order.user.admin_notes}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 備註 */}
        {order.notes && (
          <div className="mt-3 md:mt-4 border-t-2 border-black pt-3 md:pt-4">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
              <div>
                <div className={cn(designTokens.typography.caption, "text-gray-600")}>客戶備註</div>
                <div className={cn(designTokens.typography.body.base, "font-medium")}>{order.notes}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 訂單明細 */}
      <div className={cn("rounded-none bg-white", getNeoBrutalismClasses())}>
        <h2 className={cn(
          designTokens.typography.h2,
          "border-b-2 md:border-b-3 border-black bg-gray-100 p-3 md:p-4"
        )}>
          訂單明細
        </h2>
        <div className="divide-y-2 divide-black">
          {order.items.map(item => (
            <div key={item.id} className="grid grid-cols-12 gap-2 md:gap-4 p-3 md:p-4">
              <div className={cn(
                "col-span-12 md:col-span-6 font-bold",
                designTokens.typography.body.base
              )}>
                {item.product_name_snapshot}
              </div>
              <div className={cn(
                "col-span-4 md:col-span-2 text-left md:text-right",
                designTokens.typography.body.base
              )}>
                {formatAmount(item.deal_price)}
              </div>
              <div className={cn(
                "col-span-4 md:col-span-2 text-center",
                designTokens.typography.body.base
              )}>
                × {item.quantity}
              </div>
              <div className={cn(
                "col-span-4 md:col-span-2 text-right font-bold",
                designTokens.typography.body.base
              )}>
                {formatAmount(item.subtotal)}
              </div>
            </div>
          ))}
          {/* 優惠券折扣 (Feature 009) */}
          {order.coupon && (
            <div className="grid grid-cols-12 gap-2 md:gap-4 bg-orange-50 border-t-2 border-black p-3 md:p-4">
              <div className={cn(
                "col-span-12 md:col-span-6 font-bold text-orange-700",
                designTokens.typography.body.base
              )}>
                🎫 優惠券折扣 ({order.coupon.coupon_code})
              </div>
              <div className={cn(
                "col-span-12 md:col-span-6 text-left md:text-right text-orange-700",
                designTokens.typography.caption
              )}>
                {order.coupon.discount_type === 'fixed'
                  ? `現金折扣 NT$ ${order.coupon.discount_value}`
                  : `百分比折扣 ${order.coupon.discount_value}%`}
              </div>
              <div className={cn(
                "col-span-6 md:col-span-8 text-right font-bold text-orange-700",
                designTokens.typography.body.base
              )}>
                折扣金額
              </div>
              <div className={cn(
                "col-span-6 md:col-span-4 text-right font-bold text-orange-700",
                designTokens.typography.body.large
              )}>
                - {formatAmount(order.coupon.discount_amount)}
              </div>
            </div>
          )}
          <div className="grid grid-cols-12 gap-2 md:gap-4 bg-yellow-100 p-3 md:p-4">
            <div className={cn(
              "col-span-6 md:col-span-8 text-right font-bold",
              designTokens.typography.body.base
            )}>
              訂單總金額
            </div>
            <div className={cn(
              "col-span-6 md:col-span-4 text-right font-bold",
              designTokens.typography.h2
            )}>
              {formatAmount(order.total_amount)}
            </div>
          </div>
        </div>
      </div>

      {/* 訂單操作 */}
      <OrderActions
        orderId={order.id}
        orderNumber={order.order_number}
        currentStatus={order.status}
      />

      {/* 操作歷史與留言 (Feature 007 - US1) */}
      <div className={cn(
        "rounded-none bg-white",
        getNeoBrutalismClasses(),
        designTokens.spacing.card.padding
      )}>
        <h2 className={cn(designTokens.typography.h2, "mb-4 md:mb-6")}>訂單溝通與操作歷史</h2>
        <OrderCommentSection orderId={order.id} initialTimelines={timelines} />
      </div>
    </div>
  )
}
