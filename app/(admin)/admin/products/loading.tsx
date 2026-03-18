import { Skeleton } from '@/components/ui/skeleton'

function ProductTableRowSkeleton() {
  return (
    <div className="border-b p-4 flex justify-between items-center">
      <div className="flex items-center gap-4 flex-1">
        <Skeleton className="w-16 h-16" />
        <div className="flex-1">
          <Skeleton className="h-4 w-48 mb-1" />
          <Skeleton className="h-3 w-32 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex-1">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex-1 text-right">
        <Skeleton className="h-4 w-20 ml-auto" />
      </div>
      <div className="ml-4 flex gap-2">
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-16" />
      </div>
    </div>
  )
}

export default function ProductsAdminLoading() {
  return (
    <div className="p-6">
      {/* 標題與操作按鈕骨架 */}
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* 篩選器骨架 */}
      <div className="flex gap-4 mb-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* 表格骨架（桌面版） */}
      <div className="hidden md:block border bg-surface shadow-neo">
        {/* 表頭骨架 */}
        <div className="border-b p-4 bg-surface-secondary flex justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* 表身骨架 */}
        {Array.from({ length: 10 }).map((_, i) => (
          <ProductTableRowSkeleton key={i} />
        ))}
      </div>

      {/* 卡片骨架（手機版） */}
      <div className="md:hidden grid gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border p-4 bg-surface shadow-neo-sm flex gap-4">
            <Skeleton className="w-20 h-20" />
            <div className="flex-1">
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
