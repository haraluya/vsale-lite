'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={id}
          ref={ref}
          className={cn(
            'h-4 w-4 rounded border-2 bg-surface',
            'checked:bg-foreground checked:border-foreground',
            'focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'
