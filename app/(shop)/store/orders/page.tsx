/**
 * Customer Orders List Page
 * Feature: 004-cart-and-orders (US2, US4)
 * Route: /store/orders
 *
 * 客戶訂單列表頁面
 * - 顯示客戶自己的所有訂單
 * - 支援狀態篩選
 * - RLS 自動確保客戶只能看到自己的訂單
 */

import { generatePageMetadata } from '@/lib/metadata'
import { CustomerOrdersContent } from '@/components/shop/CustomerOrdersContent'

export async function generateMetadata() {
  return generatePageMetadata('我的訂單', '查看訂單記錄')
}

export default function CustomerOrdersPage() {
  return <CustomerOrdersContent />
}
