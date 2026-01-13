import { ImageCarousel } from './ImageCarousel'
import { ProductDisplay } from './ProductDisplay'
import { TextBlock } from './TextBlock'
import type { HomePageBlock, ImageCarouselConfig, ProductDisplayConfig, TextBlockConfig } from '@/types'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface BlockRendererProps {
  block: HomePageBlock
}

/**
 * 區塊渲染器
 * 根據 block_type 渲染對應的前台元件
 *
 * 容器寬度策略：
 * - 所有區塊都使用 container.default (max-w-7xl) 與上方版面對齊
 * - 左右 padding 與頁面一致
 */
export function BlockRenderer({ block }: BlockRendererProps) {
  switch (block.block_type) {
    case 'image_carousel':
      return (
        <div className={cn(
          designTokens.container.default,
          designTokens.spacing.page.padding
        )}>
          <ImageCarousel config={block.config as ImageCarouselConfig} />
        </div>
      )

    case 'product_display':
      return (
        <div className={cn(
          designTokens.container.default,
          designTokens.spacing.page.padding
        )}>
          <ProductDisplay config={block.config as ProductDisplayConfig} />
        </div>
      )

    case 'text_block':
      return (
        <div className={cn(
          designTokens.container.default,
          designTokens.spacing.page.padding
        )}>
          <TextBlock config={block.config as TextBlockConfig} />
        </div>
      )

    default:
      return (
        <div className={cn(
          designTokens.container.default,
          designTokens.spacing.page.padding
        )}>
          <div className="p-6 bg-red-50 border-2 border-red-600 rounded-none">
            <p className="text-red-600 font-bold">
              錯誤：未知的區塊類型「{block.block_type}」
            </p>
          </div>
        </div>
      )
  }
}
