/**
 * Customer Order Detail Page
 * Feature: 004-cart-and-orders (US2, US4)
 * Route: /store/orders/[id]
 *
 * 客戶訂單詳情頁面
 * - 顯示訂單完整資訊
 * - 顯示訂單明細與總金額
 * - RLS 自動確保客戶只能看到自己的訂單
 */

import { generatePageMetadata } from '@/lib/metadata'
import { getOrderById } from '@/lib/actions/orders'
import { CustomerOrderDetailContent } from '@/components/shop/CustomerOrderDetailContent'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const result = await getOrderById(id)

  if (!result.success || !result.data) {
    return generatePageMetadata('訂單詳情', '查看訂單詳細資訊')
  }

  return generatePageMetadata(
    `訂單 #${result.data.order_number}`,
    `查看訂單 ${result.data.order_number} 的詳細資訊`
  )
}

export default async function CustomerOrderDetailPage({ params }: PageProps) {
  const { id } = await params

  return <CustomerOrderDetailContent orderId={id} />
}
