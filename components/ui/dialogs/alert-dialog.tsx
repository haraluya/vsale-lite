'use client'

import { useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AlertDialogOptions } from '@/types/dialog'

interface AlertDialogProps {
  options: AlertDialogOptions
  onClose: () => void
}

export function AlertDialog({ options, onClose }: AlertDialogProps) {
  const {
    title,
    message,
    variant = 'info',
    confirmText = '確定',
    closable = true,
  } = options

  useEffect(() => {
    if (!closable) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [closable, onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const variantConfig = {
    success: {
      headerBg: 'bg-success',
      icon: CheckCircle,
      buttonBg: 'bg-success hover:opacity-80',
    },
    error: {
      headerBg: 'bg-error',
      icon: XCircle,
      buttonBg: 'bg-error hover:opacity-80',
    },
    warning: {
      headerBg: 'bg-warning',
      icon: AlertTriangle,
      buttonBg: 'bg-warning hover:opacity-80',
    },
    info: {
      headerBg: 'bg-info',
      icon: Info,
      buttonBg: 'bg-info hover:opacity-80',
    },
  }

  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 animate-in fade-in-0 duration-200"
      onClick={closable ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-message"
    >
      <div
        className={cn(
          'w-full max-w-md',
          'border-theme bg-surface',
          'shadow-neo-sm shadow-neo-lg',
          'animate-in zoom-in-95 duration-200'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題欄 */}
        <div
          className={cn(
            'flex items-center gap-3 border-b p-4',
            config.headerBg,
            'text-text-inverse'
          )}
        >
          <Icon className="h-6 w-6 flex-shrink-0" />
          <h2 id="alert-dialog-title" className="text-lg font-semibold">
            {title}
          </h2>
        </div>

        {/* 內容 */}
        <div className="p-6">
          <p id="alert-dialog-message" className="text-base whitespace-pre-wrap">
            {message}
          </p>
        </div>

        {/* 按鈕 */}
        <div className="border-t p-4">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'w-full px-4 py-2',
              'border-theme',
              config.buttonBg,
              'text-text-inverse font-bold text-sm uppercase',
              'shadow-neo-sm',
              'transition-all duration-150',
              'active:scale-[0.98]',
              'focus:outline-none focus:ring-2 focus:ring-offset-2'
            )}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
