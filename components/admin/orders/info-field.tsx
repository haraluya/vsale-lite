import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

/**
 * 統一資訊欄位設計系統
 * 用於訂單詳情頁面的所有資訊顯示
 *
 * 設計原則：
 * 1. 統一的視覺層級（標籤 11px、內容 16px/14px）
 * 2. 統一的圖標系統（Lucide React，40x40 圓角方框）
 * 3. 統一的間距（gap-3）
 * 4. 統一的色彩語意
 */

interface InfoFieldProps {
  /**
   * Lucide 圖標組件
   */
  icon: LucideIcon
  /**
   * 圖標背景色（Neo-Brutalism 風格）
   * @default 'gray'
   */
  iconColor?: 'gray' | 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'yellow'
  /**
   * 欄位標籤（大寫、灰色、11px）
   */
  label: string
  /**
   * 欄位內容（粗體、16px 或 14px）
   */
  value: React.ReactNode
  /**
   * 內容字體大小
   * @default 'base'
   */
  valueSize?: 'sm' | 'base' | 'lg' | 'xl'
  /**
   * 內容文字顏色
   * @default 'gray'
   */
  valueColor?: 'gray' | 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'black'
  /**
   * 是否可點擊
   */
  onClick?: () => void
  /**
   * 自訂 className（用於特殊情況）
   */
  className?: string
}

const iconColorClasses = {
  gray: 'bg-gray-200 border-gray-400',
  blue: 'bg-blue-100 border-blue-400',
  purple: 'bg-purple-100 border-purple-400',
  green: 'bg-green-100 border-green-400',
  orange: 'bg-orange-100 border-orange-400',
  red: 'bg-red-100 border-red-400',
  yellow: 'bg-yellow-100 border-yellow-400',
}

const valueColorClasses = {
  gray: 'text-gray-900',
  blue: 'text-blue-700',
  purple: 'text-purple-700',
  green: 'text-green-700',
  orange: 'text-orange-700',
  red: 'text-red-700',
  black: 'text-black',
}

const valueSizeClasses = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
}

export function InfoField({
  icon: Icon,
  iconColor = 'gray',
  label,
  value,
  valueSize = 'base',
  valueColor = 'gray',
  onClick,
  className,
}: InfoFieldProps) {
  const isClickable = !!onClick

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* 圖標容器 - 統一 40x40 */}
      <div
        className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-sm border-2',
          iconColorClasses[iconColor]
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2.5} />
      </div>

      {/* 內容容器 */}
      <div className="min-w-0 flex-1">
        {/* 標籤 - 統一 11px 大寫灰色 */}
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</div>

        {/* 內容 - 統一字體大小與顏色 */}
        {isClickable ? (
          <button
            onClick={onClick}
            className={cn(
              'cursor-pointer font-bold transition-colors hover:underline',
              valueSizeClasses[valueSize],
              valueColorClasses[valueColor],
              'hover:opacity-80'
            )}
          >
            {value}
          </button>
        ) : (
          <div className={cn('font-bold', valueSizeClasses[valueSize], valueColorClasses[valueColor])}>{value}</div>
        )}
      </div>
    </div>
  )
}

/**
 * 區塊標題元件
 * 用於客戶資料、訂單資料等區塊的標題
 */
interface SectionHeaderProps {
  title: string
  icon?: LucideIcon
  className?: string
}

export function SectionHeader({ title, icon: Icon, className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b-2 border-gray-300 pb-2',
        'text-lg md:text-xl font-bold text-gray-700',
        className
      )}
    >
      {Icon && <Icon className="h-5 w-5 md:h-6 md:w-6" />}
      <span>{title}</span>
    </div>
  )
}

/**
 * 備註欄位元件
 * 用於管理員備註、客戶備註等特殊資訊顯示
 */
interface NoteFieldProps {
  /**
   * Lucide 圖標組件
   */
  icon: LucideIcon
  /**
   * 備註標籤
   */
  label: string
  /**
   * 備註內容
   */
  content: string
  /**
   * 備註類型（決定顏色）
   */
  variant?: 'info' | 'warning' | 'danger' | 'success'
  /**
   * 自訂 className
   */
  className?: string
}

const noteVariantClasses = {
  info: {
    container: 'bg-blue-50',
    label: 'text-blue-800',
    border: 'border-blue-400',
    content: 'bg-white text-blue-900',
  },
  warning: {
    container: 'bg-yellow-50',
    label: 'text-yellow-800',
    border: 'border-yellow-400',
    content: 'bg-white text-yellow-900',
  },
  danger: {
    container: 'bg-red-50',
    label: 'text-red-800',
    border: 'border-red-400',
    content: 'bg-white text-red-900',
  },
  success: {
    container: 'bg-green-50',
    label: 'text-green-800',
    border: 'border-green-400',
    content: 'bg-white text-green-900',
  },
}

export function NoteField({ icon: Icon, label, content, variant = 'info', className }: NoteFieldProps) {
  const variantClasses = noteVariantClasses[variant]

  return (
    <div className={cn('space-y-2', className)}>
      {/* 標籤 */}
      <div className={cn('flex items-center gap-2 text-sm font-bold', variantClasses.label)}>
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>

      {/* 內容 */}
      <div
        className={cn(
          'rounded-none border-2 p-3 text-sm font-medium md:p-4',
          variantClasses.border,
          variantClasses.content
        )}
      >
        {content}
      </div>
    </div>
  )
}
