import { cn } from '@/lib/utils'

interface LoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Loading({ message = '載入中...', size = 'md', className }: LoadingProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 border',
    md: 'h-12 w-12 border',
    lg: 'h-16 w-16 border',
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 p-8', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-primary border-t-transparent',
          sizeClasses[size]
        )}
        aria-label="載入中"
      />
      {message && <p className="text-sm font-medium text-text-secondary">{message}</p>}
    </div>
  )
}

export function LoadingPage({ message }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loading message={message} size="lg" />
    </div>
  )
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-4 w-4 animate-spin rounded-full border border-primary border-t-transparent',
        className
      )}
      aria-label="載入中"
    />
  )
}
