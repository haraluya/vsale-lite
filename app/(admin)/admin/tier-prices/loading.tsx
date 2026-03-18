import { Skeleton } from '@/components/ui/skeleton'

function PriceTableRowSkeleton() {
  return (
    <div className="border-b-2 border-black p-4 flex justify-between items-center">
      <div className="flex-1">
        <Skeleton className="h-4 w-48 mb-1" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex-1">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex-1 text-right">
        <Skeleton className="h-6 w-24 ml-auto" />
      </div>
      <div className="ml-4">
        <Skeleton className="h-9 w-16" />
      </div>
    </div>
  )
}

export default function TierPricesLoading() {
  return (
    <div className="p-6">
      {/* 標題與選擇器骨架 */}
      <div className="mb-6">
        <Skeleton className="h-8 w-40 mb-4" />
        <div className="flex gap-4 mb-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-48" />
        </div>
      </div>

      {/* 價格設定表單骨架 */}
      <div className="border-2 border-black p-6 bg-surface shadow-neo mb-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* 價格列表標題骨架 */}
      <Skeleton className="h-6 w-48 mb-4" />

      {/* 價格表格骨架（桌面版） */}
      <div className="hidden md:block border-2 border-black bg-surface shadow-neo">
        {/* 表頭骨架 */}
        <div className="border-b-2 border-black p-4 bg-surface-secondary flex justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* 表身骨架 */}
        {Array.from({ length: 12 }).map((_, i) => (
          <PriceTableRowSkeleton key={i} />
        ))}
      </div>

      {/* 卡片骨架（手機版） */}
      <div className="md:hidden grid gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-2 border-black p-4 bg-surface shadow-neo-sm">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-6 w-20 mb-4" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
