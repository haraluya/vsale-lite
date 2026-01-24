/**
 * Cart Page
 * Feature: 004-cart-and-orders (US1 - 客戶加入商品到購物車)
 * Feature: 009-coupon-system (優惠券整合)
 * Route: /store/cart
 *
 * 購物車頁面
 * - 顯示購物車商品列表
 * - 支援數量調整、移除商品
 * - 顯示總金額與結帳按鈕
 * - 支援優惠券選擇與折扣計算
 * - 支援購物車持久化 (Zustand persist)
 */

import { generatePageMetadata } from '@/lib/metadata'
import { CartContent } from '@/components/shop/CartContent'

export async function generateMetadata() {
  return generatePageMetadata('購物車', '檢視購物車內容')
}

export default function CartPage() {
  return <CartContent />
}
