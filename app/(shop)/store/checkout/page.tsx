/**
 * Checkout Page
 * Feature: 004-cart-and-orders (US2 - 客戶送出訂單)
 * Route: /store/checkout
 *
 * 訂單確認頁面
 * - 顯示購物車商品列表與總金額
 * - 填寫訂單備註
 * - 送出訂單並清空購物車
 */

import { generatePageMetadata } from '@/lib/metadata'
import { CheckoutContent } from '@/components/shop/CheckoutContent'

export async function generateMetadata() {
  return generatePageMetadata('結帳', '確認訂單並送出')
}

export default function CheckoutPage() {
  return <CheckoutContent />
}
