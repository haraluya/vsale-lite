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
  gray: 'bg-gray-200 border-gray-400 dark:bg-gray-700 dark:border-gray-500',
  blue: 'bg-blue-100 border-blue-400 dark:bg-blue-900/30 dark:border-blue-600',
  purple: 'bg-purple-100 border-purple-400 dark:bg-purple-900/30 dark:border-purple-600',
  green: 'bg-green-100 border-green-400 dark:bg-green-900/30 dark:border-green-600',
  orange: 'bg-orange-100 border-orange-400 dark:bg-orange-900/30 dark:border-orange-600',
  red: 'bg-red-100 border-red-400 dark:bg-red-900/30 dark:border-red-600',
  yellow: 'bg-yellow-100 border-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-600',
}

const valueColorClasses = {
  gray: 'text-foreground',
  blue: 'text-blue-700 dark:text-blue-300',
  purple: 'text-purple-700 dark:text-purple-300',
  green: 'text-green-700 dark:text-green-300',
  orange: 'text-orange-700 dark:text-orange-300',
  red: 'text-red-700 dark:text-red-300',
  black: 'text-foreground',
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
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-sm border',
          iconColorClasses[iconColor]
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2.5} />
      </div>

      {/* 內容容器 */}
      <div className="min-w-0 flex-1">
        {/* 標籤 - 統一 11px 大寫灰色 */}
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-text-muted">{label}</div>

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
        'flex items-center gap-2 border-b-2 border-border pb-2',
        'text-lg md:text-xl font-bold text-foreground',
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
    container: 'bg-blue-50 dark:bg-blue-900/20',
    label: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-400 dark:border-blue-600',
    content: 'bg-surface text-blue-900 dark:text-blue-200',
  },
  warning: {
    container: 'bg-yellow-50 dark:bg-yellow-900/20',
    label: 'text-yellow-800 dark:text-yellow-300',
    border: 'border-yellow-400 dark:border-yellow-600',
    content: 'bg-surface text-yellow-900 dark:text-yellow-200',
  },
  danger: {
    container: 'bg-red-50 dark:bg-red-900/20',
    label: 'text-red-800 dark:text-red-300',
    border: 'border-red-400 dark:border-red-600',
    content: 'bg-surface text-red-900 dark:text-red-200',
  },
  success: {
    container: 'bg-green-50 dark:bg-green-900/20',
    label: 'text-green-800 dark:text-green-300',
    border: 'border-green-400 dark:border-green-600',
    content: 'bg-surface text-green-900 dark:text-green-200',
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
          'rounded-theme-sm border p-3 text-sm font-medium md:p-4',
          variantClasses.border,
          variantClasses.content
        )}
      >
        {content}
      </div>
    </div>
  )
}
