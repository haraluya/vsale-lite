import { Skeleton } from '@/components/ui/skeleton'

export function ProductCardSkeleton() {
  return (
    <div className="border-2 border-black p-4 bg-surface shadow-neo-sm md:shadow-neo">
      <Skeleton className="w-full aspect-square mb-3" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-6 w-1/2" />
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}
