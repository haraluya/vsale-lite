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
              'px-4 py-2 text-sm font-bold',
              'border-2 md:border-3 rounded-none',
              'transition-all duration-150',
              'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
              isSelected
                ? cn(
                    'shadow-none translate-x-[2px] translate-y-[2px]',
                    option.color || 'bg-brand-primary text-text-inverse'
                  )
                : cn(
                    'shadow-neo',
                    option.color || 'bg-surface text-foreground'
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
        'px-4 py-2 text-sm font-bold',
        'border-2 md:border-3 rounded-none',
        'transition-all duration-150',
        disabled
          ? 'bg-surface-secondary text-muted cursor-not-allowed'
          : cn(
              'bg-surface text-error',
              'shadow-neo',
              'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
            ),
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
        'border-2 md:border-3 rounded-none bg-warning-bg',
        className
      )}
      aria-live="polite"
    >
      <span className="font-bold">{count}</span>
      {total !== undefined && (
        <span className="text-text-secondary"> / {total}</span>
      )}
      <span className="text-text-secondary ml-1">筆商品</span>
    </div>
  )
}
