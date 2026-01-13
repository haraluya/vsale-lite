/**
 * ProductDisplay Component
 * Feature: 016-home-page-blocks (US3)
 *
 * 商品展示區塊元件
 * - 呼叫 Server Action 查詢商品
 * - 響應式網格（手機 2 列 / 桌面 3 列）
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
  const showScrollHint = products.length > 6 // 手機一排 2 個，超過 3 排顯示提示

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
      {/* 商品網格 */}
      <div
        className={cn(
          'grid gap-4 md:gap-6',
          'grid-cols-2 md:grid-cols-3',
          'overflow-x-auto',
          'snap-x snap-mandatory',
          'scrollbar-hide' // 隱藏滾動條（需要在 globals.css 中定義）
        )}
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="snap-start"
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
