import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrders } from '@/lib/actions/orders'
import { OrderTable } from '@/components/admin/order-table'
import { Package } from 'lucide-react'

/**
 * 管理員訂單列表頁面
 * Feature: 004-cart-and-orders / US3
 * Route: /admin/orders
 *
 * - 顯示所有訂單列表
 * - 支援篩選與搜尋
 * - Neo-Brutalism 設計風格
 */

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
        <div className="rounded-none border-3 border-black bg-red-100 p-8 text-center shadow-neo">
          <h2 className="mb-2 text-xl font-bold">載入失敗</h2>
          <p className="text-gray-700">{result.message}</p>
        </div>
      </div>
    )
  }

  if (!result.data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="rounded-none border-3 border-black bg-red-100 p-8 text-center shadow-neo">
          <h2 className="mb-2 text-xl font-bold">載入失敗</h2>
          <p className="text-gray-700">訂單資料不存在</p>
        </div>
      </div>
    )
  }

  const { orders, total } = result.data

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        {/* 標題 */}
        <div className="mb-8 flex items-center gap-4 rounded-none border-3 border-black bg-white p-6 shadow-neo">
          <div className="rounded-none border-2 border-black bg-blue-400 p-3">
            <Package className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">訂單管理</h1>
            <p className="text-gray-600">管理所有客戶訂單</p>
          </div>
        </div>

        {/* 訂單列表 */}
        <OrderTable initialOrders={orders} initialTotal={total} />
      </div>
    </div>
  )
}
