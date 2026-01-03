/**
 * SeriesDetailClient Component
 * Feature: 007-system-enhancement (US3 - 系列頁商品圖片即時預覽)
 *
 * 系列詳情頁的客戶端包裝元件
 * - 管理圖片切換狀態
 * - 整合 SeriesHeroImage 與 ProductWithPriceCard
 * - 提供圖片切換功能給子元件
 */

'use client'

import { useState } from 'react'
import { SeriesHeroImage } from './SeriesHeroImage'
import { ProductWithPriceCard } from '@/components/shop/product-with-price-card'
import type { ProductWithPrice, Series } from '@/types'

interface SeriesDetailClientProps {
  series: Series
  products: ProductWithPrice[]
  tierName: string
}

export function SeriesDetailClient({
  series,
  products,
  tierName,
}: SeriesDetailClientProps) {
  const [currentImage, setCurrentImage] = useState<string | null>(series.image_url)
  const [currentProductName, setCurrentProductName] = useState<string | null>(null)

  /**
   * 切換至商品圖片
   */
  const handleProductImageClick = (imageUrl: string, productName: string) => {
    if (!imageUrl) return
    setCurrentImage(imageUrl)
    setCurrentProductName(productName)
  }

  /**
   * 恢復系列圖片
   */
  const handleResetImage = () => {
    setCurrentImage(series.image_url)
    setCurrentProductName(null)
  }

  return (
    <>
      {/* Hero Image */}
      <div className="mb-6">
        <SeriesHeroImage
          seriesName={series.name}
          seriesImageUrl={series.image_url}
          currentImage={currentImage}
          currentProductName={currentProductName}
          onReset={handleResetImage}
        />
      </div>

      {/* 商品列表 */}
      {!products || products.length === 0 ? (
        <div className="rounded-none border-3 border-black bg-white p-12 text-center shadow-neo">
          <p className="text-lg text-gray-500">此系列目前沒有可用的商品</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductWithPriceCard
              key={product.id}
              product={product}
              tierName={tierName}
              onImageClick={handleProductImageClick}
            />
          ))}
        </div>
      )}
    </>
  )
}
