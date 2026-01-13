/**
 * ImageCarousel Component
 * Feature: 016-home-page-blocks (US2)
 *
 * 圖片輪播區塊元件
 * - 自動播放邏輯（可設定間隔時間）
 * - 手動切換（底部指示器點）
 * - 系列連結（點擊圖片跳轉系列頁）
 * - 響應式圖片高度
 * - Neo-Brutalism 設計風格
 */

'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { ImageCarouselConfig } from '@/types'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface ImageCarouselProps {
  config: ImageCarouselConfig
}

function ImageCarouselComponent({ config }: ImageCarouselProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const { images, auto_play, interval_ms } = config

  // 切換到指定索引
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  // 自動播放邏輯
  useEffect(() => {
    if (!auto_play || images.length <= 1) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, interval_ms)

    return () => clearInterval(timer)
  }, [auto_play, interval_ms, images.length])

  // 處理圖片點擊
  const handleImageClick = () => {
    const currentImage = images[currentIndex]
    if (currentImage?.series_id) {
      router.push(`/store/products/series/${currentImage.series_id}`)
    }
  }

  // 處理指示器點擊（重置自動播放計時器）
  const handleDotClick = (index: number) => {
    goToSlide(index)
  }

  if (images.length === 0) {
    return (
      <div
        className={cn(
          'w-full h-64 md:h-96 rounded-none bg-gray-100',
          designTokens.neoBrutalism.border.full,
          'border-black',
          designTokens.neoBrutalism.shadow.full,
          'flex items-center justify-center text-gray-400'
        )}
      >
        <p className="text-sm md:text-base">暫無圖片</p>
      </div>
    )
  }

  const currentImage = images[currentIndex]

  return (
    <div className="relative w-full">
      {/* 圖片容器 */}
      <div
        className={cn(
          'relative w-full h-64 md:h-96 rounded-none bg-gray-100 overflow-hidden',
          designTokens.neoBrutalism.border.full,
          'border-black',
          designTokens.neoBrutalism.shadow.full,
          currentImage?.series_id && 'cursor-pointer'
        )}
        onClick={handleImageClick}
        role={currentImage?.series_id ? 'button' : undefined}
        aria-label={currentImage?.series_id ? '點擊查看系列商品' : undefined}
      >
        {currentImage?.url ? (
          <Image
            src={currentImage.url}
            alt={`廣告圖片 ${currentIndex + 1}`}
            fill
            className="object-cover"
            sizes="100vw"
            priority={currentIndex === 0} // 第一張圖片優先載入
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <span className="text-4xl md:text-6xl">🖼️</span>
          </div>
        )}
      </div>

      {/* 指示器點（僅多張圖片時顯示） */}
      {images.length > 1 && (
        <div className="mt-3 md:mt-4 flex items-center justify-center gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={cn(
                'w-2.5 h-2.5 md:w-3 md:h-3 rounded-full transition-all',
                'border-2 border-black',
                currentIndex === index
                  ? 'bg-black scale-125'
                  : 'bg-white hover:bg-gray-200',
                'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2'
              )}
              aria-label={`跳至第 ${index + 1} 張圖片`}
              aria-current={currentIndex === index}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// 使用 React.memo 優化效能，防止不必要的重新渲染
export const ImageCarousel = memo(ImageCarouselComponent)
