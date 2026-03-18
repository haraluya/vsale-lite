/**
 * 商品列表頁面 Loading UI
 * 使用 Neo-Brutalism 風格 Skeleton
 */

export default function StoreLoading() {
  return (
    <div className="container mx-auto px-4 py-6">
      {/* 系列選擇器 Skeleton */}
      <div className="mb-6">
        <div className="h-12 bg-surface-secondary animate-shimmer rounded-theme-sm border md:border" />
      </div>

      {/* 商品網格 Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="border-theme bg-surface p-4 rounded-theme-sm shadow-neo-sm"
          >
            {/* 商品圖片 Skeleton */}
            <div className="aspect-square bg-surface-secondary animate-shimmer mb-4 border" />

            {/* 商品名稱 Skeleton */}
            <div className="h-5 bg-surface-secondary animate-shimmer mb-3 w-3/4 border" />

            {/* 價格 Skeleton */}
            <div className="flex items-baseline gap-2 mb-3">
              <div className="h-6 bg-surface-secondary animate-shimmer w-20 border" />
              <div className="h-4 bg-surface-secondary animate-shimmer w-14 border" />
            </div>

            {/* 按鈕 Skeleton */}
            <div className="h-10 bg-surface-secondary animate-shimmer w-full border" />
          </div>
        ))}
      </div>
    </div>
  )
}
