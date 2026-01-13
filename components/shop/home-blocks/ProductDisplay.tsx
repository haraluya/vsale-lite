/**
 * ProductDisplay Component
 * Feature: 016-home-page-blocks (US3)
 *
 * 商品展示區塊元件
 * - 呼叫 Server Action 查詢商品
 * - 單排橫向滾動（手機 160px / 桌面 200px 固定寬度）
 * - 水平滑動支援（CSS scroll-snap）
 * - 滑動提示（商品數量過多時顯示）
 * - 整合等級價格
 */

'use client'

import { useEffect, useState } from 'react'
import { getProductsByBlockConfig } from '@/lib/actions/home-blocks'
import { getCurrentUser } from '@/lib/actions/shop'
import { ProductWithPriceCard } from '@/components/shop/product-with-price-card'
import type { ProductDisplayConfig, ProductWithPrice } from '@/types'
import { cn } from '@/lib/utils'

interface ProductDisplayProps {
  config: ProductDisplayConfig
}

export function ProductDisplay({ config }: ProductDisplayProps) {
  const [products, setProducts] = useState<ProductWithPrice[]>([])
  const [tierName, setTierName] = useState<string>('訪客')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    <div className="w-full">
      {/* 商品橫向滾動容器 */}
      <div
        className={cn(
          'flex gap-4 md:gap-6',
          'overflow-x-auto',
          'snap-x snap-mandatory',
          'scrollbar-hide', // 隱藏滾動條（需要在 globals.css 中定義）
          'pb-2' // 底部留白避免卡片陰影被截斷
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
