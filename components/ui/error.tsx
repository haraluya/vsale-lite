import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface ErrorProps {
  title?: string
  message: string
  retry?: () => void
  className?: string
}

export function Error({
  title = '發生錯誤',
  message,
  retry,
  className,
}: ErrorProps) {
  return (
    <div
      className={cn(
        'rounded-theme border-theme border-error bg-error-bg p-6 shadow-neo-sm',
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <AlertCircle className="h-6 w-6 text-error" />
        </div>
        <div className="flex-1">
          <h3 className="mb-1 text-lg font-semibold text-error">{title}</h3>
          <p className="text-sm text-error">{message}</p>
          {retry && (
            <Button
              onClick={retry}
              variant="outline"
              size="sm"
              className="mt-4 border-error text-error hover:bg-error-bg"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              重試
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ErrorPage({
  title = '頁面載入失敗',
  message = '抱歉,頁面載入時發生錯誤,請稍後再試。',
  retry,
}: ErrorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <Error title={title} message={message} retry={retry} />
      </div>
    </div>
  )
}

export function ErrorInline({ message, className }: { message: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-theme-sm border-theme border-error bg-error-bg p-3 text-sm text-error',
        className
      )}
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <p>{message}</p>
    </div>
  )
}
