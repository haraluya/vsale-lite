import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-none bg-surface-secondary border-2',
        className
      )}
    />
  )
}
