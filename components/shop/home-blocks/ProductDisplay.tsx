/**
 * ProductDisplay Component
 * Feature: 016-home-page-blocks (US3)
 *
 * 商品展示區塊元件
 * - 呼叫 Server Action 查詢商品
 * - 單排橫向滾動（手機 160px / 桌面 200px 固定寬度）
 * - 水平滑動支援（CSS scroll-snap + 滑鼠拖曳）
 * - 左右箭頭導引（商品超過可視範圍時顯示）
 * - 滑動提示（商品數量過多時顯示）
 * - 整合等級價格
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { getProductsByBlockConfig } from '@/lib/actions/home-blocks'
import { getCurrentUser } from '@/lib/actions/shop'
import { ProductWithPriceCard } from '@/components/shop/product-with-price-card'
import type { ProductDisplayConfig, ProductWithPrice } from '@/types'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ProductDisplayProps {
  config: ProductDisplayConfig
}

export function ProductDisplay({ config }: ProductDisplayProps) {
  const [products, setProducts] = useState<ProductWithPrice[]>([])
  const [tierName, setTierName] = useState<string>('訪客')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 滾動容器與箭頭顯示狀態
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  // 滑鼠拖曳狀態
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true)
        setError(null)

        // 取得當前使用者等級
        const userResult = await getCurrentUser()
        const tierId = userResult.success ? userResult.data?.tier_id || null : null
        const tierNameValue = userResult.success ? userResult.data?.tier_name || '訪客' : '訪客'

        setTierName(tierNameValue)

        // 查詢商品
        const result = await getProductsByBlockConfig(config, tierId)

        if (!result.success) {
          setError(result.message || '查詢商品失敗')
          return
        }

        setProducts(result.data as ProductWithPrice[])
      } catch (err) {
        console.error('查詢商品失敗:', err)
        setError('查詢商品失敗')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [config])

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

  // 滑鼠拖曳開始
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return

    setIsDragging(true)
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft)
    setScrollLeft(scrollContainerRef.current.scrollLeft)
  }

  // 滑鼠拖曳中
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return

    e.preventDefault()
    const x = e.pageX - scrollContainerRef.current.offsetLeft
    const walk = (x - startX) * 2 // 拖曳速度倍率
    scrollContainerRef.current.scrollLeft = scrollLeft - walk
  }

  // 滑鼠拖曳結束
  const handleMouseUpOrLeave = () => {
    setIsDragging(false)
  }

  // 箭頭點擊滾動
  const handleScrollLeft = () => {
    if (!scrollContainerRef.current) return
    scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' })
  }

  const handleScrollRight = () => {
    if (!scrollContainerRef.current) return
    scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' })
  }

  // 計算是否顯示滑動提示
  const showScrollHint = products.length > 3 // 單排橫向滾動，超過 3 個商品顯示提示

  if (isLoading) {
    return (
      <div className="w-full py-8 text-center text-gray-500">
        <p className="text-sm md:text-base">載入中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full py-8 text-center text-red-600">
        <p className="text-sm md:text-base">{error}</p>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="w-full py-8 text-center text-gray-500">
        <p className="text-sm md:text-base">暫無商品</p>
      </div>
    )
  }

  return (
    <div className="w-full relative">
      {/* 左箭頭 */}
      {showLeftArrow && (
        <button
          type="button"
          onClick={handleScrollLeft}
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 z-10',
            'w-10 h-10 md:w-12 md:h-12',
            'bg-white border-2 md:border-3 border-black',
            'shadow-neo-sm md:shadow-neo',
            'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
            'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
            'transition-all duration-100',
            'flex items-center justify-center',
            'rounded-none'
          )}
          aria-label="向左滑動"
        >
          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      )}

      {/* 右箭頭 */}
      {showRightArrow && (
        <button
          type="button"
          onClick={handleScrollRight}
          className={cn(
            'absolute right-0 top-1/2 -translate-y-1/2 z-10',
            'w-10 h-10 md:w-12 md:h-12',
            'bg-white border-2 md:border-3 border-black',
            'shadow-neo-sm md:shadow-neo',
            'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
            'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
            'transition-all duration-100',
            'flex items-center justify-center',
            'rounded-none'
          )}
          aria-label="向右滑動"
        >
          <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      )}

      {/* 商品橫向滾動容器 */}
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className={cn(
          'flex gap-4 md:gap-6',
          'overflow-x-auto',
          'snap-x snap-mandatory',
          'scrollbar-hide', // 隱藏滾動條（需要在 globals.css 中定義）
          'pb-2', // 底部留白避免卡片陰影被截斷
          'px-12 md:px-14', // 左右留白避免箭頭遮擋商品
          isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
        )}
      >
        {products.map((product) => (
          <div
            key={product.id}
            className={cn(
              'snap-start',
              'flex-shrink-0', // 防止卡片被壓縮
              'w-[calc(50%-0.5rem)] md:w-[calc(20%-1.2rem)]' // 手機版一排 2 個（50% - gap/2），電腦版一排 5 個（20% - gap/1.25）
            )}
          >
            <ProductWithPriceCard
              product={product}
              tierName={tierName}
            />
          </div>
        ))}
      </div>

      {/* 滑動提示 */}
      {showScrollHint && (
        <div className="mt-4 md:mt-6 text-center">
          <p className="text-xs md:text-sm text-gray-500">
            ← 左右滑動查看更多 →
          </p>
        </div>
      )}
    </div>
  )
}
