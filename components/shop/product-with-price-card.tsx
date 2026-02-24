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
import { ShoppingCart, Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/stores/cart'
import { validateCartItem } from '@/lib/actions/cart'
import type { ProductWithPrice } from '@/types'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import { useAlert } from '@/lib/contexts/dialog-context'
import { ImageModal } from '@/components/ui/image-modal'
import { optimizeProductCardImage } from '@/lib/utils/image-optimization'

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
  const [quantity, setQuantity] = useState(1)
  const imageUrl = product.image_url

  // ⭐ 優化：預先產生優化後的圖片 URL（300px, WebP, 80% 品質）
  const optimizedImageUrl = optimizeProductCardImage(imageUrl)

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

  // 根據庫存狀態取得按鈕樣式
  const getStockButtonConfig = () => {
    switch (product.stock_status) {
      case 'sufficient':
        return {
          bgColor: 'bg-green-400',
          suffix: '',
          disabled: false
        }
      case 'low':
        return {
          bgColor: 'bg-yellow-400',
          suffix: ' (庫存緊張)',
          disabled: false
        }
      case 'out_of_stock':
        return {
          bgColor: 'bg-red-400',
          suffix: '',
          disabled: true
        }
      default:
        return {
          bgColor: 'bg-green-400',
          suffix: '',
          disabled: false
        }
    }
  }

  const stockConfig = getStockButtonConfig()
  const isOutOfStock = product.stock_status === 'out_of_stock'

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

    addItem(product.id, quantity)
    setQuantity(1)  // 重置數量為 1
    setIsAdding(false)
  }

  // 商品圖片點擊處理
  const handleImageClick = () => {
    if (!imageUrl) return

    // 直接開啟彈窗預覽圖片
    setIsModalOpen(true)
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
            src={optimizedImageUrl}
            alt={product.name}
            width={300}
            height={300}
            className={cn(
              "h-full w-full object-cover transition-transform",
              "group-hover:scale-105"
            )}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading="lazy" // ⭐ 優化：商品圖片延遲載入
            quality={80}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl md:text-6xl text-gray-300">
            📦
          </div>
        )}

        {/* 商品名稱標籤（左下角） */}
        <div className="absolute left-2 bottom-2 z-10 max-w-[70%]">
          <div className={cn(
            "inline-block rounded-none bg-yellow-300",
            designTokens.neoBrutalism.border.mobile,
            "border-black",
            "shadow-neo-sm",
            "px-2 py-1.5 md:px-3 md:py-2",
            "pointer-events-none"
          )}>
            <h3 className="line-clamp-2 font-bold text-xs md:text-sm leading-tight">
              {product.name}
            </h3>
          </div>
        </div>
      </div>

      {/* 商品資訊 */}
      <div className="space-y-1.5 md:space-y-3">
        {/* 商品簡介（一行 + fadeout 效果） */}
        {product.description && (
          <div className={cn(
            "rounded-none bg-gray-50 relative",
            designTokens.neoBrutalism.border.mobile,
            "border-gray-400",
            "p-2"
          )}>
            <p className="text-xs text-gray-700 leading-relaxed overflow-hidden whitespace-nowrap pr-8">
              {product.description}
            </p>
            <div className="absolute right-2 top-0 bottom-0 w-12 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
          </div>
        )}

        {/* 價格顯示 */}
        {displayPrice ? (
          <div className={cn(
            "rounded-none bg-blue-50",
            designTokens.neoBrutalism.border.mobile,
            "border-black",
            "p-2 md:p-3"
          )}>
            {/* 判斷是否有價格差異 */}
            {product.user_price && product.retail_price && product.user_price < product.retail_price ? (
              // 情況：會員價 < 售價 → 靠右對齊，顯示刪除線售價 + 會員價
              <div className="flex items-baseline gap-1.5 justify-end flex-wrap">
                {/* 售價（刪除線） */}
                <span className="text-xs text-gray-400 line-through">
                  ${product.retail_price}
                </span>

                {/* 會員價格 */}
                <span className="text-lg md:text-2xl font-bold text-blue-600">
                  ${displayPrice}
                </span>

                {/* 價格標籤 */}
                <span className="text-xs text-gray-600">
                  ({priceLabel})
                </span>
              </div>
            ) : (
              // 情況：只有售價 或 會員價 = 售價 → 靠左對齊，原本樣式
              <div className="flex items-baseline gap-1.5">
                {/* 價格 */}
                <span className="text-lg md:text-2xl font-bold text-blue-600">
                  ${displayPrice}
                </span>

                {/* 價格標籤 */}
                <span className="text-xs text-gray-600">
                  ({priceLabel})
                </span>
              </div>
            )}
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

        {/* 數量選擇器 + 加入購物車按鈕 */}
        <div className="flex items-stretch gap-2 mt-1.5 md:mt-3">
          {/* 數量選擇器 */}
          <div className="flex items-center gap-1">
            {/* 減少按鈕 */}
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1 || isAdding || !product.user_price || stockConfig.disabled}
              className={cn(
                "rounded-none bg-white transition-all hover:bg-gray-100",
                "border-2 border-black",
                "p-1.5 md:p-2",
                "min-h-[44px] min-w-[44px]",
                "active:translate-x-[1px] active:translate-y-[1px]",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
              aria-label="減少數量"
            >
              <Minus className="h-4 w-4" />
            </button>

            {/* 數量輸入框 */}
            <input
              type="number"
              min="1"
              max="999"
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10)
                if (!isNaN(val) && val >= 1 && val <= 999) {
                  setQuantity(val)
                }
              }}
              onBlur={(e) => {
                // 失焦時驗證，如果無效則重置為 1
                const val = parseInt(e.target.value, 10)
                if (isNaN(val) || val < 1) {
                  setQuantity(1)
                } else if (val > 999) {
                  setQuantity(999)
                }
              }}
              disabled={isAdding || !product.user_price || stockConfig.disabled}
              className={cn(
                "w-12 md:w-16 text-center font-bold rounded-none",
                "border-2 border-black",
                "px-1 py-1.5 md:py-2",
                "min-h-[44px]",
                "focus:outline-none focus:ring-2 focus:ring-blue-500",
                "text-sm md:text-base",
                "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-50"
              )}
              aria-label="商品數量"
            />

            {/* 增加按鈕 */}
            <button
              onClick={() => setQuantity(Math.min(999, quantity + 1))}
              disabled={quantity >= 999 || isAdding || !product.user_price || stockConfig.disabled}
              className={cn(
                "rounded-none bg-white transition-all hover:bg-gray-100",
                "border-2 border-black",
                "p-1.5 md:p-2",
                "min-h-[44px] min-w-[44px]",
                "active:translate-x-[1px] active:translate-y-[1px]",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
              aria-label="增加數量"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* 加入購物車按鈕 */}
          <button
            onClick={handleAddToCart}
            disabled={isAdding || !product.user_price || stockConfig.disabled}
            className={cn(
              "flex-1 rounded-none font-bold transition-all",
              stockConfig.bgColor,
              designTokens.neoBrutalism.border.full,
              "border-black",
              designTokens.neoBrutalism.shadow.full,
              designTokens.neoBrutalism.hover,
              "px-2 py-2 md:px-4 md:py-3",
              "min-h-[44px]",
              "text-sm md:text-base",
              "disabled:cursor-not-allowed disabled:bg-gray-200 disabled:opacity-50",
              "disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-neo"
            )}
          >
            {isAdding ? (
              '加入中...'
            ) : isOutOfStock ? (
              '缺貨'
            ) : !product.user_price ? (
              product.retail_price ? '會員價未設定' : '價格未設定'
            ) : !mounted || cartQuantity === 0 ? (
              <span className="flex items-center justify-center gap-1.5">
                <Plus className="h-4 w-4 md:h-5 md:w-5" />
                <span className="hidden sm:inline">加入購物車{stockConfig.suffix}</span>
                <span className="sm:hidden">加入{stockConfig.suffix}</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
                {quantity === 1 ? (
                  <>
                    <span className="hidden sm:inline">再加一件 ({cartQuantity}){stockConfig.suffix}</span>
                    <span className="sm:hidden">+1 ({cartQuantity}){stockConfig.suffix}</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">加入 {quantity} 件 ({cartQuantity}){stockConfig.suffix}</span>
                    <span className="sm:hidden">+{quantity} ({cartQuantity}){stockConfig.suffix}</span>
                  </>
                )}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 圖片彈窗 */}
      {imageUrl && (
        <ImageModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          imageUrl={imageUrl}
          imageName={product.name}
          description={product.description ?? undefined}
        />
      )}
    </div>
  )
}
