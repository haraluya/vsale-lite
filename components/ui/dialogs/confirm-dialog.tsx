'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConfirmDialogOptions } from '@/types/dialog'

interface ConfirmDialogProps {
  options: ConfirmDialogOptions
  onClose: (confirmed: boolean) => void
}

/**
 * ConfirmDialog 元件
 * 替代原生 confirm()，符合 Neo-Brutalism 設計風格
 */
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

  // ESC 鍵關閉
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

  // 背景滾動鎖定
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // 處理確認
  const handleConfirm = async () => {
    if (isAsync) {
      setIsLoading(true)
      // 模擬異步操作 - 實際使用時由外部處理
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    onClose(true)
  }

  // 處理取消
  const handleCancel = () => {
    if (isLoading) return
    onClose(false)
  }

  // 變體配置
  const variantConfig = {
    success: {
      headerBg: 'bg-green-400',
      icon: CheckCircle,
      confirmBg: 'bg-green-500 hover:bg-green-600',
    },
    error: {
      headerBg: 'bg-red-400',
      icon: XCircle,
      confirmBg: 'bg-red-500 hover:bg-red-600',
    },
    warning: {
      headerBg: 'bg-yellow-400',
      icon: AlertTriangle,
      confirmBg: 'bg-yellow-500 hover:bg-yellow-600',
    },
    info: {
      headerBg: 'bg-blue-400',
      icon: Info,
      confirmBg: 'bg-blue-500 hover:bg-blue-600',
    },
    danger: {
      headerBg: 'bg-red-400',
      icon: AlertTriangle,
      confirmBg: 'bg-red-500 hover:bg-red-600',
    },
    default: {
      headerBg: 'bg-gray-200',
      icon: Info,
      confirmBg: 'bg-gray-800 hover:bg-gray-900',
    },
  }

  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-0 duration-200"
      onClick={closable && !isLoading ? handleCancel : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
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
            variant === 'default' ? 'text-gray-800' : 'text-white'
          )}
        >
          <Icon className="h-6 w-6 flex-shrink-0" />
          <h2 id="confirm-dialog-title" className="text-lg font-bold">
            {title}
          </h2>
        </div>

        {/* 內容 */}
        <div className="p-6">
          <p id="confirm-dialog-description" className="text-base text-gray-800 whitespace-pre-wrap">
            {description}
          </p>
        </div>

        {/* 按鈕 */}
        <div className="border-t-3 border-black p-4 flex gap-3">
          {/* 取消按鈕 */}
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className={cn(
              'flex-1 px-4 py-2',
              'border-3 border-black',
              'bg-white hover:bg-gray-100',
              'text-gray-800 font-bold text-sm uppercase',
              'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
              'transition-all duration-150',
              'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
              'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
            )}
          >
            {cancelText}
          </button>

          {/* 確認按鈕 */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              'flex-1 px-4 py-2',
              'border-3 border-black',
              config.confirmBg,
              'text-white font-bold text-sm uppercase',
              'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
              'transition-all duration-150',
              'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
              'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
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
