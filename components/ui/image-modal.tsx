/**
 * ImageModal Component
 * 圖片彈窗元件，用於全螢幕查看圖片
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
  description?: string
}

export function ImageModal({ isOpen, onClose, imageUrl, imageName, description }: ImageModalProps) {
  const [isImageLoading, setIsImageLoading] = useState(true)

  const handleEscKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', handleEscKey)
      setIsImageLoading(true)
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

  const optimizedImageUrl = optimizeProductDetailImage(imageUrl)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="圖片預覽"
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 關閉按鈕 */}
        <button
          onClick={onClose}
          className={cn(
            "absolute -right-4 -top-4 z-10 rounded-theme-sm bg-surface transition-all",
            designTokens.cleanCommerce.border.full,
            designTokens.cleanCommerce.shadow.full,
            designTokens.cleanCommerce.hover,
            "p-3",
            "min-h-[44px] min-w-[44px]"
          )}
          aria-label="關閉圖片預覽"
        >
          <X className="h-6 w-6" />
        </button>

        {/* 圖片 */}
        <div className={cn(
          "relative rounded-theme-sm bg-surface",
          designTokens.cleanCommerce.border.full,
          designTokens.cleanCommerce.shadow.full,
          "overflow-hidden",
          "min-h-[300px] flex items-center justify-center"
        )}>
          {isImageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-secondary">
              <Loader2 className="h-12 w-12 animate-spin text-muted" />
            </div>
          )}

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

        {/* 商品資訊 */}
        <div className={cn(
          "mt-4 rounded-theme-sm bg-surface",
          designTokens.cleanCommerce.border.full,
          designTokens.cleanCommerce.shadow.full,
          "overflow-hidden"
        )}>
          <div className={cn(
            "bg-warning",
            "border-b",
            "px-4 py-3"
          )}>
            <p className={cn(
              "font-bold",
              designTokens.typography.body.large
            )}>
              {imageName}
            </p>
          </div>

          {description && (
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "rounded-theme-sm bg-info",
                  "border",
                  "w-1 h-4"
                )} />
                <p className="font-bold text-sm text-text-secondary">商品簡介</p>
              </div>
              <p className={cn(
                "whitespace-pre-wrap text-text-secondary leading-relaxed",
                designTokens.typography.body.base
              )}>
                {description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
