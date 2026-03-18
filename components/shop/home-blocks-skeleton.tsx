/**
 * Home Blocks Skeleton Components
 * ⭐ 優化：Streaming SSR 的 Suspense fallback 元件
 *
 * 用於首頁 Suspense 邊界的骨架屏
 * - CarouselSkeleton: 輪播圖骨架屏
 * - ProductsSkeleton: 商品展示骨架屏
 */

import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

/**
 * 輪播圖骨架屏
 */
export function CarouselSkeleton() {
  return (
    <div className={cn(
      designTokens.container.default,
      'px-4 md:px-6 lg:px-8'
    )}>
      <div
        className={cn(
          'relative w-full aspect-[16/9] rounded-none bg-surface-secondary animate-pulse',
          designTokens.neoBrutalism.border.full,
          'border-black',
          designTokens.neoBrutalism.shadow.full,
        )}
        role="status"
        aria-label="載入輪播圖中"
      >
        {/* 骨架屏中央文字 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm md:text-base text-text-secondary">載入中...</p>
        </div>
      </div>
    </div>
  )
}

/**
 * 商品展示骨架屏
 */
export function ProductsSkeleton() {
  return (
    <div className={cn(
      designTokens.container.default,
      'px-4 md:px-6 lg:px-8'
    )}>
      {/* 橫向滾動網格骨架 */}
      <div className="overflow-hidden pb-2">
        <div className={cn(
          'grid grid-flow-col auto-cols-[50%] md:auto-cols-[33.333%] lg:auto-cols-[25%] xl:auto-cols-[20%]',
          'gap-3 md:gap-4'
        )}>
          {/* 顯示 5 個商品卡片骨架 */}
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "rounded-none bg-surface",
                designTokens.neoBrutalism.border.full,
                "border-black",
                designTokens.neoBrutalism.shadow.full,
                "p-2 md:p-4",
                "animate-pulse"
              )}
              role="status"
              aria-label={`載入商品 ${index + 1}`}
            >
              {/* 商品圖片骨架 */}
              <div
                className={cn(
                  "mb-2 md:mb-4 aspect-square rounded-none bg-surface-secondary",
                  designTokens.neoBrutalism.border.mobile,
                  "border-black",
                )}
              />

              {/* 商品資訊骨架 */}
              <div className="space-y-2 md:space-y-3">
                {/* 商品名稱骨架 */}
                <div className="h-4 md:h-5 bg-surface-secondary rounded-none w-3/4" />
                <div className="h-4 md:h-5 bg-surface-secondary rounded-none w-1/2" />

                {/* 價格骨架 */}
                <div className={cn(
                  "rounded-none bg-surface-secondary",
                  designTokens.neoBrutalism.border.mobile,
                  "border-gray-300",
                  "p-2 md:p-3"
                )}>
                  <div className="h-6 md:h-8 bg-surface-secondary rounded-none w-2/3" />
                </div>

                {/* 按鈕骨架 */}
                <div className={cn(
                  "mt-1.5 md:mt-3 h-[44px] rounded-none bg-surface-secondary",
                  designTokens.neoBrutalism.border.full,
                  "border-black"
                )} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 文字區塊骨架屏
 */
export function TextBlockSkeleton() {
  return (
    <div className={cn(
      designTokens.container.default,
      'px-4 md:px-6 lg:px-8'
    )}>
      <div className={cn(
        "rounded-none bg-surface p-4 md:p-6 animate-pulse",
        designTokens.neoBrutalism.border.full,
        "border-black",
        designTokens.neoBrutalism.shadow.full,
      )}>
        <div className="h-6 md:h-8 bg-surface-secondary rounded-none w-1/3 mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-surface-secondary rounded-none w-full" />
          <div className="h-4 bg-surface-secondary rounded-none w-5/6" />
          <div className="h-4 bg-surface-secondary rounded-none w-4/5" />
        </div>
      </div>
    </div>
  )
}

/**
 * 首頁區塊組合骨架屏
 * ⭐ 優化：Streaming SSR 的完整首頁骨架屏
 *
 * 顯示輪播圖 + 商品展示的組合骨架
 */
export function HomeBlocksSkeleton() {
  return (
    <div className="w-full space-y-3 md:space-y-4">
      {/* 輪播圖骨架 */}
      <CarouselSkeleton />

      {/* 商品展示骨架 */}
      <ProductsSkeleton />

      {/* 第二個商品展示骨架（常見的首頁佈局） */}
      <ProductsSkeleton />
    </div>
  )
}

