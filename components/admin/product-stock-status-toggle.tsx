'use client'

/**
 * Product Stock Status Toggle Component
 *
 * 商品庫存狀態快速切換組件（樂觀更新）
 * - 使用 React 19 useOptimistic Hook
 * - 立即 UI 反應（0ms 感知延遲）
 * - 背景發送請求更新資料庫
 * - 失敗時自動回滾
 * - Neo-Brutalism 設計風格
 */

import { useOptimistic, useTransition, useState } from 'react'
import { updateProductStockStatus } from '@/lib/actions/products'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'

interface ProductStockStatusToggleProps {
  productId: string
  initialStockStatus: 'sufficient' | 'low' | 'out_of_stock'
  productName?: string
  onStatusChanged?: () => void
}

const STOCK_STATUS_CONFIG = {
  sufficient: {
    label: '充足',
    color: 'bg-green-100 text-green-800',
    next: 'low' as const,
  },
  low: {
    label: '低庫存',
    color: 'bg-yellow-100 text-yellow-800',
    next: 'out_of_stock' as const,
  },
  out_of_stock: {
    label: '缺貨',
    color: 'bg-red-100 text-red-800',
    next: 'sufficient' as const,
  },
}

export function ProductStockStatusToggle({
  productId,
  initialStockStatus,
  productName,
  onStatusChanged,
}: ProductStockStatusToggleProps) {
  const [isPending, startTransition] = useTransition()

  // 樂觀更新狀態（立即反應）
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<
    'sufficient' | 'low' | 'out_of_stock',
    'sufficient' | 'low' | 'out_of_stock'
  >(initialStockStatus, (currentStatus, newStatus) => newStatus)

  const handleToggle = () => {
    const currentConfig = STOCK_STATUS_CONFIG[optimisticStatus]
    const newStatus = currentConfig.next

    // 立即更新 UI（樂觀更新）
    setOptimisticStatus(newStatus)

    // 背景發送請求
    startTransition(async () => {
      const result = await updateProductStockStatus(productId, newStatus)

      if (result.success) {
        // 成功：保持樂觀更新的狀態，顯示成功訊息
        toast.success(
          result.message || `庫存狀態已更新為「${STOCK_STATUS_CONFIG[newStatus].label}」`
        )
        onStatusChanged?.()
      } else {
        // 失敗：自動回滾到原始狀態
        setOptimisticStatus(initialStockStatus)
        toast.error(result.message || '庫存狀態更新失敗')
      }
    })
  }

  const currentConfig = STOCK_STATUS_CONFIG[optimisticStatus]

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        'rounded-none border-2 border-black px-2 py-1 font-bold transition-all',
        'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
        'hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]',
        'disabled:opacity-70 disabled:cursor-not-allowed',
        designTokens.typography.caption,
        currentConfig.color
      )}
      title={`點擊切換（當前：${currentConfig.label}）`}
      aria-label={`${productName || '商品'}庫存狀態切換：當前${currentConfig.label}`}
    >
      {currentConfig.label}
    </button>
  )
}
