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

  return (
    <Link
      href={`/store/${product.id}`}
      className={cn(
        'group block rounded-none border-3 bg-white p-4 shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none relative',
        borderColor
      )}
    >
      {/* 標籤徽章（左上角） */}
      {product.tags && product.tags.length > 0 && (
        <div className="absolute left-2 top-2 z-10">
          <TagBadgeList tags={product.tags} maxTags={2} size="sm" />
        </div>
      )}

      {/* 商品圖片 */}
      <div className="mb-4 aspect-square overflow-hidden rounded-none border-2 border-black bg-gray-100">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            width={300}
            height={300}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl text-gray-300">
            📦
          </div>
        )}
      </div>

      {/* 商品資訊 */}
      <div className="space-y-2">
        <h3 className="line-clamp-2 text-lg font-bold">{product.name}</h3>

        <p className="text-sm text-gray-600">編號: {product.code}</p>

        {/* 系列標籤 */}
        {product.series_name && (
          <div className="inline-block rounded-none border-2 border-black bg-blue-100 px-2 py-1 text-xs font-bold">
            {product.series_name}
          </div>
        )}

        {/* 價格顯示（優化） */}
        {hasUserPrice ? (
          <div className="space-y-1">
            {/* 原價（刪除線） */}
            {product.retail_price && product.retail_price > 0 && (
              <p className="text-sm text-gray-500 line-through">
                原價 ${product.retail_price}
              </p>
            )}
            {/* 您的價格（醒目） */}
            <p className="text-2xl font-bold text-brand-primary">
              ${product.user_price}
              <span className="ml-2 text-sm font-normal text-gray-600">/{product.unit || '件'}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm font-bold text-red-600">價格未設定</p>
        )}

        {/* 庫存狀態與提示 */}
        <div className="space-y-1">
          <div className="flex justify-start">
            <StockStatus status={product.stock_status} size="sm" />
          </div>
          {/* 預購商品提示 */}
          {(product.stock || 0) < 0 && (
            <p className="text-xs text-red-600 font-bold">可預購</p>
          )}
        </div>
      </div>
    </Link>
  )
}
