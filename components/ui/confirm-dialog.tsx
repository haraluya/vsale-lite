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
          button: 'bg-error hover:opacity-80 text-text-inverse',
          border: 'border-error',
        }
      case 'warning':
        return {
          button: 'bg-warning hover:opacity-80 text-foreground',
          border: 'border-warning',
        }
      default:
        return {
          button: 'bg-info hover:opacity-80 text-text-inverse',
          border: 'border-info',
        }
    }
  }

  const colors = getVariantColors()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md border-2 md:border-3 bg-surface shadow-[8px_8px_0px_0px_var(--color-border)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        {/* Header */}
        <div className={`border-b-2 md:border-b-3 bg-surface-secondary p-4 ${colors.border}`}>
          <div className="flex items-start justify-between">
            <h2 id="dialog-title" className="text-xl font-bold">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="border-2 bg-surface p-1 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo-sm"
              aria-label="關閉對話框"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p id="dialog-description" className="text-text-secondary">
            {description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t-2 md:border-t-3 bg-surface-secondary p-4">
          <button
            onClick={onClose}
            className="flex-1 border-2 md:border-3 bg-surface px-4 py-2 font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`flex-1 border-2 md:border-3 px-4 py-2 font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo ${colors.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
