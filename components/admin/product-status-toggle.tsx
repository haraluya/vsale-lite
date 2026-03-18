'use client'

/**
 * Product Status Toggle Component
 * Feature: Performance Optimization - Phase 2.4 (Optimistic Updates)
 *
 * 商品狀態快速切換組件（樂觀更新）
 * - 使用 React 19 useOptimistic Hook
 * - 立即 UI 反應（0ms 感知延遲）
 * - 背景發送請求更新資料庫
 * - 失敗時自動回滾
 * - Neo-Brutalism 設計風格
 */

import { useOptimistic, useTransition } from 'react'
import { updateProductStatus } from '@/lib/actions/products'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'

interface ProductStatusToggleProps {
  productId: string
  initialStatus: 'active' | 'inactive'
  productName?: string
  onStatusChanged?: () => void
}

export function ProductStatusToggle({
  productId,
  initialStatus,
  productName,
  onStatusChanged,
}: ProductStatusToggleProps) {
  const [isPending, startTransition] = useTransition()

  // 樂觀更新狀態（立即反應）
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<'active' | 'inactive', 'active' | 'inactive'>(
    initialStatus,
    (currentStatus, newStatus) => newStatus
  )

  const handleToggle = () => {
    const newStatus = optimisticStatus === 'active' ? 'inactive' : 'active'

    // 立即更新 UI（樂觀更新）
    setOptimisticStatus(newStatus)

    // 背景發送請求
    startTransition(async () => {
      const result = await updateProductStatus(productId, newStatus)

      if (result.success) {
        // 成功：保持樂觀更新的狀態，顯示成功訊息
        toast.success(result.message || `商品已${newStatus === 'active' ? '上架' : '下架'}`)
        onStatusChanged?.()
      } else {
        // 失敗：自動回滾到原始狀態
        setOptimisticStatus(initialStatus)
        toast.error(result.message || '狀態更新失敗')
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        'rounded-theme-sm border px-2 py-1 font-bold transition-all',
        'shadow-neo-sm',
        'hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm',
        'disabled:opacity-70 disabled:cursor-not-allowed',
        designTokens.typography.caption,
        optimisticStatus === 'active'
          ? 'bg-green-100 text-green-800'
          : 'bg-gray-100 text-gray-800'
      )}
      title={optimisticStatus === 'active' ? '點擊下架' : '點擊上架'}
      aria-label={`${productName || '商品'}狀態切換：當前${optimisticStatus === 'active' ? '上架' : '下架'}`}
    >
      {optimisticStatus === 'active' ? '上架' : '下架'}
    </button>
  )
}
