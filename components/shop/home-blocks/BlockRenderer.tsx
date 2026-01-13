import { ImageCarousel } from './ImageCarousel'
import { ProductDisplay } from './ProductDisplay'
import { TextBlock } from './TextBlock'
import type { HomePageBlock, ImageCarouselConfig, ProductDisplayConfig, TextBlockConfig } from '@/types'

interface BlockRendererProps {
  block: HomePageBlock
}

/**
 * 區塊渲染器
 * 根據 block_type 渲染對應的前台元件
 */
export function BlockRenderer({ block }: BlockRendererProps) {
  switch (block.block_type) {
    case 'image_carousel':
      return <ImageCarousel config={block.config as ImageCarouselConfig} />

    case 'product_display':
      return <ProductDisplay config={block.config as ProductDisplayConfig} />

    case 'text_block':
      return <TextBlock config={block.config as TextBlockConfig} />

    default:
      return (
        <div className="p-6 bg-red-50 border-2 border-red-600 rounded-none">
          <p className="text-red-600 font-bold">
            錯誤：未知的區塊類型「{block.block_type}」
          </p>
        </div>
      )
  }
}
