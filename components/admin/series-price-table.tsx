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

  // 初始化價格狀態 (key: "product_id_tier_id", value: price)
  const [prices, setPrices] = useState<Record<string, number | null>>(() => {
    const initialPrices: Record<string, number | null> = {}
    products.forEach((product) => {
      product.tier_prices.forEach((tierPrice) => {
        const key = `${product.id}_${tierPrice.tier_id}`
        initialPrices[key] = tierPrice.price
      })
    })
    return initialPrices
  })

  // 快速填入狀態 (key: tier_id, value: amount)
  const [quickFillAmounts, setQuickFillAmounts] = useState<Record<string, string>>({})

  const handlePriceChange = (productId: string, tierId: string, value: string) => {
    const key = `${productId}_${tierId}`
    const numValue = value === '' ? null : parseFloat(value)
    setPrices((prev) => ({ ...prev, [key]: numValue }))
  }

  // 快速填入該等級所有商品的價格
  const handleQuickFill = (tierId: string) => {
    const amount = quickFillAmounts[tierId]
    if (!amount || amount === '') return

    const numValue = parseFloat(amount)
    if (isNaN(numValue) || numValue < 0) return

    const updatedPrices = { ...prices }
    products.forEach((product) => {
      const key = `${product.id}_${tierId}`
      updatedPrices[key] = numValue
    })
    setPrices(updatedPrices)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

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
                {tiers.map((tier) => (
                  <th
                    key={tier.tier_id}
                    className="border-b-2 border-black px-3 py-2 text-left font-bold"
                  >
                    <div className="mb-2">
                      {tier.tier_name}
                    </div>
                    {/* 快速填入 */}
                    {!tier.is_protected && (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={quickFillAmounts[tier.tier_id] || ''}
                          onChange={(e) =>
                            setQuickFillAmounts((prev) => ({
                              ...prev,
                              [tier.tier_id]: e.target.value,
                            }))
                          }
                          placeholder="金額"
                          className="flex-1 min-w-0 rounded-none border border-gray-400 px-1.5 py-0.5 text-xs focus:border-blue-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuickFill(tier.tier_id)}
                          className="rounded-none border border-black bg-green-400 px-2 py-0.5 text-xs font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-none whitespace-nowrap"
                        >
                          帶入
                        </button>
                      </div>
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

                  {/* 各等級價格 */}
                  {tiers.map((tier) => {
                    const key = `${product.id}_${tier.tier_id}`
                    const currentPrice = prices[key]
                    const isRetail = tier.is_protected

                    return (
                      <td key={tier.tier_id} className="border-black px-4 py-3">
                        {isRetail ? (
                          // 零售等級：顯示零售價格（禁用編輯）
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={product.retail_price ? `$${product.retail_price.toFixed(2)}` : 'N/A'}
                              disabled
                              className="w-28 rounded-none border-2 border-yellow-300 bg-yellow-50 px-3 py-1 text-sm text-yellow-700 cursor-not-allowed"
                            />
                            <span className="text-xs text-gray-500">自動同步</span>
                          </div>
                        ) : (
                          // 其他等級：可編輯價格
                          <>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={currentPrice ?? ''}
                              onChange={(e) =>
                                handlePriceChange(product.id, tier.tier_id, e.target.value)
                              }
                              placeholder="未設定"
                              className="w-28 rounded-none border-2 border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none"
                            />
                            {/* 折扣率顯示 */}
                            {currentPrice && product.retail_price && (
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
                          </>
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
              <li>使用「快速填入」功能可一鍵將該等級所有商品設定為相同價格</li>
              <li>零售等級價格自動同步商品的零售價格,無法手動修改</li>
              <li>留空的價格欄位，客戶端會自動顯示原價（零售價格）</li>
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
