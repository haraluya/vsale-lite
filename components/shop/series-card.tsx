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

interface SeriesCardProps {
  series: Series
}

export function SeriesCard({ series }: SeriesCardProps) {
  return (
    <Link href={`/store/series/${series.id}`}>
      <div className={cn(
        "group h-full rounded-none bg-white transition-all",
        designTokens.neoBrutalism.border.full,
        "border-black",
        designTokens.neoBrutalism.shadow.full,
        designTokens.neoBrutalism.hover
      )}>
        {/* 系列圖片 */}
        <div className={cn(
          "relative aspect-square overflow-hidden",
          designTokens.neoBrutalism.border.mobile,
          "md:border-b-3",
          "border-b-black"
        )}>
          {series.image_url ? (
            <Image
              src={series.image_url}
              alt={series.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-100">
              <span className="text-5xl md:text-6xl">📦</span>
            </div>
          )}
        </div>

        {/* 系列資訊 */}
        <div className="p-3 md:p-4">
          <h3 className={cn(
            designTokens.typography.h3,
            "mb-2"
          )}>{series.name}</h3>
          {series.description && (
            <p className={cn(
              "line-clamp-2",
              designTokens.typography.caption,
              "text-gray-600"
            )}>
              {series.description}
            </p>
          )}

          {/* 查看詳情按鈕 */}
          <div className="mt-3 md:mt-4">
            <span className={cn(
              "inline-block rounded-none bg-yellow-300 font-bold transition-all group-hover:bg-yellow-400",
              designTokens.neoBrutalism.border.mobile,
              "border-black",
              "px-3 py-2 md:px-4",
              designTokens.typography.caption
            )}>
              查看商品 →
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
