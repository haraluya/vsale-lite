import { ImageCarousel } from './ImageCarousel'
import { ImageCarouselPortrait } from './ImageCarouselPortrait'
import { ProductDisplay } from './ProductDisplay'
import { TextBlock } from './TextBlock'
import type { HomePageBlock, ImageCarouselConfig, ProductDisplayConfig, TextBlockConfig } from '@/types'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface BlockRendererProps {
  block: HomePageBlock & { products?: any[], tierName?: string } // ⭐ 支援預載商品資料
}

/**
 * 區塊渲染器
 * 根據 block_type 渲染對應的前台元件
 *
 * 容器寬度策略：
 * - 所有區塊都使用 container.default (max-w-7xl) 與上方版面對齊
 * - 僅左右 padding，上下間距由父層的 space-y 控制
 */
export function BlockRenderer({ block }: BlockRendererProps) {
  switch (block.block_type) {
    case 'image_carousel':
      return (
        <div className={cn(
          designTokens.container.default,
          'px-4 md:px-6 lg:px-8'
        )}>
          <ImageCarousel
            config={block.config as ImageCarouselConfig}
            blockUpdatedAt={block.updated_at} // 🔧 修復：傳入更新時間避免快取問題
          />
        </div>
      )

    case 'image_carousel_portrait':
      return (
        <div className={cn(
          designTokens.container.default,
          'px-4 md:px-6 lg:px-8'
        )}>
          <ImageCarouselPortrait
            config={block.config as ImageCarouselConfig}
            blockUpdatedAt={block.updated_at}
          />
        </div>
      )

    case 'product_display':
      return (
        <div className={cn(
          designTokens.container.default,
          'px-4 md:px-6 lg:px-8'
        )}>
          <ProductDisplay
            config={block.config as ProductDisplayConfig}
            initialProducts={block.products || null} // ⭐ 傳遞預載商品
            initialTierName={block.tierName || null} // ⭐ 傳遞等級名稱
          />
        </div>
      )

    case 'text_block':
      return (
        <div className={cn(
          designTokens.container.default,
          'px-4 md:px-6 lg:px-8'
        )}>
          <TextBlock config={block.config as TextBlockConfig} />
        </div>
      )

    default:
      return (
        <div className={cn(
          designTokens.container.default,
          'px-4 md:px-6 lg:px-8'
        )}>
          <div className="p-6 bg-error-bg border-2 border-red-600 rounded-none">
            <p className="text-error font-bold">
              錯誤：未知的區塊類型「{block.block_type}」
            </p>
          </div>
        </div>
      )
  }
}
