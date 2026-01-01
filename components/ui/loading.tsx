import { cn } from '@/lib/utils'

interface LoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Loading({ message = '載入中...', size = 'md', className }: LoadingProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 border-2',
    md: 'h-12 w-12 border-3',
    lg: 'h-16 w-16 border-4',
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 p-8', className)}>
      <div
        className={cn(
          'animate-spin rounded-none border-black border-t-transparent',
          sizeClasses[size]
        )}
        aria-label="載入中"
      />
      {message && <p className="text-sm font-medium text-gray-600">{message}</p>}
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
        'h-4 w-4 animate-spin rounded-none border-2 border-black border-t-transparent',
        className
      )}
      aria-label="載入中"
    />
  )
}
