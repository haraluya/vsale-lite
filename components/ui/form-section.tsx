import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

export interface FormSectionProps {
  title?: string
  variant?: 'default' | 'primary' | 'warning' | 'info' | 'success' | 'danger'
  description?: string
  children: ReactNode
  className?: string
}

export function FormSection({
  title,
  variant = 'default',
  description,
  children,
  className,
}: FormSectionProps) {
  const variantStyles = {
    default: {
      bg: 'bg-surface',
      border: '',
      title: 'text-foreground',
    },
    primary: {
      bg: 'bg-primary-light',
      border: 'border-primary',
      title: 'text-foreground',
    },
    warning: {
      bg: 'bg-warning-bg',
      border: 'border-warning-border',
      title: 'text-foreground',
    },
    info: {
      bg: 'bg-info-bg',
      border: 'border-info-border',
      title: 'text-foreground',
    },
    success: {
      bg: 'bg-success-bg',
      border: 'border-success-border',
      title: 'text-foreground',
    },
    danger: {
      bg: 'bg-error-bg',
      border: 'border-error-border',
      title: 'text-foreground',
    },
  } as const

  const styles = variantStyles[variant]

  return (
    <div
      className={cn(
        'rounded-theme p-4 md:p-6',
        'border-theme',
        'shadow-neo-sm',
        styles.bg,
        styles.border,
        className
      )}
    >
      {title && (
        <h3
          className={cn(
            'mb-4 text-lg md:text-xl font-semibold',
            styles.title
          )}
        >
          {title}
        </h3>
      )}

      {description && (
        <p className="mb-4 text-xs md:text-sm text-text-secondary">
          {description}
        </p>
      )}

      {children}
    </div>
  )
}
