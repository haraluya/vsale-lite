/**
 * 商品列表頁面 Loading UI
 * 使用 Neo-Brutalism 風格 Skeleton
 */

export default function StoreLoading() {
  return (
    <div className="container mx-auto px-4 py-6">
      {/* 系列選擇器 Skeleton */}
      <div className="mb-6">
        <div className="h-12 bg-surface-secondary animate-pulse rounded-none border-2 border-black md:border-3" />
      </div>

      {/* 商品網格 Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="border-2 md:border-3 border-black bg-surface p-4 rounded-none shadow-neo-sm md:shadow-neo"
          >
            {/* 商品圖片 Skeleton */}
            <div className="aspect-square bg-surface-secondary animate-pulse mb-4 border-2 border-black" />

            {/* 商品名稱 Skeleton */}
            <div className="h-5 bg-surface-secondary animate-pulse mb-3 w-3/4 border border-black" />

            {/* 價格 Skeleton */}
            <div className="flex items-baseline gap-2 mb-3">
              <div className="h-6 bg-surface-secondary animate-pulse w-20 border border-black" />
              <div className="h-4 bg-surface-secondary animate-pulse w-14 border border-black" />
            </div>

            {/* 按鈕 Skeleton */}
            <div className="h-10 bg-surface-secondary animate-pulse w-full border-2 border-black" />
          </div>
        ))}
      </div>
    </div>
  )
}
