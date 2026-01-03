'use client'

/**
 * CartItem Component
 * Feature: 004-cart-and-orders (US1 - 客戶加入商品到購物車)
 *
 * 購物車商品項目元件
 * - 顯示商品圖片、名稱、價格、數量
 * - 支援數量調整與移除
 * - Neo-Brutalism 設計風格
 */

import type { CartItemWithProduct } from '@/types'
import Image from 'next/image'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useCartStore } from '@/stores/cart'

interface CartItemProps {
  item: CartItemWithProduct
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore()

  const handleDecrease = () => {
    if (item.quantity > 1) {
      updateQuantity(item.productId, item.quantity - 1)
    }
  }

  const handleIncrease = () => {
    updateQuantity(item.productId, item.quantity + 1)
  }

  const handleRemove = () => {
    removeItem(item.productId)
  }

  return (
    <div className="rounded-none border-3 border-black bg-white p-4 shadow-neo">
      <div className="flex gap-4">
        {/* 商品圖片 */}
        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-none border-2 border-black bg-gray-100">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.productName}
              width={96}
              height={96}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl text-gray-300">
              📦
            </div>
          )}
        </div>

        {/* 商品資訊 */}
        <div className="flex flex-1 flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg line-clamp-2">{item.productName}</h3>
            <div className="mt-1">
              {item.price !== null ? (
                <p className="text-xl font-bold text-green-600">NT$ {item.price.toLocaleString()}</p>
              ) : (
                <p className="text-sm text-red-600">價格未設定</p>
              )}
            </div>
          </div>

          {/* 數量控制與移除按鈕 */}
          <div className="flex items-center justify-between">
            {/* 數量控制 */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDecrease}
                disabled={item.quantity <= 1}
                className="rounded-none border-2 border-black bg-white p-2 transition-all hover:bg-gray-100 active:translate-x-[1px] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="減少數量"
              >
                <Minus className="h-4 w-4" />
              </button>

              <span className="min-w-[3rem] text-center text-lg font-bold">
                {item.quantity}
              </span>

              <button
                onClick={handleIncrease}
                className="rounded-none border-2 border-black bg-white p-2 transition-all hover:bg-gray-100 active:translate-x-[1px] active:translate-y-[1px]"
                aria-label="增加數量"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* 移除按鈕 */}
            <button
              onClick={handleRemove}
              className="rounded-none border-2 border-black bg-red-100 px-3 py-2 text-red-600 transition-all hover:bg-red-200 active:translate-x-[1px] active:translate-y-[1px]"
              aria-label="移除商品"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 小計 */}
      <div className="mt-4 border-t-2 border-black pt-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">小計</span>
          <span className="text-xl font-bold">
            NT$ {item.subtotal.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}
