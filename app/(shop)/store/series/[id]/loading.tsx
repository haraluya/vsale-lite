import { Skeleton } from '@/components/ui/skeleton'
import { ProductGridSkeleton } from '@/components/shop/product-card-skeleton'

export default function SeriesDetailLoading() {
  return (
    <div className="container mx-auto p-4">
      {/* 系列資訊骨架 */}
      <div className="border-2 border-black p-6 bg-white shadow-neo mb-6">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Skeleton className="h-4 w-2/3 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* 商品列表標題骨架 */}
      <div className="mb-4">
        <Skeleton className="h-6 w-48" />
      </div>

      {/* 商品網格骨架 */}
      <ProductGridSkeleton count={8} />
    </div>
  )
}
