'use client'

/**
 * CartSummary Component
 * Feature: 004-cart-and-orders (US1 - 客戶加入商品到購物車)
 *
 * 購物車摘要元件
 * - 顯示總金額、總數量
 * - 提供結帳按鈕
 * - Neo-Brutalism 設計風格
 */

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'

interface CartSummaryProps {
  totalAmount: number
  totalItems: number
  isEmpty: boolean
}

export function CartSummary({ totalAmount, totalItems, isEmpty }: CartSummaryProps) {
  return (
    <div className="sticky top-24 rounded-none border-3 border-black bg-white p-6 shadow-neo">
      <h2 className="mb-6 text-2xl font-bold">購物車摘要</h2>

      <div className="space-y-4">
        {/* 總數量 */}
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <span className="text-gray-600">商品總數</span>
          <span className="text-xl font-bold">{totalItems} 件</span>
        </div>

        {/* 總金額 */}
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <span className="text-gray-600">總金額</span>
          <span className="text-2xl font-bold text-green-600">
            NT$ {totalAmount.toLocaleString()}
          </span>
        </div>

        {/* 結帳按鈕 */}
        {isEmpty ? (
          <button
            disabled
            className="w-full cursor-not-allowed rounded-none border-3 border-black bg-gray-200 px-6 py-4 text-lg font-bold text-gray-500 opacity-50"
          >
            購物車是空的
          </button>
        ) : (
          <Link
            href="/store/checkout"
            className="flex w-full items-center justify-center gap-2 rounded-none border-3 border-black bg-green-400 px-6 py-4 text-lg font-bold shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            <ShoppingCart className="h-6 w-6" />
            前往結帳
          </Link>
        )}

        {/* 繼續購物按鈕 */}
        <Link
          href="/store"
          className="block w-full rounded-none border-3 border-black bg-white px-6 py-3 text-center font-bold shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          繼續購物
        </Link>
      </div>

      {/* 提示訊息 */}
      <div className="mt-6 rounded-none border-2 border-black bg-yellow-100 p-4">
        <p className="text-sm text-gray-700">
          💡 <strong>提示:</strong> 商品價格為您的會員等級專屬價格,結帳前請確認購物車內容。
        </p>
      </div>
    </div>
  )
}
