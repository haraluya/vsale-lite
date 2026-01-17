import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-none bg-gray-200 border-2 border-black',
        className
      )}
    />
  )
}
