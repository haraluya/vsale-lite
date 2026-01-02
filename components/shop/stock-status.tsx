/**
 * Stock Status Component
 * Feature: 003-series-and-pricing (US5)
 *
 * 庫存狀態顯示元件（前台）
 * - 僅顯示庫存狀態（充足/緊張/缺貨）
 * - 不顯示實際庫存數量
 * - Neo-Brutalism 風格標籤
 */

import type { Product } from '@/types'

interface StockStatusProps {
  status: Product['stock_status']
  size?: 'sm' | 'md' | 'lg'
}

const statusConfig = {
  sufficient: {
    label: '庫存充足',
    bgColor: 'bg-green-300',
    borderColor: 'border-green-600',
    textColor: 'text-green-900',
  },
  low: {
    label: '庫存緊張',
    bgColor: 'bg-yellow-300',
    borderColor: 'border-yellow-600',
    textColor: 'text-yellow-900',
  },
  out_of_stock: {
    label: '暫時缺貨',
    bgColor: 'bg-red-300',
    borderColor: 'border-red-600',
    textColor: 'text-red-900',
  },
}

const sizeConfig = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
}

export function StockStatus({ status, size = 'md' }: StockStatusProps) {
  const config = statusConfig[status]
  const sizeClass = sizeConfig[size]

  return (
    <span
      className={`
        inline-block rounded-none border-2 font-bold
        ${config.bgColor} ${config.borderColor} ${config.textColor}
        ${sizeClass}
      `}
    >
      {config.label}
    </span>
  )
}
