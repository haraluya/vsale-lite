import { ProductGridSkeleton } from '@/components/shop/product-card-skeleton'

export default function ProductsLoading() {
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <div className="h-8 w-48 bg-surface-secondary border animate-shimmer mb-2" />
        <div className="h-4 w-64 bg-surface-secondary border animate-shimmer" />
      </div>
      <ProductGridSkeleton count={12} />
    </div>
  )
}
