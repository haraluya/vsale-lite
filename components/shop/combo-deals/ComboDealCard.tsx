/**
 * ComboDealCard Component (組合優惠卡片元件)
 * Feature: 021-combo-deals (Phase 5 - User Story 2)
 *
 * 顯示組合優惠摘要資訊的卡片，包含海報、名稱、規則、折扣、倒數計時器
 */

'use client'

import Image from 'next/image'
import Link from 'next/link'
import { CountdownTimer } from './CountdownTimer'

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
  }
}

export function ComboDealCard({ deal }: ComboDealCardProps) {
  // 組合模式顯示文字
  const modeText = deal.combo_mode === 'each' ? '各選組合' : '任選組合'

  // 折扣標籤
  const discountLabel =
    deal.discount_type === 'fixed'
      ? `省 $${deal.discount_value}`
      : `${Math.round(deal.discount_value / 10)} 折`

  return (
    <Link
      href={`/store/combo-deals/${deal.id}`}
      className="block"
    >
      <div className="group rounded-none border-2 md:border-3 border-black bg-white shadow-neo-sm md:shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-200 overflow-hidden">
        {/* 海報圖片 (16:9 比例) */}
        <div className="relative w-full aspect-[16/9] bg-gray-100 overflow-hidden">
          <Image
            src={deal.poster_url}
            alt={deal.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            priority={false}
          />

          {/* 折扣標籤（絕對定位在海報右上角） */}
          <div className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 border-2 border-black shadow-neo-sm">
            <span className="text-sm md:text-base font-black">
              {discountLabel}
            </span>
          </div>
        </div>

        {/* 卡片內容 */}
        <div className="p-4 md:p-6">
          {/* 組合優惠名稱 */}
          <h3 className="text-lg md:text-xl font-black text-foreground mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {deal.name}
          </h3>

          {/* 組合規則摘要 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block px-2 py-1 bg-yellow-100 border-2 border-yellow-600 text-yellow-800 text-xs md:text-sm font-bold">
              {modeText}
            </span>
            <span className="text-sm text-gray-600">
              包含 {deal.series_count} 個系列
            </span>
          </div>

          {/* 活動倒數計時器 */}
          <div className="mt-4 pt-4 border-t-2 border-gray-200">
            <CountdownTimer endDate={deal.end_date} />
          </div>
        </div>
      </div>
    </Link>
  )
}
