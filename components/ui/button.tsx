import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-none disabled:pointer-events-none border-2 md:border-3 border-black shadow-neo-sm md:shadow-neo font-bold transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-primary hover:bg-primary-dark text-white',
        secondary: 'bg-gray-200 hover:bg-gray-300 text-black',
        danger: 'bg-red-500 hover:bg-red-600 text-white',
        outline: 'bg-white hover:bg-gray-50 text-black',
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
