import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'rounded-theme-sm border-theme bg-surface text-foreground px-3 py-2 text-sm md:px-4 md:py-2.5 md:text-base w-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

export { Input }
