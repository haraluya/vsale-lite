'use client'

import { useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AlertDialogOptions } from '@/types/dialog'

interface AlertDialogProps {
  options: AlertDialogOptions
  onClose: () => void
}

/**
 * AlertDialog 元件
 * 替代原生 alert()，符合 Neo-Brutalism 設計風格
 */
export function AlertDialog({ options, onClose }: AlertDialogProps) {
  const {
    title,
    message,
    variant = 'info',
    confirmText = '確定',
    closable = true,
  } = options

  // ESC 鍵關閉
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

  // 背景滾動鎖定
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // 變體配置
  const variantConfig = {
    success: {
      headerBg: 'bg-green-400',
      icon: CheckCircle,
      buttonBg: 'bg-green-500 hover:bg-green-600',
    },
    error: {
      headerBg: 'bg-red-400',
      icon: XCircle,
      buttonBg: 'bg-red-500 hover:bg-red-600',
    },
    warning: {
      headerBg: 'bg-yellow-400',
      icon: AlertTriangle,
      buttonBg: 'bg-yellow-500 hover:bg-yellow-600',
    },
    info: {
      headerBg: 'bg-blue-400',
      icon: Info,
      buttonBg: 'bg-blue-500 hover:bg-blue-600',
    },
  }

  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-0 duration-200"
      onClick={closable ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-message"
    >
      <div
        className={cn(
          'w-full max-w-md',
          'border-3 border-black bg-white',
          'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
          'animate-in zoom-in-95 duration-200'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題欄 */}
        <div
          className={cn(
            'flex items-center gap-3 border-b-3 border-black p-4',
            config.headerBg,
            'text-white'
          )}
        >
          <Icon className="h-6 w-6 flex-shrink-0" />
          <h2 id="alert-dialog-title" className="text-lg font-bold">
            {title}
          </h2>
        </div>

        {/* 內容 */}
        <div className="p-6">
          <p id="alert-dialog-message" className="text-base text-gray-800 whitespace-pre-wrap">
            {message}
          </p>
        </div>

        {/* 按鈕 */}
        <div className="border-t-3 border-black p-4">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'w-full px-4 py-2',
              'border-3 border-black',
              config.buttonBg,
              'text-white font-bold text-sm uppercase',
              'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
              'transition-all duration-150',
              'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
              'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2'
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
