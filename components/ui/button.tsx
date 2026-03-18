import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-theme-sm border-theme disabled:pointer-events-none shadow-neo-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-theme-hover active:scale-[0.98] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-neo-sm',
  {
    variants: {
      variant: {
        primary: 'bg-primary hover:bg-primary-dark text-text-inverse',
        secondary: 'bg-surface-secondary hover:bg-surface text-foreground',
        danger: 'bg-error hover:opacity-90 text-text-inverse',
        outline: 'bg-surface hover:bg-surface-secondary text-foreground',
      },
      size: {
        default: 'px-4 py-2 text-sm md:px-6 md:py-3 md:text-base',
        sm: 'px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm',
        lg: 'px-6 py-3 text-base md:px-8 md:py-4 md:text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
