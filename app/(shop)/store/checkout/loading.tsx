/**
 * 結帳頁面 Loading UI
 * 使用 Neo-Brutalism 風格 Skeleton
 */

export default function CheckoutLoading() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* 標題 Skeleton */}
      <div className="mb-6">
        <div className="h-8 bg-surface-secondary animate-shimmer w-24 border" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：訂單資訊表單 Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          {/* 配送資訊 Skeleton */}
          <div className="border-theme bg-surface p-6 rounded-theme-sm shadow-neo-sm">
            <div className="h-6 bg-surface-secondary animate-shimmer w-32 mb-4 border" />
            <div className="space-y-4">
              <div className="h-12 bg-surface-secondary animate-shimmer w-full border" />
              <div className="h-12 bg-surface-secondary animate-shimmer w-full border" />
              <div className="h-24 bg-surface-secondary animate-shimmer w-full border" />
            </div>
          </div>

          {/* 付款資訊 Skeleton */}
          <div className="border-theme bg-surface p-6 rounded-theme-sm shadow-neo-sm">
            <div className="h-6 bg-surface-secondary animate-shimmer w-32 mb-4 border" />
            <div className="space-y-3">
              <div className="h-10 bg-surface-secondary animate-shimmer w-full border" />
              <div className="h-10 bg-surface-secondary animate-shimmer w-full border" />
            </div>
          </div>
        </div>

        {/* 右側：訂單摘要 Skeleton */}
        <div className="lg:col-span-1">
          <div className="border-theme bg-surface p-6 rounded-theme-sm shadow-neo-sm sticky top-6">
            <div className="h-6 bg-surface-secondary animate-shimmer w-32 mb-4 border" />

            {/* 商品列表 Skeleton */}
            <div className="space-y-3 mb-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-16 h-16 bg-surface-secondary animate-shimmer border flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-surface-secondary animate-shimmer mb-2 w-3/4 border" />
                    <div className="h-3 bg-surface-secondary animate-shimmer w-1/2 border" />
                  </div>
                </div>
              ))}
            </div>

            {/* 費用明細 Skeleton */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between">
                <div className="h-4 bg-surface-secondary animate-shimmer w-20 border" />
                <div className="h-4 bg-surface-secondary animate-shimmer w-16 border" />
              </div>
              <div className="flex justify-between">
                <div className="h-4 bg-surface-secondary animate-shimmer w-20 border" />
                <div className="h-4 bg-surface-secondary animate-shimmer w-16 border" />
              </div>
              <div className="border-t pt-3 flex justify-between">
                <div className="h-6 bg-surface-secondary animate-shimmer w-24 border" />
                <div className="h-6 bg-surface-secondary animate-shimmer w-20 border" />
              </div>
            </div>

            {/* 提交按鈕 Skeleton */}
            <div className="h-12 bg-surface-secondary animate-shimmer w-full mt-6 border" />
          </div>
        </div>
      </div>
    </div>
  )
}
