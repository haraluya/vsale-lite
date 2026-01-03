/**
 * ProductWithPriceCard Component
 * Feature: 003-series-and-pricing (US1)
 * Updated: 004-cart-and-orders (US1 - 新增「加入購物車」按鈕)
 *
 * 帶價格顯示的商品卡片元件(用於系列詳情頁)
 * - 顯示原價與會員等級價格
 * - 顯示折扣力度
 * - 顯示庫存狀態
 * - 支援加入購物車 (Feature 004)
 * - Neo-Brutalism 設計風格
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Plus } from 'lucide-react'
import { StockStatus } from './stock-status'
import { useCartStore } from '@/stores/cart'
import { validateCartItem } from '@/lib/actions/cart'
import type { ProductWithPrice } from '@/types'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface ProductWithPriceCardProps {
  product: ProductWithPrice
  tierName: string
  onImageClick?: (imageUrl: string, productName: string) => void
}

export function ProductWithPriceCard({ product, tierName, onImageClick }: ProductWithPriceCardProps) {
  const { addItem, getItemQuantity } = useCartStore()
  const [isAdding, setIsAdding] = useState(false)
  const cartQuantity = getItemQuantity(product.id)

  // 計算折扣百分比
  const discountPercent =
    product.retail_price && product.user_price
      ? Math.round(((product.retail_price - product.user_price) / product.retail_price) * 100)
      : 0

  // 加入購物車
  const handleAddToCart = async () => {
    if (isAdding || !product.user_price) return

    setIsAdding(true)

    const validation = await validateCartItem(product.id)

    if (!validation.success) {
      alert(validation.message)
      setIsAdding(false)
      return
    }

    addItem(product.id, 1)
    setIsAdding(false)
  }

  // 商品圖片點擊處理
  const handleImageClick = () => {
    if (product.image_url && onImageClick) {
      onImageClick(product.image_url, product.name)
    }
  }

  return (
    <div className={cn(
      "group rounded-none bg-white",
      designTokens.neoBrutalism.border.full,
      "border-black",
      designTokens.neoBrutalism.shadow.full,
      "p-3 md:p-4"
    )}>
      {/* 商品圖片 */}
      <div
        className={cn(
          "mb-3 md:mb-4 aspect-square overflow-hidden rounded-none bg-gray-100",
          designTokens.neoBrutalism.border.mobile,
          "border-black",
          product.image_url && onImageClick && "cursor-pointer",
          !product.image_url && "opacity-50"
        )}
        onClick={handleImageClick}
        role={product.image_url && onImageClick ? 'button' : undefined}
        aria-label={product.image_url && onImageClick ? `查看 ${product.name} 大圖` : undefined}
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            width={300}
            height={300}
            className={cn(
              "h-full w-full object-cover transition-transform",
              onImageClick && "group-hover:scale-105"
            )}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl md:text-6xl text-gray-300">
            📦
          </div>
        )}
      </div>

      {/* 商品資訊 */}
      <div className="space-y-2 md:space-y-3">
        <h3 className={cn(
          "line-clamp-2 font-bold",
          designTokens.typography.body.large
        )}>{product.name}</h3>

        <p className={cn(
          designTokens.typography.caption,
          "text-gray-600"
        )}>編號: {product.code}</p>

        {/* 價格顯示 */}
        {product.user_price !== null ? (
          <div className={cn(
            "rounded-none bg-blue-50",
            designTokens.neoBrutalism.border.mobile,
            "border-black",
            "p-2.5 md:p-3"
          )}>
            {/* 原價 */}
            {product.retail_price && product.retail_price > product.user_price && (
              <div className="mb-1 flex items-center gap-2">
                <span className={cn(
                  designTokens.typography.caption,
                  "text-gray-500"
                )}>原價</span>
                <span className={cn(
                  designTokens.typography.caption,
                  "text-gray-400 line-through"
                )}>
                  ${product.retail_price}
                </span>
                {discountPercent > 0 && (
                  <span className={cn(
                    "rounded-none border border-red-600 bg-red-100",
                    "px-1 py-0.5",
                    "text-xs font-bold text-red-700"
                  )}>
                    省 {discountPercent}%
                  </span>
                )}
              </div>
            )}

            {/* 會員價 */}
            <div className="flex items-baseline gap-2">
              <span className="text-xl md:text-2xl font-bold text-blue-600">
                ${product.user_price}
              </span>
              <span className={cn(
                designTokens.typography.caption,
                "text-gray-600"
              )}>
                ({tierName})
              </span>
            </div>
          </div>
        ) : (
          <div className={cn(
            "rounded-none bg-gray-100",
            "border-2 border-gray-400",
            "p-2.5 md:p-3"
          )}>
            <p className={cn(
              "text-center font-bold text-gray-600",
              designTokens.typography.caption
            )}>
              價格未設定
            </p>
          </div>
        )}

        {/* 庫存狀態 */}
        <div className="flex justify-center">
          <StockStatus status={product.stock_status} size="md" />
        </div>

        {/* 單位 */}
        <p className={cn(
          designTokens.typography.caption,
          "text-gray-500"
        )}>單位: {product.unit}</p>

        {/* 加入購物車按鈕 */}
        <button
          onClick={handleAddToCart}
          disabled={isAdding || !product.user_price}
          className={cn(
            "mt-2 md:mt-3 w-full rounded-none bg-green-400 font-bold transition-all",
            designTokens.neoBrutalism.border.full,
            "border-black",
            designTokens.neoBrutalism.shadow.full,
            designTokens.neoBrutalism.hover,
            "px-3 py-2.5 md:px-4 md:py-3",
            "min-h-[44px]",  // WCAG 2.1 AA
            "disabled:cursor-not-allowed disabled:bg-gray-200 disabled:opacity-50",
            "disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-neo"
          )}
        >
          {isAdding ? (
            '加入中...'
          ) : !product.user_price ? (
            '價格未設定'
          ) : cartQuantity > 0 ? (
            <span className="flex items-center justify-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              再加一件 (已有 {cartQuantity} 件)
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Plus className="h-5 w-5" />
              加入購物車
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
