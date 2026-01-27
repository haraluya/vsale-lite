/**
 * CategoryPriceTable Component
 * Feature: 價格管理優化 - 分類價格表格
 *
 * 分類價格批量設定表格
 * - 顯示分類所有商品 × 所有等級的價格矩陣
 * - 支援批量儲存
 * - 零售等級價格欄位禁用 (顯示零售價格)
 * - 無快速填入功能 (風險控制)
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { batchSetTierPrices } from '@/lib/actions/tier-prices'
import type { Category, ProductWithAllTierPrices } from '@/types'
import { Button } from '@/components/ui/button'
import { useAlert } from '@/lib/contexts/dialog-context'

interface CategoryPriceTableProps {
  category: Category
  products: ProductWithAllTierPrices[]
}

export function CategoryPriceTable({ category, products }: CategoryPriceTableProps) {
  const router = useRouter()
  const alert = useAlert()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 初始化價格狀態 (key: "product_id_tier_id", value: price)
  const [prices, setPrices] = useState<Record<string, number | null>>({})

  // 當 products 變更時，同步更新價格狀態（修復分類切換後價格不顯示的問題）
  useEffect(() => {
    const initialPrices: Record<string, number | null> = {}
    products.forEach((product) => {
      product.tier_prices.forEach((tierPrice) => {
        const key = `${product.id}_${tierPrice.tier_id}`
        initialPrices[key] = tierPrice.price
      })
    })
    setPrices(initialPrices)
  }, [products])

  const handlePriceChange = (productId: string, tierId: string, value: string) => {
    const key = `${productId}_${tierId}`
    const numValue = value === '' ? null : parseFloat(value)
    setPrices((prev) => ({ ...prev, [key]: numValue }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 過濾出非零售等級的價格（允許 null，這樣可以清空價格）
      const priceData = Object.entries(prices)
        .filter(([key]) => {
          // 檢查是否為零售等級 (零售等級價格不允許手動設定)
          const [productId, tierId] = key.split('_')
          const product = products.find((p) => p.id === productId)
          const tierPrice = product?.tier_prices.find((tp) => tp.tier_id === tierId)
          return !tierPrice?.is_protected
        })
        .map(([key, price]) => {
          const [product_id, tier_id] = key.split('_')
          return { product_id, tier_id, price: price === null ? null : Number(price) }
        })

      if (priceData.length === 0) {
        setError('請至少選擇一個非零售等級的商品進行設定')
        setLoading(false)
        return
      }

      // 驗證所有價格資料的格式（允許 null）
      const invalidData = priceData.find(
        (item) =>
          !item.product_id ||
          !item.tier_id ||
          (item.price !== null && (typeof item.price !== 'number' || item.price < 0 || isNaN(item.price)))
      )
      if (invalidData) {
        setError(`資料格式錯誤: ${JSON.stringify(invalidData)}`)
        setLoading(false)
        return
      }

      const result = await batchSetTierPrices({ prices: priceData })

      if (!result.success) {
        // 顯示詳細錯誤訊息
        const errorDetails = result.errors
          ? Object.entries(result.errors)
              .map(([key, msgs]) => `${key}: ${msgs.join(', ')}`)
              .join('\n')
          : result.message
        throw new Error(errorDetails || '批量設定價格失敗')
      }

      // 顯示成功彈窗
      await alert({
        title: '批量設定價格成功',
        message: `分類「${category.name}」的價格已更新`,
        variant: 'success',
      })

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setLoading(false)
    }
  }

  // 取得所有等級 (從第一個商品取得)
  const tiers = products[0]?.tier_prices || []

  // 依系列排序商品
  const sortedProducts = [...products].sort((a: any, b: any) => {
    const seriesA = a.series?.sort_order || 999
    const seriesB = b.series?.sort_order || 999
    if (seriesA !== seriesB) return seriesA - seriesB
    // 同系列內依商品編號排序
    return (a.code || '').localeCompare(b.code || '', 'zh-TW')
  })

  // 為每個系列分配循環底色（使用專案設計系統的淡色）
  const seriesColors = [
    'bg-blue-50',    // 藍色 - 清新
    'bg-purple-50',  // 紫色 - 優雅
    'bg-green-50',   // 綠色 - 自然
    'bg-yellow-50',  // 黃色 - 明亮
    'bg-pink-50',    // 粉色 - 柔和
  ]

  // 計算每個商品所屬系列的顏色索引
  const getSeriesColorClass = (product: any) => {
    // 取得所有唯一系列（依排序順序）
    const uniqueSeries = Array.from(
      new Map(
        sortedProducts.map((p: any) => [
          p.series?.id || 'uncategorized',
          p.series?.sort_order || 999,
        ])
      ).entries()
    ).sort((a, b) => a[1] - b[1])

    const seriesId = product.series?.id || 'uncategorized'
    const seriesIndex = uniqueSeries.findIndex(([id]) => id === seriesId)
    return seriesColors[seriesIndex % seriesColors.length]
  }

  return (
    <div className="space-y-4">
      {/* 錯誤訊息 */}
      {error && (
        <div className="rounded-none border-2 border-red-600 bg-red-50 p-4">
          <p className="font-bold text-red-800">{error}</p>
        </div>
      )}

      {/* 分類資訊 */}
      <div className="rounded-none border-2 md:border-3 border-black bg-white p-4 shadow-neo">
        <h3 className="text-lg font-bold">{category.name}</h3>
        {category.description && <p className="mt-1 text-sm text-gray-600">{category.description}</p>}
        <p className="mt-2 text-sm font-medium">
          共 {products.length} 個商品 × {tiers.length} 個等級
        </p>
      </div>

      {/* 價格表格 */}
      <form onSubmit={handleSubmit}>
        <div className="overflow-x-auto rounded-none border-2 md:border-3 border-black bg-white shadow-neo">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="sticky left-0 z-10 border-b-2 border-r-2 border-black bg-gray-100 px-4 py-3 text-left font-bold">
                  系列 / 商品名稱
                </th>
                {tiers.map((tier) => (
                  <th key={tier.tier_id} className="border-b-2 border-black px-3 py-2 text-left font-bold">
                    {tier.tier_name}
                    {tier.is_protected && (
                      <span className="ml-2 rounded-none border border-yellow-600 bg-yellow-100 px-1 text-xs text-yellow-700">
                        自動
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map((product: any, idx) => {
                const seriesColorClass = getSeriesColorClass(product)
                return (
                  <tr
                    key={product.id}
                    className={`border-b border-gray-200 hover:bg-opacity-70 ${seriesColorClass}`}
                  >
                    {/* 商品資訊 */}
                    <td className={`sticky left-0 z-10 border-r-2 border-black px-4 py-3 ${seriesColorClass}`}>
                    <div className="font-bold">{product.name}</div>
                    <div className="text-sm text-gray-600">{product.series?.name || '未分類'}</div>
                  </td>

                  {/* 各等級價格 */}
                  {tiers.map((tier) => {
                    const key = `${product.id}_${tier.tier_id}`
                    const currentPrice = prices[key]
                    const isRetail = tier.is_protected

                    return (
                      <td key={tier.tier_id} className="border-black px-4 py-3">
                        {isRetail ? (
                          // 零售等級：顯示零售價格（禁用編輯）
                          <input
                            type="text"
                            value={product.retail_price ? `$${Math.round(product.retail_price)}` : 'N/A'}
                            disabled
                            className="w-28 rounded-none border-2 border-yellow-300 bg-yellow-50 px-3 py-1 text-sm text-yellow-700 cursor-not-allowed"
                          />
                        ) : (
                          // 其他等級：可編輯價格
                          <>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={currentPrice ?? ''}
                              onChange={(e) => handlePriceChange(product.id, tier.tier_id, e.target.value)}
                              placeholder="未設定"
                              className="w-28 rounded-none border-2 border-gray-300 bg-white px-3 py-1 text-sm focus:border-blue-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            {/* 折扣率顯示 */}
                            {currentPrice && product.retail_price && (
                              <div className="mt-1 text-xs">
                                {currentPrice < product.retail_price ? (
                                  <span className="text-green-600 font-medium">
                                    省{' '}
                                    {Math.round(
                                      ((product.retail_price - currentPrice) / product.retail_price) * 100
                                    )}
                                    %
                                  </span>
                                ) : currentPrice === product.retail_price ? (
                                  <span className="text-gray-500">原價</span>
                                ) : (
                                  <span className="text-red-600 font-medium">
                                    +{Math.round(((currentPrice - product.retail_price) / product.retail_price) * 100)}
                                    %
                                  </span>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    )
                  })}
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 說明與儲存按鈕 */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <p>💡 提示:</p>
            <ul className="ml-4 mt-1 list-disc space-y-1">
              <li>可逐一設定各商品在不同等級的價格</li>
              <li>零售等級價格自動同步商品的零售價格,無法手動修改</li>
              <li>留空的價格欄位,客戶端會自動顯示原價 (零售價格)</li>
              <li>支援批量設定,一次儲存所有變更</li>
            </ul>
          </div>

          <Button type="submit" disabled={loading} size="lg">
            <Save className="mr-2 h-5 w-5" />
            {loading ? '儲存中...' : `批量儲存 (${products.length} 個商品)`}
          </Button>
        </div>
      </form>
    </div>
  )
}
