import { Skeleton } from '@/components/ui/skeleton'

function OrderCardSkeleton() {
  return (
    <div className="border p-4 bg-surface shadow-neo-sm">
      <div className="flex justify-between items-start mb-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-4 w-40 mb-2" />
      <div className="flex justify-between items-center mt-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  )
}

export default function OrdersLoading() {
  return (
    <div className="container mx-auto p-4">
      {/* 標題骨架 */}
      <Skeleton className="h-8 w-32 mb-6" />

      {/* 訂單卡片骨架 */}
      <div className="grid gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <OrderCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
