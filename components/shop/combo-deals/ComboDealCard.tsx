/**
 * ComboDealCard Component (組合優惠卡片元件)
 * Feature: 021-combo-deals (Phase 5 - User Story 2)
 *
 * 顯示組合優惠摘要資訊的卡片，仿照 SeriesCard 樣式
 * - 海報圖片
 * - 左下角：各選/任選 N 件
 * - 右下角：折扣標籤
 */

'use client'

import Image from 'next/image'
import Link from 'next/link'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface ComboDealCardProps {
  deal: {
    id: string
    name: string
    poster_url: string
    combo_mode: 'each' | 'mix_match'
    discount_type: 'fixed' | 'percentage'
    discount_value: number
    start_date: string
    end_date: string
    series_count: number
    mix_match_total_quantity?: number
  }
}

export function ComboDealCard({ deal }: ComboDealCardProps) {
  // 左下角：組合模式顯示文字
  const modeText = deal.combo_mode === 'each'
    ? `各選組合`
    : `任選 ${deal.mix_match_total_quantity || 0} 件`

  // 右下角：折扣標籤
  const discountLabel = deal.discount_type === 'fixed'
    ? `省 $${Math.floor(deal.discount_value)}`
    : `${Math.floor(deal.discount_value / 10)} 折`

  return (
    <Link href={`/store/combo-deals/${deal.id}`}>
      <div className={cn(
        "group h-full rounded-none bg-white transition-all",
        designTokens.neoBrutalism.border.full,
        "border-black",
        designTokens.neoBrutalism.shadow.full,
        designTokens.neoBrutalism.hover
      )}>
        {/* 海報圖片 (16:9 比例) */}
        <div className={cn(
          "relative aspect-[16/9] overflow-hidden",
          designTokens.neoBrutalism.border.mobile,
          "md:border-b-3",
          "border-b-black"
        )}>
          <Image
            src={deal.poster_url}
            alt={deal.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            quality={80}
            priority={false}
          />

          {/* 組合模式標籤（左下角） */}
          <div className="absolute left-2 bottom-2 z-10">
            <span className={cn(
              "inline-block rounded-none bg-purple-300 font-bold",
              designTokens.neoBrutalism.border.mobile,
              "border-black",
              "shadow-neo-sm",
              "px-2 py-1.5 md:px-3 md:py-2",
              "text-xs md:text-sm",
              "pointer-events-none"
            )}>
              {modeText}
            </span>
          </div>

          {/* 折扣標籤（右下角） */}
          <div className="absolute right-2 bottom-2 z-10">
            <span className={cn(
              "inline-block rounded-none bg-red-500 text-white font-bold transition-all group-hover:bg-red-600",
              designTokens.neoBrutalism.border.mobile,
              "border-black",
              "shadow-neo-sm",
              "px-2 py-1.5 md:px-3 md:py-2",
              "text-xs md:text-sm",
              "pointer-events-none"
            )}>
              {discountLabel}
            </span>
          </div>
        </div>

        {/* 組合優惠資訊 */}
        <div className="p-2 md:p-4">
          <h3 className="text-base md:text-xl font-bold mb-1.5 md:mb-2 leading-tight">
            {deal.name}
          </h3>
          <p className="text-xs md:text-sm text-gray-600">
            包含 {deal.series_count} 個系列
          </p>
        </div>
      </div>
    </Link>
  )
}
