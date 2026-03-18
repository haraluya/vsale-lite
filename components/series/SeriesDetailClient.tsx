/**
 * SeriesDetailClient Component
 * Feature: 007-system-enhancement (US3 - 系列頁商品圖片即時預覽)
 *
 * 系列詳情頁的客戶端包裝元件
 * - 管理圖片切換狀態
 * - 整合 SeriesHeroImage 與 ProductWithPriceCard
 * - 提供圖片切換功能給子元件
 * - 支援標籤篩選功能
 */

'use client'

import { useState, useMemo, useEffect } from 'react'
import { SeriesHeroImage } from './SeriesHeroImage'
import { ProductWithPriceCard } from '@/components/shop/product-with-price-card'
import { FilterButtons, ClearFiltersButton, FilterResultCount, FilterOption } from '@/components/ui/filter-buttons'
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
  const [selectedTags, setSelectedTags] = useState<string[]>([])

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

  /**
   * 處理標籤切換
   */
  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  /**
   * 清除篩選
   */
  const handleClearFilters = () => {
    setSelectedTags([])
  }

  /**
   * 從商品中提取所有可用標籤
   */
  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>()
    products.forEach((product) => {
      if (product.tags && Array.isArray(product.tags)) {
        product.tags.forEach((tag) => tagsSet.add(tag))
      }
    })
    return Array.from(tagsSet).sort()
  }, [products])

  /**
   * 根據標籤篩選商品
   */
  const filteredProducts = useMemo(() => {
    if (selectedTags.length === 0) {
      return products
    }
    return products.filter((product) => {
      if (!product.tags || !Array.isArray(product.tags)) {
        return false
      }
      // 檢查商品是否包含至少一個選中的標籤
      return selectedTags.some((tag) => product.tags?.includes(tag))
    })
  }, [products, selectedTags])

  // 從 localStorage 載入篩選狀態
  useEffect(() => {
    const savedTags = localStorage.getItem(`series_filter_tags_${series.id}`)
    if (savedTags) {
      try {
        setSelectedTags(JSON.parse(savedTags))
      } catch (e) {
        console.error('Failed to parse saved tags', e)
      }
    }
  }, [series.id])

  // 儲存篩選狀態到 localStorage
  useEffect(() => {
    if (selectedTags.length > 0) {
      localStorage.setItem(`series_filter_tags_${series.id}`, JSON.stringify(selectedTags))
    } else {
      localStorage.removeItem(`series_filter_tags_${series.id}`)
    }
  }, [selectedTags, series.id])

  // 轉換為 FilterOption 格式
  const tagOptions: FilterOption[] = availableTags.map((tag) => ({
    id: tag,
    label: tag,
    color: 'bg-green-100 border-success text-green-900',
  }))

  const hasFilters = selectedTags.length > 0

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

      {/* 標籤篩選 */}
      {availableTags.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-bold">篩選</h3>
          <FilterButtons
            options={tagOptions}
            selected={selectedTags}
            onToggle={handleTagToggle}
            multiSelect={true}
          />
        </div>
      )}

      {/* 篩選狀態與清除按鈕 */}
      {hasFilters && (
        <div className="mb-4 flex items-center gap-4">
          <FilterResultCount count={filteredProducts.length} />
          <ClearFiltersButton onClick={handleClearFilters} />
        </div>
      )}

      {/* 商品列表 */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-theme-sm border-theme bg-surface p-12 text-center shadow-neo">
          <p className="text-lg text-text-secondary">
            {hasFilters ? '找不到符合條件的商品' : '此系列目前沒有可用的商品'}
          </p>
          {hasFilters && (
            <p className="mt-2 text-sm text-muted">
              請嘗試使用其他篩選條件
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {filteredProducts.map((product) => (
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
