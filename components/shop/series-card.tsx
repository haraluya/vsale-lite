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

interface SeriesCardProps {
  series: Series
}

export function SeriesCard({ series }: SeriesCardProps) {
  return (
    <Link href={`/store/series/${series.id}`}>
      <div className="group h-full rounded-none border-3 border-black bg-white shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none">
        {/* 系列圖片 */}
        <div className="relative aspect-square overflow-hidden border-b-3 border-black">
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
              <span className="text-6xl">📦</span>
            </div>
          )}
        </div>

        {/* 系列資訊 */}
        <div className="p-4">
          <h3 className="mb-2 text-xl font-bold">{series.name}</h3>
          {series.description && (
            <p className="line-clamp-2 text-sm text-gray-600">
              {series.description}
            </p>
          )}

          {/* 查看詳情按鈕 */}
          <div className="mt-4">
            <span className="inline-block rounded-none border-2 border-black bg-yellow-300 px-4 py-2 text-sm font-bold transition-all group-hover:bg-yellow-400">
              查看商品 →
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
