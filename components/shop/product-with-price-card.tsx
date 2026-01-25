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
 * - 點擊圖片彈窗查看大圖
 * - Neo-Brutalism 設計風格
 */

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Plus } from 'lucide-react'
import { StockStatus } from './stock-status'
import { useCartStore } from '@/stores/cart'
import { validateCartItem } from '@/lib/actions/cart'
import type { ProductWithPrice } from '@/types'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import { useAlert } from '@/lib/contexts/dialog-context'
import { ImageModal } from '@/components/ui/image-modal'
import { addImageCacheBusting } from '@/lib/utils/image-cache-busting'

interface ProductWithPriceCardProps {
  product: ProductWithPrice
  tierName: string
  onImageClick?: (imageUrl: string, productName: string) => void
}

export function ProductWithPriceCard({ product, tierName, onImageClick }: ProductWithPriceCardProps) {
  const { addItem, getItemQuantity, items } = useCartStore()
  const alert = useAlert()
  const [isAdding, setIsAdding] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // 🔧 修復：加上時間戳記避免圖片快取問題
  const imageUrl = addImageCacheBusting(product.image_url, product.updated_at)

  // 使用 mounted 狀態避免 hydration 不一致
  const [mounted, setMounted] = useState(false)
  const [cartQuantity, setCartQuantity] = useState(0)

  useEffect(() => {
    setMounted(true)
    setCartQuantity(getItemQuantity(product.id))
  }, [product.id, getItemQuantity])

  // 監聽購物車變更，即時更新數量
  useEffect(() => {
    if (mounted) {
      setCartQuantity(getItemQuantity(product.id))
    }
  }, [mounted, items, product.id, getItemQuantity])

  // 計算實際顯示的價格（等級價格優先，沒有則使用零售價）
  const displayPrice = product.user_price ?? product.retail_price
  const priceLabel = product.user_price ? tierName : '售價'

  // 計算折扣百分比（僅當有等級價格且低於零售價時）
  const discountPercent =
    product.retail_price && product.user_price && product.user_price < product.retail_price
      ? Math.round(((product.retail_price - product.user_price) / product.retail_price) * 100)
      : 0

  // 加入購物車
  const handleAddToCart = async () => {
    if (isAdding || !product.user_price) return

    setIsAdding(true)

    const validation = await validateCartItem(product.id)

    if (!validation.success) {
      await alert({
        title: '加入購物車失敗',
        message: validation.message || '無法加入購物車',
        variant: 'error'
      })
      setIsAdding(false)
      return
    }

    addItem(product.id, 1)
    setIsAdding(false)
  }

  // 商品圖片點擊處理
  const handleImageClick = () => {
    if (!imageUrl) return

    // 如果有 onImageClick callback（系列頁Hero圖切換），優先使用
    if (onImageClick) {
      onImageClick(imageUrl, product.name)
    } else {
      // 否則開啟彈窗
      setIsModalOpen(true)
    }
  }

  return (
    <div className={cn(
      "group rounded-none bg-white",
      designTokens.neoBrutalism.border.full,
      "border-black",
      designTokens.neoBrutalism.shadow.full,
      "p-2 md:p-4"
    )}>
      {/* 商品圖片 */}
      <div
        className={cn(
          "mb-2 md:mb-4 aspect-square overflow-hidden rounded-none bg-gray-100",
          "relative",  // 新增：支援絕對定位
          designTokens.neoBrutalism.border.mobile,
          "border-black",
          imageUrl && "cursor-pointer",
          !imageUrl && "opacity-50"
        )}
        onClick={handleImageClick}
        role={imageUrl ? 'button' : undefined}
        aria-label={imageUrl ? `查看 ${product.name} 大圖` : undefined}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            width={300}
            height={300}
            className={cn(
              "h-full w-full object-cover transition-transform",
              "group-hover:scale-105"
            )}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading="lazy" // ⭐ 優化：商品圖片延遲載入
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl md:text-6xl text-gray-300">
            📦
          </div>
        )}

        {/* 查看商品按鈕（右下角） */}
        <div className="absolute right-2 bottom-2 z-10">
          <span className={cn(
            "inline-block rounded-none bg-white",
            "border-2 border-black",
            "shadow-neo-sm",
            "px-2 py-1",
            "text-xs font-bold",
            "pointer-events-none"  // 不阻擋圖片點擊
          )}>
            查看商品
          </span>
        </div>
      </div>

      {/* 商品資訊 */}
      <div className="space-y-1.5 md:space-y-3">
        {/* 商品名稱與庫存狀況 */}
        <div className="flex items-start gap-2">
          <h3 className="flex-1 line-clamp-2 font-bold text-sm md:text-base leading-tight">
            {product.name}
          </h3>
          <div className="flex-shrink-0">
            <StockStatus status={product.stock_status} size="sm" />
          </div>
        </div>

        {/* 價格顯示 */}
        {displayPrice ? (
          <div className={cn(
            "rounded-none bg-blue-50",
            designTokens.neoBrutalism.border.mobile,
            "border-black",
            "p-2 md:p-3"
          )}>
            {/* 價格顯示（右邊對齊，同一行） */}
            <div className="flex items-baseline gap-1.5 justify-end flex-wrap">
              {/* 售價（刪除線） - 只有當會員價低於售價時顯示 */}
              {product.user_price &&
               product.retail_price &&
               product.user_price < product.retail_price && (
                <span className="text-xs text-gray-400 line-through">
                  ${product.retail_price}
                </span>
              )}

              {/* 會員價格 */}
              <span className="text-lg md:text-2xl font-bold text-blue-600">
                ${displayPrice}
              </span>

              {/* 價格標籤 */}
              <span className="text-xs text-gray-600">
                ({priceLabel})
              </span>
            </div>
          </div>
        ) : (
          // 沒有任何價格：顯示「價格未設定」
          <div className={cn(
            "rounded-none bg-gray-100",
            "border-2 border-gray-400",
            "p-2 md:p-3"
          )}>
            <p className="text-center font-bold text-gray-600 text-xs">
              價格未設定
            </p>
          </div>
        )}

        {/* 加入購物車按鈕 */}
        <button
          onClick={handleAddToCart}
          disabled={isAdding || !product.user_price}
          className={cn(
            "mt-1.5 md:mt-3 w-full rounded-none bg-green-400 font-bold transition-all",
            designTokens.neoBrutalism.border.full,
            "border-black",
            designTokens.neoBrutalism.shadow.full,
            designTokens.neoBrutalism.hover,
            "px-2 py-2 md:px-4 md:py-3",
            "min-h-[44px]",  // WCAG 2.1 AA
            "text-sm md:text-base",
            "disabled:cursor-not-allowed disabled:bg-gray-200 disabled:opacity-50",
            "disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-neo"
          )}
        >
          {isAdding ? (
            '加入中...'
          ) : !product.user_price ? (
            product.retail_price ? '會員價未設定' : '價格未設定'
          ) : !mounted || cartQuantity === 0 ? (
            // SSR 時與首次渲染時統一顯示 Plus 圖示
            <span className="flex items-center justify-center gap-1.5">
              <Plus className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">加入購物車</span>
              <span className="sm:hidden">加入</span>
            </span>
          ) : (
            // 客戶端 hydration 完成且購物車有商品時顯示 ShoppingCart 圖示
            <span className="flex items-center justify-center gap-1.5">
              <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">再加一件 ({cartQuantity})</span>
              <span className="sm:hidden">+1 ({cartQuantity})</span>
            </span>
          )}
        </button>
      </div>

      {/* 圖片彈窗 */}
      {imageUrl && !onImageClick && (
        <ImageModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          imageUrl={imageUrl}
          imageName={product.name}
        />
      )}
    </div>
  )
}
