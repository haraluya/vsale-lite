import { Skeleton } from '@/components/ui/skeleton'

function OrderTableRowSkeleton() {
  return (
    <div className="border-b-2 border-black p-4 flex justify-between items-center">
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex-1">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex-1">
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="flex-1 text-right">
        <Skeleton className="h-4 w-24 ml-auto" />
      </div>
      <div className="ml-4">
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  )
}

export default function AdminOrdersLoading() {
  return (
    <div className="p-6">
      {/* 標題與篩選器骨架 */}
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* 表格骨架（桌面版） */}
      <div className="hidden md:block border-2 border-black bg-surface shadow-neo">
        {/* 表頭骨架 */}
        <div className="border-b-2 border-black p-4 bg-surface-secondary flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* 表身骨架 */}
        {Array.from({ length: 10 }).map((_, i) => (
          <OrderTableRowSkeleton key={i} />
        ))}
      </div>

      {/* 卡片骨架（手機版） */}
      <div className="md:hidden grid gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-2 border-black p-4 bg-surface shadow-neo-sm">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-40 mb-2" />
            <Skeleton className="h-6 w-20 mb-4" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
