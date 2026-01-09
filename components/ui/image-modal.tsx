/**
 * ImageModal Component
 *
 * 圖片彈窗元件，用於全螢幕查看圖片
 * - Neo-Brutalism 設計風格
 * - 支援 ESC 鍵關閉
 * - 背景點擊關閉
 * - 圖片縮放適應螢幕
 * - 關閉按鈕與標題顯示
 */

'use client'

import { useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface ImageModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  imageName: string
}

export function ImageModal({ isOpen, onClose, imageUrl, imageName }: ImageModalProps) {
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
          "overflow-hidden"
        )}>
          <Image
            src={imageUrl}
            alt={imageName}
            width={1200}
            height={1200}
            className="h-auto max-h-[80vh] w-auto max-w-[85vw] object-contain"
            priority
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
