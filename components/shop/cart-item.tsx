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

import { useState, useEffect, memo } from 'react'
import type { CartItemWithProduct } from '@/types'
import Image from 'next/image'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useCartStore } from '@/stores/cart'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CartItemProps {
  item: CartItemWithProduct
}

export const CartItem = memo(function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore()
  const [inputValue, setInputValue] = useState(item.quantity.toString())

  // 當商品數量變更時同步更新輸入框
  useEffect(() => {
    setInputValue(item.quantity.toString())
  }, [item.quantity])

  const handleDecrease = () => {
    if (item.quantity > 1) {
      updateQuantity(item.productId, item.quantity - 1)
    }
  }

  const handleIncrease = () => {
    updateQuantity(item.productId, item.quantity + 1)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // 允許空白（方便清除重新輸入）
    if (value === '') {
      setInputValue('')
      return
    }
    // 只允許數字
    if (!/^\d+$/.test(value)) {
      return
    }
    setInputValue(value)
  }

  const handleInputBlur = () => {
    const newQuantity = parseInt(inputValue, 10)

    // 驗證數量
    if (isNaN(newQuantity) || newQuantity < 1) {
      toast.error('數量必須大於 0')
      setInputValue(item.quantity.toString())
      return
    }

    if (newQuantity > 99999) {
      toast.error('數量不可超過 99,999')
      setInputValue(item.quantity.toString())
      return
    }

    // 更新數量
    if (newQuantity !== item.quantity) {
      updateQuantity(item.productId, newQuantity)
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur() // 觸發 blur 事件
    }
  }

  const handleRemove = () => {
    removeItem(item.productId)
  }

  return (
    <div className={cn(
      "rounded-none bg-white",
      designTokens.neoBrutalism.border.full,
      "border-black",
      designTokens.neoBrutalism.shadow.full,
      designTokens.spacing.card.padding
    )}>
      <div className="flex gap-3 md:gap-4">
        {/* 商品圖片 */}
        <div className={cn(
          "h-16 w-16 md:h-24 md:w-24 flex-shrink-0 overflow-hidden rounded-none bg-gray-100",
          designTokens.neoBrutalism.border.mobile,
          "border-black"
        )}>
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.productName}
              width={96}
              height={96}
              className="h-full w-full object-cover"
              sizes="96px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl md:text-4xl text-gray-300">
              📦
            </div>
          )}
        </div>

        {/* 商品資訊 */}
        <div className="flex flex-1 flex-col justify-between gap-2 md:gap-0">
          <div>
            {/* 系列名稱標籤 */}
            <div className={cn(
              "inline-block rounded-none bg-yellow-100 px-2 py-1 mb-1",
              designTokens.neoBrutalism.border.mobile,
              "border-yellow-400",
              "text-xs font-bold text-yellow-800"
            )}>
              【{item.seriesName}】
            </div>

            <h3 className={cn(
              "line-clamp-2 font-bold",
              designTokens.typography.body.large
            )}>{item.productName}</h3>
            <div className="mt-1">
              {item.price !== null ? (
                <p className={cn(
                  "text-lg md:text-xl font-bold text-green-600"
                )}>NT$ {item.price.toLocaleString()}</p>
              ) : (
                <p className={cn(
                  designTokens.typography.caption,
                  "text-red-600"
                )}>價格未設定</p>
              )}
            </div>
          </div>

          {/* 數量控制與移除按鈕 */}
          <div className="flex items-center justify-between gap-2">
            {/* 數量控制 */}
            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={handleDecrease}
                disabled={item.quantity <= 1}
                className={cn(
                  "rounded-none bg-white transition-all hover:bg-gray-100",
                  designTokens.neoBrutalism.border.mobile,
                  "border-black",
                  "p-1.5 md:p-2",
                  "min-h-[44px] min-w-[44px]", // WCAG 2.1 AA (修正為 44px 標準)
                  "active:translate-x-[1px] active:translate-y-[1px]",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
                aria-label="減少數量"
              >
                <Minus className="h-4 w-4" />
              </button>

              <input
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                className={cn(
                  "w-16 md:w-20 text-center font-bold rounded-none",
                  "border-2 border-black",
                  "px-2 py-1.5 md:py-2",
                  "min-h-[44px]", // WCAG 2.1 AA (修正為 44px 標準)
                  "focus:outline-none focus:ring-2 focus:ring-blue-500",
                  designTokens.typography.body.large
                )}
                aria-label="商品數量"
              />

              <button
                onClick={handleIncrease}
                className={cn(
                  "rounded-none bg-white transition-all hover:bg-gray-100",
                  designTokens.neoBrutalism.border.mobile,
                  "border-black",
                  "p-1.5 md:p-2",
                  "min-h-[44px] min-w-[44px]", // WCAG 2.1 AA (修正為 44px 標準)
                  "active:translate-x-[1px] active:translate-y-[1px]"
                )}
                aria-label="增加數量"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* 移除按鈕 */}
            <button
              onClick={handleRemove}
              className={cn(
                "rounded-none bg-red-100 text-red-600 transition-all hover:bg-red-200",
                designTokens.neoBrutalism.border.mobile,
                "border-black",
                "px-2.5 py-2 md:px-3",
                "min-h-[40px]", // WCAG 2.1 AA
                "active:translate-x-[1px] active:translate-y-[1px]"
              )}
              aria-label="移除商品"
            >
              <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 小計 */}
      <div className={cn(
        "mt-3 md:mt-4 pt-3 md:pt-4",
        designTokens.neoBrutalism.border.mobile,
        "border-t-black"
      )}>
        <div className="flex items-center justify-between">
          <span className={cn(
            designTokens.typography.body.base,
            "text-gray-600"
          )}>小計</span>
          <span className={cn(
            "text-lg md:text-xl font-bold"
          )}>
            NT$ {item.subtotal.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
})
