import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

export interface FormSectionProps {
  /** 區塊標題 */
  title?: string
  /** 色彩變體 */
  variant?: 'default' | 'primary' | 'warning' | 'info' | 'success' | 'danger'
  /** 區塊說明文字 */
  description?: string
  /** 子元素 */
  children: ReactNode
  /** 額外的 CSS 類別 */
  className?: string
}

/**
 * FormSection - 表單區塊容器元件
 *
 * 用於包裝表單中的不同區塊，提供視覺區分和語意化設計。
 * 遵循 Neo-Brutalism 設計風格（強烈邊框、陰影、直角）。
 *
 * @example
 * ```tsx
 * <FormSection variant="primary" title="基本資訊">
 *   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 *     <Input name="name" />
 *     <Input name="email" />
 *   </div>
 * </FormSection>
 * ```
 */
export function FormSection({
  title,
  variant = 'default',
  description,
  children,
  className,
}: FormSectionProps) {
  // 色彩變體樣式映射
  const variantStyles = {
    default: {
      bg: 'bg-white',
      border: 'border-black',
      title: 'text-black',
    },
    primary: {
      bg: 'bg-purple-50',
      border: 'border-purple-500',
      title: 'text-purple-900',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-500',
      title: 'text-yellow-900',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      title: 'text-blue-900',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-500',
      title: 'text-green-900',
    },
    danger: {
      bg: 'bg-red-50',
      border: 'border-red-500',
      title: 'text-red-900',
    },
  } as const

  const styles = variantStyles[variant]

  return (
    <div
      className={cn(
        // 基礎樣式
        'rounded-none p-4 md:p-6',
        // Neo-Brutalism 邊框與陰影（響應式）
        'border-2 md:border-3',
        'shadow-neo-sm md:shadow-neo',
        // 色彩變體
        styles.bg,
        styles.border,
        // 額外樣式
        className
      )}
    >
      {/* 區塊標題 */}
      {title && (
        <h3
          className={cn(
            'mb-4 text-lg md:text-xl font-bold',
            styles.title
          )}
        >
          {title}
        </h3>
      )}

      {/* 區塊說明文字 */}
      {description && (
        <p className="mb-4 text-xs md:text-sm text-gray-600">
          {description}
        </p>
      )}

      {/* 內容區域 */}
      {children}
    </div>
  )
}
