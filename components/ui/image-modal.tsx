/**
 * ImageModal Component
 *
 * 圖片彈窗元件，用於全螢幕查看圖片
 * - Neo-Brutalism 設計風格
 * - 支援 ESC 鍵關閉
 * - 背景點擊關閉
 * - 圖片縮放適應螢幕
 * - 關閉按鈕與標題顯示
 * - ⭐ 優化：使用 Supabase Image Transformation API 優化圖片載入速度
 */

'use client'

import { useEffect, useCallback, useState } from 'react'
import Image from 'next/image'
import { X, Loader2 } from 'lucide-react'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import { optimizeProductDetailImage } from '@/lib/utils/image-optimization'

interface ImageModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  imageName: string
}

export function ImageModal({ isOpen, onClose, imageUrl, imageName }: ImageModalProps) {
  const [isImageLoading, setIsImageLoading] = useState(true)

  // ESC 鍵關閉
  const handleEscKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  // 背景滾動鎖定
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', handleEscKey)
      setIsImageLoading(true) // 重設載入狀態
    } else {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleEscKey)
    }

    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [isOpen, handleEscKey])

  if (!isOpen) return null

  // ⭐ 優化：使用 Supabase Image Transformation API（1200px, WebP, 85% 品質）
  const optimizedImageUrl = optimizeProductDetailImage(imageUrl)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="圖片預覽"
    >
      {/* 彈窗內容 */}
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 關閉按鈕 */}
        <button
          onClick={onClose}
          className={cn(
            "absolute -right-4 -top-4 z-10 rounded-none bg-white transition-all",
            designTokens.neoBrutalism.border.full,
            "border-black",
            designTokens.neoBrutalism.shadow.full,
            designTokens.neoBrutalism.hover,
            "p-3",
            "min-h-[44px] min-w-[44px]"  // WCAG 2.1 AA
          )}
          aria-label="關閉圖片預覽"
        >
          <X className="h-6 w-6" />
        </button>

        {/* 圖片 */}
        <div className={cn(
          "relative rounded-none bg-white",
          designTokens.neoBrutalism.border.full,
          "border-black",
          designTokens.neoBrutalism.shadow.full,
          "overflow-hidden",
          "min-h-[300px] flex items-center justify-center"
        )}>
          {/* 載入指示器 */}
          {isImageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
            </div>
          )}

          {/* 優化後的圖片 */}
          <Image
            src={optimizedImageUrl}
            alt={imageName}
            width={1200}
            height={1200}
            className={cn(
              "h-auto max-h-[80vh] w-auto max-w-[85vw] object-contain",
              isImageLoading ? "opacity-0" : "opacity-100 transition-opacity duration-300"
            )}
            priority={true}
            onLoad={() => setIsImageLoading(false)}
            onError={() => setIsImageLoading(false)}
          />
        </div>

        {/* 圖片標題 */}
        <div className={cn(
          "mt-4 rounded-none bg-white",
          designTokens.neoBrutalism.border.full,
          "border-black",
          designTokens.neoBrutalism.shadow.full,
          "px-4 py-3"
        )}>
          <p className={cn(
            "text-center font-bold",
            designTokens.typography.body.base
          )}>
            {imageName}
          </p>
        </div>
      </div>
    </div>
  )
}
