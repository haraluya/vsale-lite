'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConfirmDialogOptions } from '@/types/dialog'

interface ConfirmDialogProps {
  options: ConfirmDialogOptions
  onClose: (confirmed: boolean) => void
}

export function ConfirmDialog({ options, onClose }: ConfirmDialogProps) {
  const {
    title,
    description,
    variant = 'default',
    confirmText = '確定',
    cancelText = '取消',
    isAsync = false,
    closable = true,
  } = options

  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!closable || isLoading) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose(false)
      }
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [closable, isLoading, onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleConfirm = async () => {
    if (isAsync) {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    onClose(true)
  }

  const handleCancel = () => {
    if (isLoading) return
    onClose(false)
  }

  const variantConfig = {
    success: {
      headerBg: 'bg-success',
      icon: CheckCircle,
      confirmBg: 'bg-success hover:opacity-80',
    },
    error: {
      headerBg: 'bg-error',
      icon: XCircle,
      confirmBg: 'bg-error hover:opacity-80',
    },
    warning: {
      headerBg: 'bg-warning',
      icon: AlertTriangle,
      confirmBg: 'bg-warning hover:opacity-80',
    },
    info: {
      headerBg: 'bg-info',
      icon: Info,
      confirmBg: 'bg-info hover:opacity-80',
    },
    danger: {
      headerBg: 'bg-error',
      icon: AlertTriangle,
      confirmBg: 'bg-error hover:opacity-80',
    },
    default: {
      headerBg: 'bg-surface-secondary',
      icon: Info,
      confirmBg: 'bg-foreground hover:opacity-80',
    },
  }

  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 animate-in fade-in-0 duration-200"
      onClick={closable && !isLoading ? handleCancel : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div
        className={cn(
          'w-full max-w-md',
          'border-theme bg-surface',
          'shadow-neo-lg rounded-theme',
          'animate-in zoom-in-95 duration-200'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題欄 */}
        <div
          className={cn(
            'flex items-center gap-3 border-b p-4',
            config.headerBg,
            variant === 'default' ? 'text-foreground' : 'text-text-inverse'
          )}
        >
          <Icon className="h-6 w-6 flex-shrink-0" />
          <h2 id="confirm-dialog-title" className="text-lg font-semibold">
            {title}
          </h2>
        </div>

        {/* 內容 */}
        <div className="p-6">
          <p id="confirm-dialog-description" className="text-base whitespace-pre-wrap">
            {description}
          </p>
        </div>

        {/* 按鈕 */}
        <div className="border-t p-4 flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className={cn(
              'flex-1 px-4 py-2',
              'border-theme',
              'bg-surface hover:bg-surface-secondary',
              'font-bold text-sm uppercase',
              'shadow-neo-sm rounded-theme-sm',
              'transition-all duration-150',
              'hover:-translate-y-0.5 hover:shadow-theme-hover',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-neo'
            )}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              'flex-1 px-4 py-2',
              'border-theme',
              config.confirmBg,
              'text-text-inverse font-bold text-sm uppercase',
              'shadow-neo-sm rounded-theme-sm',
              'transition-all duration-150',
              'hover:-translate-y-0.5 hover:shadow-theme-hover',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-neo',
              'flex items-center justify-center gap-2'
            )}
            autoFocus
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
