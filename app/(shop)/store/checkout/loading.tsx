/**
 * 結帳頁面 Loading UI
 * 使用 Neo-Brutalism 風格 Skeleton
 */

export default function CheckoutLoading() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* 標題 Skeleton */}
      <div className="mb-6">
        <div className="h-8 bg-surface-secondary animate-pulse w-24 border-2 border-black" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：訂單資訊表單 Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          {/* 配送資訊 Skeleton */}
          <div className="border-2 md:border-3 border-black bg-surface p-6 rounded-none shadow-neo-sm md:shadow-neo">
            <div className="h-6 bg-surface-secondary animate-pulse w-32 mb-4 border border-black" />
            <div className="space-y-4">
              <div className="h-12 bg-surface-secondary animate-pulse w-full border-2 border-black" />
              <div className="h-12 bg-surface-secondary animate-pulse w-full border-2 border-black" />
              <div className="h-24 bg-surface-secondary animate-pulse w-full border-2 border-black" />
            </div>
          </div>

          {/* 付款資訊 Skeleton */}
          <div className="border-2 md:border-3 border-black bg-surface p-6 rounded-none shadow-neo-sm md:shadow-neo">
            <div className="h-6 bg-surface-secondary animate-pulse w-32 mb-4 border border-black" />
            <div className="space-y-3">
              <div className="h-10 bg-surface-secondary animate-pulse w-full border-2 border-black" />
              <div className="h-10 bg-surface-secondary animate-pulse w-full border-2 border-black" />
            </div>
          </div>
        </div>

        {/* 右側：訂單摘要 Skeleton */}
        <div className="lg:col-span-1">
          <div className="border-2 md:border-3 border-black bg-surface p-6 rounded-none shadow-neo-sm md:shadow-neo sticky top-6">
            <div className="h-6 bg-surface-secondary animate-pulse w-32 mb-4 border border-black" />

            {/* 商品列表 Skeleton */}
            <div className="space-y-3 mb-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-16 h-16 bg-surface-secondary animate-pulse border-2 border-black flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-surface-secondary animate-pulse mb-2 w-3/4 border border-black" />
                    <div className="h-3 bg-surface-secondary animate-pulse w-1/2 border border-black" />
                  </div>
                </div>
              ))}
            </div>

            {/* 費用明細 Skeleton */}
            <div className="border-t-2 border-black pt-4 space-y-3">
              <div className="flex justify-between">
                <div className="h-4 bg-surface-secondary animate-pulse w-20 border border-black" />
                <div className="h-4 bg-surface-secondary animate-pulse w-16 border border-black" />
              </div>
              <div className="flex justify-between">
                <div className="h-4 bg-surface-secondary animate-pulse w-20 border border-black" />
                <div className="h-4 bg-surface-secondary animate-pulse w-16 border border-black" />
              </div>
              <div className="border-t-2 border-black pt-3 flex justify-between">
                <div className="h-6 bg-surface-secondary animate-pulse w-24 border border-black" />
                <div className="h-6 bg-surface-secondary animate-pulse w-20 border border-black" />
              </div>
            </div>

            {/* 提交按鈕 Skeleton */}
            <div className="h-12 bg-surface-secondary animate-pulse w-full mt-6 border-2 border-black" />
          </div>
        </div>
      </div>
    </div>
  )
}
