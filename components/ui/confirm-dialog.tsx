'use client'

import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'default'
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = '確認',
  cancelText = '取消',
  variant = 'default',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // 按 Esc 關閉對話框
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // 點擊外部關閉對話框
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      onClose()
    }
  }

  if (!isOpen) return null

  const getVariantColors = () => {
    switch (variant) {
      case 'danger':
        return {
          button: 'bg-red-500 hover:bg-red-600 text-white',
          border: 'border-red-500',
        }
      case 'warning':
        return {
          button: 'bg-yellow-500 hover:bg-yellow-600 text-black',
          border: 'border-yellow-500',
        }
      default:
        return {
          button: 'bg-blue-500 hover:bg-blue-600 text-white',
          border: 'border-blue-500',
        }
    }
  }

  const colors = getVariantColors()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md border-2 md:border-3 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        {/* Header */}
        <div className={`border-b-2 md:border-b-3 border-black bg-gray-100 p-4 ${colors.border}`}>
          <div className="flex items-start justify-between">
            <h2 id="dialog-title" className="text-xl font-bold">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="border-2 border-black bg-white p-1 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              aria-label="關閉對話框"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p id="dialog-description" className="text-gray-700">
            {description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t-2 md:border-t-3 border-black bg-gray-50 p-4">
          <button
            onClick={onClose}
            className="flex-1 border-2 md:border-3 border-black bg-white px-4 py-2 font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`flex-1 border-2 md:border-3 border-black px-4 py-2 font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${colors.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
