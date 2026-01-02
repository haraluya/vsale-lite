/**
 * TierPriceTable Component
 * Feature: 003-series-and-pricing (US2)
 *
 * 等級價格批量設定表格 (管理員用)
 * - 顯示所有等級
 * - 批量設定商品在各等級的價格
 * - 支援 UPSERT 操作
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { batchSetTierPrices } from '@/lib/actions/tier-prices'
import type { Product, TierWithPrice } from '@/types'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'

interface TierPriceTableProps {
  product: Product
  tiersWithPrices: TierWithPrice[]
}

export function TierPriceTable({ product, tiersWithPrices }: TierPriceTableProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // 初始化價格狀態
  const [prices, setPrices] = useState<Record<string, number | null>>(
    tiersWithPrices.reduce((acc, tier) => {
      acc[tier.tier_id] = tier.price
      return acc
    }, {} as Record<string, number | null>)
  )

  const handlePriceChange = (tierId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value)
    setPrices((prev) => ({ ...prev, [tierId]: numValue }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // 過濾出有設定價格的等級
      const priceData = Object.entries(prices)
        .filter(([_, price]) => price !== null && price !== undefined)
        .map(([tier_id, price]) => ({
          product_id: product.id,
          tier_id,
          price: price!,
        }))

      if (priceData.length === 0) {
        setError('請至少設定一個等級的價格')
        return
      }

      const result = await batchSetTierPrices({ prices: priceData })

      if (!result.success) {
        throw new Error(result.message || '價格設定失敗')
      }

      setSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setLoading(false)
    }
  }

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
          <p className="font-bold text-green-800">價格設定成功!</p>
        </div>
      )}

      {/* 商品資訊 */}
      <div className="rounded-none border-3 border-black bg-white p-4 shadow-neo">
        <h3 className="text-lg font-bold">{product.name}</h3>
        <p className="text-sm text-gray-600">商品編號: {product.code}</p>
        {product.retail_price !== null && (
          <p className="mt-2 text-sm text-gray-600">
            原價: <span className="font-bold">${product.retail_price}</span>
          </p>
        )}
      </div>

      {/* 等級價格表格 */}
      <form onSubmit={handleSubmit}>
        <div className="overflow-hidden rounded-none border-3 border-black bg-white shadow-neo">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="border-b-2 border-black px-4 py-3 text-left font-bold">
                  會員等級
                </th>
                <th className="border-b-2 border-black px-4 py-3 text-left font-bold">
                  等級順序
                </th>
                <th className="border-b-2 border-black px-4 py-3 text-left font-bold">
                  等級價格 (元)
                </th>
                <th className="border-b-2 border-black px-4 py-3 text-left font-bold">
                  折扣率
                </th>
              </tr>
            </thead>
            <tbody>
              {tiersWithPrices.map((tier) => {
                const currentPrice = prices[tier.tier_id]
                const discount =
                  product.retail_price && currentPrice
                    ? Math.round(
                        ((product.retail_price - currentPrice) / product.retail_price) * 100
                      )
                    : 0

                return (
                  <tr key={tier.tier_id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{tier.tier_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{tier.tier_rank}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={currentPrice ?? ''}
                        onChange={(e) => handlePriceChange(tier.tier_id, e.target.value)}
                        placeholder="未設定"
                        className="w-32 rounded-none border-2 border-gray-300 px-3 py-1 focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {discount > 0 ? (
                        <span className="inline-block rounded-none border border-green-600 bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
                          省 {discount}%
                        </span>
                      ) : currentPrice === null ? (
                        <span className="text-sm text-gray-400">-</span>
                      ) : (
                        <span className="text-sm text-gray-600">原價</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 儲存按鈕 */}
        <div className="mt-4">
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-5 w-5" />
            {loading ? '儲存中...' : '儲存價格'}
          </Button>
        </div>
      </form>
    </div>
  )
}
