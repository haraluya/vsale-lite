/**
 * ImageCarouselPortrait Component
 * Feature: 016-home-page-blocks (US2) - 4:5 Portrait Variant
 *
 * 海報輪播區塊元件 (直向 4:5 比例)
 * - 自動播放邏輯（可設定間隔時間）
 * - 手動切換（底部指示器點）
 * - 系列連結（點擊圖片跳轉系列頁）
 * - 4:5 比例適合直向海報
 * - Neo-Brutalism 設計風格
 */

'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { ImageCarouselConfig } from '@/types'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface ImageCarouselPortraitProps {
  config: ImageCarouselConfig
  blockUpdatedAt?: string | Date | null
}

function ImageCarouselPortraitComponent({ config, blockUpdatedAt }: ImageCarouselPortraitProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const { images, auto_play, interval_ms } = config
  const imagesWithCacheBusting = images

  // 切換到指定索引
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  // 自動播放邏輯
  useEffect(() => {
    if (!auto_play || imagesWithCacheBusting.length <= 1) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % imagesWithCacheBusting.length)
    }, interval_ms)

    return () => clearInterval(timer)
  }, [auto_play, interval_ms, imagesWithCacheBusting.length])

  // 處理圖片點擊
  const handleImageClick = () => {
    const currentImage = imagesWithCacheBusting[currentIndex]
    // 🆕 Feature 021: 支援組合優惠連結
    if ((currentImage as any)?.combo_deal_id) {
      router.push(`/store/combo-deals/${(currentImage as any).combo_deal_id}`)
    } else if (currentImage?.series_id) {
      router.push(`/store/series/${currentImage.series_id}`)
    }
  }

  // 處理指示器點擊（重置自動播放計時器）
  const handleDotClick = (index: number) => {
    goToSlide(index)
  }

  if (imagesWithCacheBusting.length === 0) {
    return (
      <div
        className={cn(
          'w-full aspect-[4/5] rounded-none bg-surface-secondary',
          designTokens.neoBrutalism.border.full,
          'border-black',
          designTokens.neoBrutalism.shadow.full,
          'flex items-center justify-center text-text-secondary'
        )}
      >
        <p className="text-sm md:text-base">暫無圖片</p>
      </div>
    )
  }

  const currentImage = imagesWithCacheBusting[currentIndex]

  return (
    <div className="relative w-full">
      {/* 圖片容器 - 4:5 比例 */}
      <div
        className={cn(
          'relative w-full aspect-[4/5] rounded-none bg-surface-secondary overflow-hidden',
          designTokens.neoBrutalism.border.full,
          'border-black',
          designTokens.neoBrutalism.shadow.full,
          (currentImage?.series_id || (currentImage as any)?.combo_deal_id) && 'cursor-pointer' // 🆕 Feature 021: 支援組合優惠
        )}
        onClick={handleImageClick}
        role={(currentImage?.series_id || (currentImage as any)?.combo_deal_id) ? 'button' : undefined}
        aria-label={
          (currentImage as any)?.combo_deal_id ? '點擊查看組合優惠' :
          currentImage?.series_id ? '點擊查看系列商品' : undefined
        }
      >
        {currentImage?.url ? (
          <Image
            src={currentImage.url}
            alt={`海報圖片 ${currentIndex + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 800px"
            priority={currentIndex === 0}
            loading={currentIndex === 0 ? 'eager' : 'lazy'}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-secondary">
            <span className="text-4xl md:text-6xl">🖼️</span>
          </div>
        )}

        {/* 指示器點（在圖片內部底部中央，僅多張圖片時顯示） */}
        {imagesWithCacheBusting.length > 1 && (
          <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 z-10">
            {imagesWithCacheBusting.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation()
                  handleDotClick(index)
                }}
                className={cn(
                  'w-2.5 h-2.5 md:w-3 md:h-3 rounded-full transition-all',
                  'border-2 border-white shadow-lg',
                  currentIndex === index
                    ? 'bg-white scale-125'
                    : 'bg-black/50 hover:bg-black/70',
                  'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/50'
                )}
                aria-label={`跳至第 ${index + 1} 張圖片`}
                aria-current={currentIndex === index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 使用 React.memo 優化效能，防止不必要的重新渲染
export const ImageCarouselPortrait = memo(ImageCarouselPortraitComponent)
