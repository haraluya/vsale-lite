/**
 * ProductPricingForm Component
 * Feature: 007-system-enhancement (US5 - 價格管理優化)
 *
 * 商品價格表單元件
 * - 商品下拉選單
 * - 價格矩陣表格（所有等級）
 * - 零售價格唯讀提示
 */

'use client'

import { useState, useEffect } from 'react'
import { getProductsForPricing, getProductPriceMatrix, batchSetProductPrices } from '@/lib/actions/pricing'
import { InfoIcon } from 'lucide-react'

export function ProductPricingForm() {
  const [products, setProducts] = useState<any[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [productData, setProductData] = useState<any>(null)
  const [prices, setPrices] = useState<Record<string, number | null>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 載入商品列表
  useEffect(() => {
    const loadProducts = async () => {
      const result = await getProductsForPricing()
      if (result.success && result.data) {
        setProducts(result.data)
      }
    }
    loadProducts()
  }, [])

  // 選擇商品後載入價格矩陣
  useEffect(() => {
    if (!selectedProductId) {
      setProductData(null)
      setPrices({})
      return
    }

    const loadPriceMatrix = async () => {
      setIsLoading(true)
      const result = await getProductPriceMatrix(selectedProductId)

      if (result.success && result.data) {
        setProductData(result.data)

        // 初始化價格表單
        const initialPrices: Record<string, number | null> = {}
        result.data.prices.forEach((p: any) => {
          initialPrices[p.tier_id] = p.price
        })
        setPrices(initialPrices)
      }

      setIsLoading(false)
    }

    loadPriceMatrix()
  }, [selectedProductId])

  // 更新價格
  const handlePriceChange = (tierId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value)
    setPrices((prev) => ({ ...prev, [tierId]: numValue }))
  }

  // 儲存價格
  const handleSave = async () => {
    if (!selectedProductId) return

    setIsSaving(true)
    const result = await batchSetProductPrices(selectedProductId, prices)

    if (result.success) {
      alert('價格設定成功')
    } else {
      alert(result.message || '價格設定失敗')
    }

    setIsSaving(false)
  }

  // 依系列分組商品
  const groupedProducts = products.reduce((acc, product) => {
    const seriesName = product.series?.name || '未分類'
    if (!acc[seriesName]) {
      acc[seriesName] = []
    }
    acc[seriesName].push(product)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="space-y-6">
      {/* 商品選擇器 */}
      <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
        <label className="mb-3 block font-bold">選擇商品</label>
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="w-full rounded-none border-2 border-black px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <option value="">請選擇商品...</option>
          {Object.entries(groupedProducts).map(([seriesName, seriesProducts]) => (
            <optgroup key={seriesName} label={seriesName}>
              {seriesProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.code} - {product.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* 載入中 */}
      {isLoading && (
        <div className="rounded-none border-3 border-black bg-white p-12 text-center shadow-neo">
          <p className="text-lg text-gray-500">載入中...</p>
        </div>
      )}

      {/* 價格矩陣表格 */}
      {!isLoading && productData && (
        <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
          {/* 商品資訊 */}
          <div className="mb-6 rounded-none border-2 border-black bg-blue-50 p-4">
            <h3 className="font-bold">
              {productData.product.code} - {productData.product.name}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              系列: {productData.product.series?.name || '未分類'}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              原價: ${productData.product.retail_price || '未設定'}
            </p>
          </div>

          {/* 價格表格 */}
          <div className="space-y-4">
            <h4 className="font-bold">各等級價格設定</h4>

            {productData.prices.map((priceData: any) => {
              const isRetail = priceData.tier_code === 'RETAIL'

              return (
                <div key={priceData.tier_id} className="flex items-center gap-4">
                  <div className="w-32">
                    <span className="font-bold">{priceData.tier_name}</span>
                    <span className="ml-2 text-xs text-gray-500">({priceData.tier_code})</span>
                  </div>

                  {isRetail ? (
                    <div className="flex-1">
                      <input
                        type="number"
                        value={productData.product.retail_price || ''}
                        disabled
                        className="w-full rounded-none border-2 border-gray-400 bg-gray-100 px-4 py-2 text-gray-500"
                      />
                      <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <InfoIcon className="h-3 w-3" />
                        零售價格請至商品編輯頁修改
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <input
                        type="number"
                        value={prices[priceData.tier_id] ?? ''}
                        onChange={(e) => handlePriceChange(priceData.tier_id, e.target.value)}
                        placeholder="請輸入價格"
                        step="0.01"
                        min="0"
                        className="w-full rounded-none border-2 border-black px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 儲存按鈕 */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-none border-3 border-black bg-green-400 px-8 py-3 font-bold shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? '儲存中...' : '儲存價格'}
            </button>
          </div>
        </div>
      )}

      {/* 提示訊息 */}
      {!isLoading && !productData && (
        <div className="rounded-none border-3 border-black bg-green-50 p-8 text-center shadow-neo">
          <p className="text-lg font-bold">請選擇商品</p>
          <p className="mt-4 text-sm text-gray-600">
            選擇商品後,可設定該商品在各會員等級的價格
          </p>
          <p className="mt-2 text-sm text-gray-600">
            💡 提示：零售價格由商品的零售價格欄位控制,無法在此修改
          </p>
        </div>
      )}
    </div>
  )
}
