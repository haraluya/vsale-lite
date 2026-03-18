/**
 * SeriesCard Component
 * Feature: 003-series-and-pricing (US1)
 *
 * 商品系列卡片元件
 * - Neo-Brutalism 設計風格
 * - 顯示系列圖片、名稱、描述
 * - 點擊進入系列詳情頁
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { Series } from '@/types'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import { optimizeSeriesCardImage } from '@/lib/utils/image-optimization'

interface SeriesCardProps {
  series: Series
}

export function SeriesCard({ series }: SeriesCardProps) {
  const imageUrl = series.image_url

  // ⭐ 優化：使用優化後的圖片 URL（600px, WebP, 80% 品質）
  const optimizedImageUrl = optimizeSeriesCardImage(imageUrl)

  return (
    <Link href={`/store/series/${series.id}`}>
      <div className={cn(
        "group h-full rounded-theme-sm bg-surface transition-all",
        designTokens.cleanCommerce.border.full,
        "border-border",
        designTokens.cleanCommerce.shadow.full,
        designTokens.cleanCommerce.hover
      )}>
        {/* 系列圖片 */}
        <div className={cn(
          "relative aspect-square overflow-hidden",
          designTokens.cleanCommerce.border.base,
          "md:border-b",
          "border-b-black"
        )}>
          {imageUrl ? (
            <Image
              src={optimizedImageUrl}
              alt={series.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              quality={80}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-surface-secondary">
              <span className="text-4xl md:text-6xl">📦</span>
            </div>
          )}

          {/* 最低價格徽章（左下角） */}
          {series.min_retail_price && (
            <div className="absolute left-2 bottom-2 z-10">
              <span className={cn(
                "inline-block rounded-theme-sm bg-green-300 font-bold",
                designTokens.cleanCommerce.border.base,
                "border-border",
                "shadow-neo-sm",
                "px-2 py-1.5 md:px-3 md:py-2",
                "text-xs md:text-sm",
                "pointer-events-none"  // 不阻擋 Link 點擊
              )}>
                ${series.min_retail_price}起
              </span>
            </div>
          )}

          {/* 查看商品按鈕（右下角） */}
          <div className="absolute right-2 bottom-2 z-10">
            <span className={cn(
              "inline-block rounded-theme-sm bg-yellow-300 font-bold transition-all group-hover:bg-yellow-400",
              designTokens.cleanCommerce.border.base,
              "border-border",
              "shadow-neo-sm",
              "px-2 py-1.5 md:px-3 md:py-2",
              "text-xs md:text-sm",
              "pointer-events-none"  // 不阻擋 Link 點擊
            )}>
              查看商品 →
            </span>
          </div>
        </div>

        {/* 系列資訊 */}
        <div className="p-2 md:p-4">
          <h3 className="text-base md:text-xl font-bold mb-1.5 md:mb-2 leading-tight">
            {series.name}
          </h3>
          {series.description && (
            <p className="line-clamp-2 text-xs md:text-sm text-text-secondary">
              {series.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
