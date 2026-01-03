/**
 * SeriesHeroImage Component
 * Feature: 007-system-enhancement (US3 - 系列頁商品圖片即時預覽)
 *
 * 系列頁面的主圖片區塊,支援以下功能:
 * - 預設顯示系列圖片
 * - 點擊商品卡片時切換為商品圖片
 * - 點擊 X 按鈕恢復系列圖片
 * - CSS Transition 淡入淡出動畫 (300ms)
 * - Neo-Brutalism 設計風格
 */

'use client'

import Image from 'next/image'
import { X } from 'lucide-react'

interface SeriesHeroImageProps {
  seriesName: string
  seriesImageUrl: string | null
  currentImage: string | null
  currentProductName: string | null
  onReset: () => void
}

export function SeriesHeroImage({
  seriesName,
  seriesImageUrl,
  currentImage,
  currentProductName,
  onReset,
}: SeriesHeroImageProps) {
  const isProductImage = currentImage !== seriesImageUrl
  const displayName = isProductImage ? (currentProductName ?? seriesName) : seriesName

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-none border-3 border-black bg-gray-100 shadow-neo">
      {/* 圖片顯示區 */}
      {currentImage ? (
        <Image
          key={currentImage} // 觸發重新渲染以實現淡入淡出效果
          src={currentImage}
          alt={displayName}
          fill
          className="object-cover transition-opacity duration-300"
          priority
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div className="text-center">
            <div className="text-9xl text-gray-300">📦</div>
            <p className="mt-4 text-lg font-bold text-gray-400">
              {displayName}
            </p>
            <p className="mt-2 text-sm text-gray-400">尚無圖片</p>
          </div>
        </div>
      )}

      {/* 關閉按鈕（僅在顯示商品圖片時顯示） */}
      {isProductImage && (
        <button
          onClick={onReset}
          className="absolute right-4 top-4 rounded-none border-2 border-black bg-white p-2 shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          aria-label="恢復系列圖片"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {/* 圖片標籤 */}
      <div className="absolute bottom-4 left-4 rounded-none border-2 border-black bg-white px-4 py-2 shadow-neo">
        <p className="text-sm font-bold">
          {isProductImage ? '商品圖片' : '系列圖片'}: {displayName}
        </p>
      </div>
    </div>
  )
}

