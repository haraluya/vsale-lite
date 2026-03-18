/**
 * SeriesHeroImage Component
 * Feature: 007-system-enhancement (US3 - 系列頁商品圖片即時預覽)
 *
 * 系列頁面的主圖片區塊,支援以下功能:
 * - 預設顯示系列圖片
 * - 點擊商品卡片時切換為商品圖片
 * - 點擊 X 按鈕恢復系列圖片
 * - CSS Transition 淡入淡出動畫 (300ms)
 * - 點擊圖片彈窗查看大圖
 * - Neo-Brutalism 設計風格
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { ImageModal } from '@/components/ui/image-modal'

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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const isProductImage = currentImage !== seriesImageUrl
  const displayName = isProductImage ? (currentProductName ?? seriesName) : seriesName

  return (
    <>
      <div className="relative h-80 w-full overflow-hidden rounded-none border-2 md:border-3 border-black bg-surface-secondary shadow-neo">
        {/* 圖片顯示區 */}
        {currentImage ? (
          <div
            className="relative h-full w-full cursor-pointer"
            onClick={() => setIsModalOpen(true)}
            role="button"
            aria-label={`查看 ${displayName} 大圖`}
          >
            <Image
              key={currentImage} // 觸發重新渲染以實現淡入淡出效果
              src={currentImage}
              alt={displayName}
              fill
              className="object-cover transition-opacity duration-300 hover:opacity-90"
              priority
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center">
              <div className="text-9xl text-gray-300">📦</div>
              <p className="mt-4 text-lg font-bold text-muted">
                {displayName}
              </p>
              <p className="mt-2 text-sm text-muted">尚無圖片</p>
            </div>
          </div>
        )}

      {/* 關閉按鈕（僅在顯示商品圖片時顯示） */}
      {isProductImage && (
        <button
          onClick={onReset}
          className="absolute right-4 top-4 rounded-none border-2 border-black bg-surface p-2 shadow-neo-sm md:shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          aria-label="恢復系列圖片"
        >
          <X className="h-5 w-5" />
        </button>
      )}
      </div>

      {/* 圖片彈窗 */}
      {currentImage && (
        <ImageModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          imageUrl={currentImage}
          imageName={displayName}
        />
      )}
    </>
  )
}

