/**
 * SeriesPriceTable Component
 * Feature: 003-series-and-pricing (Enhancement)
 *
 * 系列價格批量設定表格
 * - 顯示系列所有商品 × 所有等級的價格矩陣
 * - 支援批量儲存
 * - 零售等級價格欄位禁用 (顯示零售價格)
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { batchSetTierPrices } from '@/lib/actions/tier-prices'
import type { Series, ProductWithAllTierPrices } from '@/types'
import { Button } from '@/components/ui/button'

interface SeriesPriceTableProps {
  series: Series
  products: ProductWithAllTierPrices[]
}

export function SeriesPriceTable({ series, products }: SeriesPriceTableProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // 初始化價格狀態 (key: "product_id-tier_id", value: price)
  const [prices, setPrices] = useState<Record<string, number | null>>(() => {
    const initialPrices: Record<string, number | null> = {}
    products.forEach((product) => {
      product.tier_prices.forEach((tierPrice) => {
        const key = `${product.id}-${tierPrice.tier_id}`
        initialPrices[key] = tierPrice.price
      })
    })
    return initialPrices
  })

  const handlePriceChange = (productId: string, tierId: string, value: string) => {
    const key = `${productId}-${tierId}`
    const numValue = value === '' ? null : parseFloat(value)
    setPrices((prev) => ({ ...prev, [key]: numValue }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // 過濾出有設定價格且非零售等級的價格 (零售價格由 retail_price 控制)
      const priceData = Object.entries(prices)
        .filter(([key, price]) => {
          // 檢查價格是否為有效數字
          if (price === null || price === undefined || isNaN(price)) return false
          // 檢查是否為零售等級 (零售等級價格不允許手動設定)
          const [productId, tierId] = key.split('-')
          const product = products.find((p) => p.id === productId)
          const tierPrice = product?.tier_prices.find((tp) => tp.tier_id === tierId)
          return !tierPrice?.is_protected
        })
        .map(([key, price]) => {
          const [product_id, tier_id] = key.split('-')
          return { product_id, tier_id, price: Number(price) }
        })

      if (priceData.length === 0) {
        setError('請至少設定一個非零售等級的價格')
        setLoading(false)
        return
      }

      // 驗證所有價格資料的格式
      const invalidData = priceData.find(
        (item) => !item.product_id || !item.tier_id || typeof item.price !== 'number' || item.price < 0
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
          ? Object.entries(result.errors).map(([key, msgs]) => `${key}: ${msgs.join(', ')}`).join('\n')
          : result.message
        throw new Error(errorDetails || '批量設定價格失敗')
      }

      setSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setLoading(false)
    }
  }

  // 取得所有等級 (從第一個商品取得)
  const tiers = products[0]?.tier_prices || []

  return (
    <div className="space-y-4">
      {/* 錯誤訊息 */}
      {error && (
        <div className="rounded-none border-2 border-red-600 bg-red-50 p-4">
          <p className="font-bold text-red-800">{error}</p>
        </div>
      )}

      {/* 成功訊息 */}
      {success && (
        <div className="rounded-none border-2 border-green-600 bg-green-50 p-4">
          <p className="font-bold text-green-800">
            批量設定價格成功!系列「{series.name}」的價格已更新。
          </p>
        </div>
      )}

      {/* 系列資訊 */}
      <div className="rounded-none border-3 border-black bg-white p-4 shadow-neo">
        <h3 className="text-lg font-bold">{series.name}</h3>
        {series.description && (
          <p className="mt-1 text-sm text-gray-600">{series.description}</p>
        )}
        <p className="mt-2 text-sm font-medium">
          共 {products.length} 個商品 × {tiers.length} 個等級
        </p>
      </div>

      {/* 價格表格 */}
      <form onSubmit={handleSubmit}>
        <div className="overflow-x-auto rounded-none border-3 border-black bg-white shadow-neo">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="sticky left-0 z-10 border-b-2 border-r-2 border-black bg-gray-100 px-4 py-3 text-left font-bold">
                  商品編號 / 名稱
                </th>
                <th className="border-b-2 border-r-2 border-black px-4 py-3 text-left font-bold">
                  零售價格
                </th>
                {tiers.map((tier) => (
                  <th
                    key={tier.tier_id}
                    className="border-b-2 border-black px-4 py-3 text-left font-bold"
                  >
                    {tier.tier_name}
                    {tier.is_protected && (
                      <span className="ml-2 rounded-none border border-yellow-600 bg-yellow-100 px-1 text-xs text-yellow-700">
                        固定
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((product, idx) => (
                <tr
                  key={product.id}
                  className={`border-b border-gray-200 hover:bg-gray-50 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  {/* 商品資訊 */}
                  <td className="sticky left-0 z-10 border-r-2 border-black bg-white px-4 py-3">
                    <div className="font-bold">{product.code}</div>
                    <div className="text-sm text-gray-600">{product.name}</div>
                  </td>

                  {/* 零售價格 (唯讀) */}
                  <td className="border-r-2 border-black px-4 py-3">
                    <div className="font-bold text-blue-600">
                      ${product.retail_price?.toFixed(2) || 'N/A'}
                    </div>
                  </td>

                  {/* 各等級價格 */}
                  {tiers.map((tier) => {
                    const key = `${product.id}-${tier.tier_id}`
                    const currentPrice = prices[key]
                    const isRetail = tier.is_protected

                    return (
                      <td key={tier.tier_id} className="border-black px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={currentPrice ?? ''}
                          onChange={(e) =>
                            handlePriceChange(product.id, tier.tier_id, e.target.value)
                          }
                          disabled={isRetail}
                          placeholder={isRetail ? '自動同步' : '未設定'}
                          className={`w-28 rounded-none border-2 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none ${
                            isRetail
                              ? 'cursor-not-allowed bg-yellow-50 border-yellow-300 text-yellow-700'
                              : 'border-gray-300'
                          }`}
                        />
                        {/* 折扣率顯示 */}
                        {!isRetail && currentPrice && product.retail_price && (
                          <div className="mt-1 text-xs text-gray-500">
                            {currentPrice < product.retail_price
                              ? `省 ${Math.round(
                                  ((product.retail_price - currentPrice) /
                                    product.retail_price) *
                                    100
                                )}%`
                              : currentPrice === product.retail_price
                                ? '原價'
                                : `+${Math.round(
                                    ((currentPrice - product.retail_price) /
                                      product.retail_price) *
                                      100
                                  )}%`}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 說明與儲存按鈕 */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <p>💡 提示:</p>
            <ul className="ml-4 mt-1 list-disc space-y-1">
              <li>零售等級價格自動同步商品的零售價格,無法手動修改</li>
              <li>留空表示該等級尚未設定價格</li>
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
