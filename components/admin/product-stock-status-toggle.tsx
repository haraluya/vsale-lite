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
 * - 點擊顯示選擇器，選擇後直接更新
 */

import { useOptimistic, useTransition, useState, useRef, useEffect } from 'react'
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
  },
  low: {
    label: '低庫存',
    color: 'bg-yellow-100 text-yellow-800',
  },
  out_of_stock: {
    label: '缺貨',
    color: 'bg-red-100 text-red-800',
  },
}

export function ProductStockStatusToggle({
  productId,
  initialStockStatus,
  productName,
  onStatusChanged,
}: ProductStockStatusToggleProps) {
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 樂觀更新狀態（立即反應）
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<
    'sufficient' | 'low' | 'out_of_stock',
    'sufficient' | 'low' | 'out_of_stock'
  >(initialStockStatus, (currentStatus, newStatus) => newStatus)

  // 點擊外部關閉選擇器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  const handleSelectStatus = (newStatus: 'sufficient' | 'low' | 'out_of_stock') => {
    if (newStatus === optimisticStatus) {
      setIsOpen(false)
      return
    }

    // 立即更新 UI（樂觀更新）
    setOptimisticStatus(newStatus)
    setIsOpen(false)

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
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={cn(
          'rounded-none border-2 border-black px-2 py-1 font-bold transition-all',
          'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
          'hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]',
          'disabled:opacity-70 disabled:cursor-not-allowed',
          designTokens.typography.caption,
          currentConfig.color
        )}
        title="點擊選擇庫存狀態"
        aria-label={`${productName || '商品'}庫存狀態：當前${currentConfig.label}`}
      >
        {currentConfig.label}
      </button>

      {/* 選擇器彈出選單 */}
      {isOpen && (
        <div
          className={cn(
            'absolute left-0 top-full mt-1 z-50',
            'rounded-none border-2 border-black bg-white',
            'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
            'min-w-[100px]'
          )}
        >
          {(Object.keys(STOCK_STATUS_CONFIG) as Array<keyof typeof STOCK_STATUS_CONFIG>).map((status) => {
            const config = STOCK_STATUS_CONFIG[status]
            const isSelected = status === optimisticStatus

            return (
              <button
                key={status}
                onClick={() => handleSelectStatus(status)}
                className={cn(
                  'w-full px-3 py-2 text-left font-bold transition-colors',
                  'border-b-2 border-black last:border-b-0',
                  'hover:bg-gray-100',
                  isSelected && 'bg-gray-200',
                  designTokens.typography.caption,
                  config.color.replace('bg-', 'text-')
                )}
              >
                {config.label}
                {isSelected && <span className="ml-2">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
