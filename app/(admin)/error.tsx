'use client'

/**
 * 全局錯誤邊界 - 管理端 (Admin)
 * 捕獲管理端渲染時發生的錯誤
 */

import { useEffect } from 'react'
import Link from 'next/link'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 在開發環境記錄錯誤
    if (process.env.NODE_ENV === 'development') {
      console.error('管理端錯誤:', error)
    }
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary p-4">
      <div
        className={cn(
          'max-w-md rounded-none bg-surface p-6',
          designTokens.neoBrutalism.border.full,
          'border-black',
          designTokens.neoBrutalism.shadow.full
        )}
      >
        <h2 className={cn('mb-4', designTokens.typography.h2)}>
          系統錯誤
        </h2>
        <p className={cn('mb-6 text-text-secondary', designTokens.typography.body.base)}>
          {error.message || '管理系統發生未預期的錯誤，請稍後再試。'}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={reset}
            className={cn(
              'rounded-none bg-black px-6 py-3 font-bold text-white transition-all',
              designTokens.neoBrutalism.border.full,
              'border-black',
              designTokens.neoBrutalism.shadow.full,
              designTokens.neoBrutalism.hover
            )}
          >
            重新嘗試
          </button>
          <Link
            href="/admin/dashboard"
            className={cn(
              'rounded-none bg-surface px-6 py-3 text-center font-bold transition-all',
              designTokens.neoBrutalism.border.full,
              'border-black',
              designTokens.neoBrutalism.shadow.full,
              designTokens.neoBrutalism.hover
            )}
          >
            返回管理首頁
          </Link>
        </div>

        {process.env.NODE_ENV === 'development' && error.digest && (
          <div className="mt-4 rounded-none border-2 border-gray-300 bg-surface-secondary p-3">
            <p className="text-xs text-text-secondary">錯誤 ID: {error.digest}</p>
          </div>
        )}
      </div>
    </div>
  )
}
