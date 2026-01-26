/**
 * ProductCard Component
 * Feature: 002-product-management (US6 - 前台客戶瀏覽商品列表)
 * Updated: Feature 003-series-and-pricing (US5 - 庫存狀態管理)
 * Updated: Feature 006-ux-enhancement (US4 - 商品卡片視覺優化)
 *
 * 商品卡片元件,用於前台商品列表頁面
 * - 顯示商品圖片、名稱、編號、庫存狀態
 * - 顯示標籤徽章（左上角，最多 2 個）
 * - 庫存狀態色彩邊框（綠/黃/紅）
 * - 價格顯示優化（原價刪除線 + 您的價格醒目）
 * - Neo-Brutalism 設計風格
 */

import type { Product } from '@/types'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { StockStatus } from './stock-status'
import { TagBadgeList } from '@/components/ui/tag-badge'
import { designTokens } from '@/lib/design-tokens'

interface ProductCardProps {
  product: Product
}

/**
 * 根據庫存數量決定邊框顏色
 */
function getStockBorderColor(stock: number): string {
  if (stock > 10) return 'border-green-600'   // 庫存充足（綠色）
  if (stock > 0) return 'border-yellow-600'   // 庫存偏低（黃色）
  return 'border-red-600'                     // 缺貨/預購（紅色）
}

export function ProductCard({ product }: ProductCardProps) {
  const borderColor = getStockBorderColor(product.stock || 0)
  const hasUserPrice = product.user_price !== undefined && product.user_price !== null
  const imageUrl = product.image_url

  return (
    <Link
      href={`/store/${product.id}`}
      className={cn(
        'group block rounded-none bg-white transition-all relative',
        designTokens.neoBrutalism.border.full,
        designTokens.neoBrutalism.shadow.full,
        designTokens.neoBrutalism.hover,
        "p-2 md:p-4",
        borderColor
      )}
    >
      {/* 標籤徽章（左上角） */}
      {product.tags && product.tags.length > 0 && (
        <div className="absolute left-1.5 top-1.5 z-10">
          <TagBadgeList tags={product.tags} maxTags={2} size="sm" />
        </div>
      )}

      {/* 商品圖片 */}
      <div className={cn(
        "mb-2 md:mb-4 aspect-square overflow-hidden rounded-none bg-gray-100",
        "relative",  // 新增：支援絕對定位
        designTokens.neoBrutalism.border.mobile,
        "border-black"
      )}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            width={300}
            height={300}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
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
            "pointer-events-none"  // 不阻擋 Link 點擊
          )}>
            查看商品
          </span>
        </div>
      </div>

      {/* 商品資訊 */}
      <div className="space-y-1.5 md:space-y-2">
        <h3 className={cn(
          "line-clamp-2 font-bold text-sm md:text-base leading-tight"
        )}>{product.name}</h3>

        <p className="text-xs text-gray-600">
          編號: {product.code}
        </p>

        {/* 系列標籤 */}
        {product.series_name && (
          <div className={cn(
            "inline-block rounded-none bg-blue-100",
            designTokens.neoBrutalism.border.mobile,
            "border-black",
            "px-1.5 py-0.5 text-xs font-bold"
          )}>
            {product.series_name}
          </div>
        )}

        {/* 價格顯示（優化） */}
        {hasUserPrice ? (
          <div className="space-y-0.5">
            {/* 原價（刪除線） */}
            {product.retail_price && product.retail_price > 0 && (
              <p className="text-xs text-gray-500 line-through">
                原價 ${product.retail_price}
              </p>
            )}
            {/* 您的價格（醒目） */}
            <p className="text-lg md:text-2xl font-bold text-brand-primary">
              ${product.user_price}
              <span className="text-xs ml-1 font-normal text-gray-600">
                /{product.unit || '件'}
              </span>
            </p>
          </div>
        ) : (
          <p className="text-xs font-bold text-red-600">
            價格未設定
          </p>
        )}

        {/* 庫存狀態與提示 */}
        <div className="space-y-0.5">
          <div className="flex justify-start">
            <StockStatus status={product.stock_status} size="sm" />
          </div>
          {/* 預購商品提示 */}
          {(product.stock || 0) < 0 && (
            <p className="text-xs font-bold text-red-600">可預購</p>
          )}
        </div>
      </div>
    </Link>
  )
}
