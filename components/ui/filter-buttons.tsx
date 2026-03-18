'use client'

import { cn } from '@/lib/utils'

export type FilterOption = {
  id: string
  label: string
  color?: string
}

interface FilterButtonsProps {
  options: FilterOption[]
  selected: string[]
  onToggle: (id: string) => void
  multiSelect?: boolean
  className?: string
}

export function FilterButtons({
  options,
  selected,
  onToggle,
  multiSelect = true,
  className = '',
}: FilterButtonsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => {
        const isSelected = selected.includes(option.id)

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onToggle(option.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium',
              'border-theme rounded-theme-sm',
              'transition-all duration-200',
              isSelected
                ? cn(
                    'shadow-neo-sm -translate-y-0.5',
                    option.color || 'bg-primary text-text-inverse'
                  )
                : cn(
                    'shadow-neo-sm',
                    option.color || 'bg-surface text-foreground',
                    'hover:-translate-y-0.5 hover:shadow-theme-hover'
                  )
            )}
            aria-pressed={isSelected}
          >
            {option.label}
            {isSelected && multiSelect && (
              <span className="ml-2 text-xs">✓</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

interface ClearFiltersButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
}

export function ClearFiltersButton({
  onClick,
  disabled = false,
  className = '',
}: ClearFiltersButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-4 py-2 text-sm font-medium',
        'border-theme rounded-theme-sm',
        'transition-all duration-200',
        disabled
          ? 'bg-surface-secondary text-muted cursor-not-allowed'
          : 'bg-surface text-error shadow-neo-sm hover:-translate-y-0.5 hover:shadow-theme-hover',
        className
      )}
      aria-label="清除所有篩選"
    >
      清除篩選
    </button>
  )
}

interface FilterResultCountProps {
  count: number
  total?: number
  className?: string
}

export function FilterResultCount({
  count,
  total,
  className = '',
}: FilterResultCountProps) {
  return (
    <div
      className={cn(
        'px-3 py-1 text-sm',
        'border-theme rounded-theme-sm bg-warning-bg',
        className
      )}
      aria-live="polite"
    >
      <span className="font-semibold">{count}</span>
      {total !== undefined && (
        <span className="text-text-secondary"> / {total}</span>
      )}
      <span className="text-text-secondary ml-1">筆商品</span>
    </div>
  )
}
