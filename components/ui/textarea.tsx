import { cn } from '@/lib/utils'
import { TextareaHTMLAttributes, forwardRef } from 'react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'rounded-theme-sm border-theme bg-surface text-foreground px-3 py-2 text-sm md:px-4 md:py-2.5 md:text-base w-full resize-y transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
          className
        )}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'

export { Textarea }
