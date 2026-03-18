/**
 * 購物車頁面 Loading UI
 * 使用 Neo-Brutalism 風格 Skeleton
 */

export default function CartLoading() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* 標題 Skeleton */}
      <div className="mb-6">
        <div className="h-8 bg-surface-secondary animate-shimmer w-32 border mb-2" />
        <div className="h-5 bg-surface-secondary animate-shimmer w-48 border" />
      </div>

      {/* 購物車項目列表 Skeleton */}
      <div className="space-y-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="border-theme bg-surface p-4 rounded-theme-sm shadow-neo-sm"
          >
            <div className="flex gap-4">
              {/* 商品圖片 Skeleton */}
              <div className="w-20 h-20 md:w-24 md:h-24 bg-surface-secondary animate-shimmer border flex-shrink-0" />

              {/* 商品資訊 Skeleton */}
              <div className="flex-1">
                <div className="h-5 bg-surface-secondary animate-shimmer mb-2 w-3/4 border" />
                <div className="h-4 bg-surface-secondary animate-shimmer mb-2 w-1/2 border" />
                <div className="flex items-center gap-4 mt-3">
                  <div className="h-10 bg-surface-secondary animate-shimmer w-32 border" />
                  <div className="h-6 bg-surface-secondary animate-shimmer w-20 border" />
                </div>
              </div>

              {/* 刪除按鈕 Skeleton */}
              <div className="h-10 w-10 bg-surface-secondary animate-shimmer border flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {/* 總計區域 Skeleton */}
      <div className="border-theme bg-surface p-6 rounded-theme-sm shadow-neo-sm">
        <div className="space-y-3">
          <div className="flex justify-between">
            <div className="h-5 bg-surface-secondary animate-shimmer w-24 border" />
            <div className="h-5 bg-surface-secondary animate-shimmer w-20 border" />
          </div>
          <div className="flex justify-between">
            <div className="h-5 bg-surface-secondary animate-shimmer w-24 border" />
            <div className="h-5 bg-surface-secondary animate-shimmer w-20 border" />
          </div>
          <div className="border-t pt-3 flex justify-between">
            <div className="h-6 bg-surface-secondary animate-shimmer w-32 border" />
            <div className="h-6 bg-surface-secondary animate-shimmer w-24 border" />
          </div>
        </div>

        {/* 結帳按鈕 Skeleton */}
        <div className="h-12 bg-surface-secondary animate-shimmer w-full mt-6 border" />
      </div>
    </div>
  )
}
