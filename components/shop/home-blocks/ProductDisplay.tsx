/**
 * ProductDisplay Component
 * Feature: 016-home-page-blocks (US3)
 *
 * 商品展示區塊元件
 * - 呼叫 Server Action 查詢商品
 * - 響應式網格（2/3/4/5 列，與商品頁一致）
 * - 橫向滾動（隱藏滾動條，百分比寬度）
 * - 左右箭頭導引（商品超過可視範圍時顯示，縮小版避免遮擋）
 * - 整合等級價格
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { getSeriesProductsWithPrice, getCurrentUser } from '@/lib/actions/shop'
import { ProductWithPriceCard } from '@/components/shop/product-with-price-card'
import type { ProductDisplayConfig, ProductWithPrice } from '@/types'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ProductDisplayProps {
  config: ProductDisplayConfig
  initialProducts?: ProductWithPrice[] | null // ⭐ 新增：預載商品資料（優化批次查詢）
  initialTierName?: string | null // ⭐ 新增：預載等級名稱
}

export function ProductDisplay({ config, initialProducts, initialTierName }: ProductDisplayProps) {
  const [products, setProducts] = useState<ProductWithPrice[]>(initialProducts || [])
  const [tierName, setTierName] = useState<string>(initialTierName || '訪客')
  const [isLoading, setIsLoading] = useState(!initialProducts) // ⭐ 有預載資料則不需載入
  const [error, setError] = useState<string | null>(null)

  // 滾動容器與箭頭顯示狀態
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  useEffect(() => {
    // ⭐ 優化：若已有預載資料，則跳過查詢
    if (initialProducts) {
      return
    }

    async function fetchProducts() {
      try {
        setIsLoading(true)
        setError(null)

        // 取得當前使用者等級
        const userResult = await getCurrentUser()
        const tierNameValue = userResult.success ? userResult.data?.tier_name || '訪客' : '訪客'

        setTierName(tierNameValue)

        // 查詢商品（使用與商品頁相同的 API）
        const result = await getSeriesProductsWithPrice(
          config.series_ids || [],
          {
            tags: config.tag_ids || undefined,
            maxItems: config.max_items || undefined
          }
        )

        if (!result.success) {
          setError(result.message || '查詢商品失敗')
          return
        }

        setProducts(result.data || [])
      } catch (err) {
        console.error('查詢商品失敗:', err)
        setError('查詢商品失敗')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [config, initialProducts])

  // 檢查是否需要顯示箭頭
  const checkArrows = () => {
    if (!scrollContainerRef.current) return

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current

    setShowLeftArrow(scrollLeft > 0)
    setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 1) // -1 避免浮點數誤差
  }

  // 監聽滾動事件與 resize
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    checkArrows()

    const handleScroll = () => checkArrows()
    const handleResize = () => checkArrows()

    container.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleResize)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [products])

  // 箭頭點擊滾動（滾動容器寬度的 50%）
  const handleScrollLeft = () => {
    if (!scrollContainerRef.current) return
    const scrollAmount = scrollContainerRef.current.clientWidth * 0.5
    scrollContainerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
  }

  const handleScrollRight = () => {
    if (!scrollContainerRef.current) return
    const scrollAmount = scrollContainerRef.current.clientWidth * 0.5
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
  }

  if (isLoading) {
    return (
      <div className="w-full py-8 text-center text-text-secondary">
        <p className="text-sm md:text-base">載入中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full py-8 text-center text-error">
        <p className="text-sm md:text-base">{error}</p>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="w-full py-8 text-center text-text-secondary">
        <p className="text-sm md:text-base">暫無商品</p>
      </div>
    )
  }

  return (
    <div className="w-full relative">
      {/* 左箭頭 - 縮小版 */}
      {showLeftArrow && (
        <button
          type="button"
          onClick={handleScrollLeft}
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 z-10',
            'w-8 h-8 md:w-10 md:h-10', // 縮小尺寸
            'bg-white/90 backdrop-blur-sm', // 半透明背景
            'border-2 border-black',
            'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]', // 縮小陰影
            'hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]',
            'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
            'transition-all duration-100',
            'flex items-center justify-center',
            'rounded-none'
          )}
          aria-label="向左滑動"
        >
          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      )}

      {/* 右箭頭 - 縮小版 */}
      {showRightArrow && (
        <button
          type="button"
          onClick={handleScrollRight}
          className={cn(
            'absolute right-0 top-1/2 -translate-y-1/2 z-10',
            'w-8 h-8 md:w-10 md:h-10', // 縮小尺寸
            'bg-white/90 backdrop-blur-sm', // 半透明背景
            'border-2 border-black',
            'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]', // 縮小陰影
            'hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]',
            'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
            'transition-all duration-100',
            'flex items-center justify-center',
            'rounded-none'
          )}
          aria-label="向右滑動"
        >
          <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      )}

      {/* 商品網格容器（橫向滾動） */}
      <div
        ref={scrollContainerRef}
        className={cn(
          'overflow-x-auto',
          'scrollbar-hide', // 隱藏滾動條
          'pb-2', // 底部留白避免卡片陰影被截斷
        )}
      >
        <div className={cn(
          'grid grid-flow-col auto-cols-[50%] md:auto-cols-[33.333%] lg:auto-cols-[25%] xl:auto-cols-[20%]',
          'gap-3 md:gap-4'
        )}>
          {products.map((product) => (
            <ProductWithPriceCard
              key={product.id}
              product={product}
              tierName={tierName}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
