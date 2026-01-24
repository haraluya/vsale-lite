import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrders } from '@/lib/actions/orders'
import { OrderTable } from '@/components/admin/order-table'
import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designTokens, getPageContainerClasses, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { generatePageMetadata } from '@/lib/metadata'

/**
 * 管理員訂單列表頁面
 * Feature: 004-cart-and-orders / US3
 * Route: /admin/orders
 *
 * - 顯示所有訂單列表
 * - 支援篩選與搜尋
 * - Neo-Brutalism 設計風格
 */

// 🔧 修復：強制動態渲染，避免快取問題（刪除訂單後需要立即顯示最新資料）
export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return generatePageMetadata('訂單管理', '查看所有訂單')
}

export default async function AdminOrdersPage() {
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

  // 取得訂單列表
  const result = await getOrders()

  if (!result.success) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className={cn(
          "rounded-none bg-red-100 text-center",
          getNeoBrutalismClasses(),
          designTokens.spacing.card.padding
        )}>
          <h2 className={cn(designTokens.typography.h2, "mb-2")}>載入失敗</h2>
          <p className={cn(designTokens.typography.body.base, "text-gray-700")}>{result.message}</p>
        </div>
      </div>
    )
  }

  if (!result.data) {
    return (
      <div className={getPageContainerClasses('default')}>
        <div className={cn(
          "rounded-none bg-red-100 text-center",
          getNeoBrutalismClasses(),
          designTokens.spacing.card.padding
        )}>
          <h2 className={cn(designTokens.typography.h2, "mb-2")}>載入失敗</h2>
          <p className={cn(designTokens.typography.body.base, "text-gray-700")}>訂單資料不存在</p>
        </div>
      </div>
    )
  }

  const { orders, total } = result.data

  return (
    <div className={getPageContainerClasses('default')}>
      {/* 標題 */}
      <div className={cn(
        "flex items-center gap-3 md:gap-4 rounded-none bg-white",
        getNeoBrutalismClasses(),
        designTokens.spacing.card.padding
      )}>
        <div className="rounded-none border-2 border-black bg-blue-400 p-2 md:p-3">
          <Package className="h-6 w-6 md:h-8 md:w-8" />
        </div>
        <div>
          <h1 className={designTokens.typography.h1}>訂單管理</h1>
          <p className={cn(designTokens.typography.body.base, "text-gray-600")}>管理所有客戶訂單</p>
        </div>
      </div>

      {/* 訂單列表 */}
      <OrderTable initialOrders={orders} initialTotal={total} />
    </div>
  )
}
