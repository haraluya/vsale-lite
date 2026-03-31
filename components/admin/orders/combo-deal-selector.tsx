'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Minus, Plus, ChevronUp, Loader2 } from 'lucide-react'
import { getComboDealDetailWithProducts } from '@/lib/actions/combo-deals'
import { calculateComboDealPrice, formatPrice } from '@/lib/pricing/combo-deals'
import type { SelectedProduct } from '@/types/combo-deals'
import type { ComboDealCartItem } from '@/stores/cart'

interface ComboDealSelectorProps {
  dealId: string
  dealName: string
  comboMode: 'each' | 'mix_match'
  discountType: 'fixed' | 'percentage'
  discountValue: number
  tierId: string
  mixMatchTotalQuantity?: number
  onAdd: (item: ComboDealCartItem) => void
  onClose: () => void
}

type DetailProduct = {
  product_id: string
  product_name: string
  product_code: string
  series_id: string
  retail_price: number
  tier_price: number
}

type DetailSeries = {
  series_id: string
  series_name: string
  required_quantity: number | null
  products: DetailProduct[]
}

export function ComboDealSelector({
  dealId,
  dealName,
  comboMode,
  discountType,
  discountValue,
  tierId,
  mixMatchTotalQuantity,
  onAdd,
  onClose,
}: ComboDealSelectorProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seriesList, setSeriesList] = useState<DetailSeries[]>([])
  // product_id => quantity
  const [selections, setSelections] = useState<Map<string, number>>(new Map())

  // 載入商品資料
  const loadDetail = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await getComboDealDetailWithProducts(dealId, tierId)
    if (result.success && result.data) {
      setSeriesList(result.data.series)
    } else {
      setError(result.message || '載入失敗')
    }
    setLoading(false)
  }, [dealId, tierId])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  // 建立 product_id => DetailProduct 查表
  const productMap = useMemo(() => {
    const map = new Map<string, DetailProduct>()
    for (const s of seriesList) {
      for (const p of s.products) {
        map.set(p.product_id, p)
      }
    }
    return map
  }, [seriesList])

  // 數量操作
  const setQuantity = useCallback((productId: string, qty: number) => {
    setSelections(prev => {
      const next = new Map(prev)
      if (qty <= 0) {
        next.delete(productId)
      } else {
        next.set(productId, qty)
      }
      return next
    })
  }, [])

  // 各系列已選數量
  const seriesSelectedCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const [productId, qty] of selections) {
      const product = productMap.get(productId)
      if (product) {
        counts.set(product.series_id, (counts.get(product.series_id) || 0) + qty)
      }
    }
    return counts
  }, [selections, productMap])

  // 全部已選數量
  const totalSelected = useMemo(() => {
    let sum = 0
    for (const qty of selections.values()) sum += qty
    return sum
  }, [selections])

  // 各選模式：該系列是否還能增加
  const canIncreaseInSeries = useCallback((seriesId: string) => {
    if (comboMode === 'each') {
      const series = seriesList.find(s => s.series_id === seriesId)
      const required = series?.required_quantity ?? 1
      const selected = seriesSelectedCounts.get(seriesId) || 0
      return selected < required
    } else {
      const required = mixMatchTotalQuantity ?? 1
      return totalSelected < required
    }
  }, [comboMode, seriesList, seriesSelectedCounts, totalSelected, mixMatchTotalQuantity])

  // 是否滿足條件（精確匹配數量）
  const isValid = useMemo(() => {
    if (totalSelected === 0) return false
    if (comboMode === 'each') {
      return seriesList.every(s => {
        const required = s.required_quantity ?? 1
        const selected = seriesSelectedCounts.get(s.series_id) || 0
        return selected === required
      })
    } else {
      const required = mixMatchTotalQuantity ?? 1
      return totalSelected === required
    }
  }, [comboMode, seriesList, seriesSelectedCounts, totalSelected, mixMatchTotalQuantity])

  // 價格計算
  const pricing = useMemo(() => {
    const selectedArr = Array.from(selections.entries())
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => {
        const product = productMap.get(productId)
        return {
          product_id: productId,
          series_id: product?.series_id || '',
          quantity,
          retail_price: product?.retail_price || 0,
        }
      })

    if (selectedArr.length === 0) return null

    const tierPricesMap = new Map<string, number>()
    for (const [pid, product] of productMap) {
      tierPricesMap.set(pid, product.tier_price)
    }

    return calculateComboDealPrice(
      selectedArr as SelectedProduct[],
      tierPricesMap,
      { discount_type: discountType, discount_value: discountValue }
    )
  }, [selections, productMap, discountType, discountValue])

  // 加入訂單
  const handleAdd = useCallback(() => {
    if (!pricing) return

    const selectedProducts: SelectedProduct[] = Array.from(selections.entries())
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => {
        const product = productMap.get(productId)
        return {
          product_id: productId,
          series_id: product?.series_id || '',
          quantity,
        }
      })

    const item: ComboDealCartItem = {
      id: `${dealId}-${Date.now()}`,
      combo_deal_id: dealId,
      combo_deal_name: dealName,
      selected_products: selectedProducts,
      original_price: pricing.originalPrice,
      discounted_price: pricing.discountedPrice,
      discount_amount: pricing.discountAmount,
    }

    onAdd(item)
    onClose()
  }, [pricing, selections, productMap, dealId, dealName, onAdd, onClose])

  // 載入中
  if (loading) {
    return (
      <div className="py-6 text-center text-sm text-text-secondary">
        <Loader2 className="h-5 w-5 mx-auto mb-1.5 animate-spin" />
        載入商品中...
      </div>
    )
  }

  // 錯誤
  if (error) {
    return (
      <div className="py-4 text-center text-sm">
        <p className="text-red-600 mb-2">{error}</p>
        <button
          className="text-xs text-primary underline hover:no-underline"
          onClick={loadDetail}
        >
          重試
        </button>
      </div>
    )
  }

  return (
    <div className="border-t border-dashed pt-3 pb-2 px-1 space-y-3">
      {/* 任選模式：頂部顯示總進度 */}
      {comboMode === 'mix_match' && (
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-text-secondary">
            任選 {mixMatchTotalQuantity ?? 0} 件
          </span>
          <span className={totalSelected >= (mixMatchTotalQuantity ?? 0) ? 'text-green-600 font-medium' : 'text-text-secondary'}>
            已選 {totalSelected} / {mixMatchTotalQuantity ?? 0}
          </span>
        </div>
      )}

      {/* 系列商品列表 */}
      {seriesList.map(series => {
        const seriesCount = seriesSelectedCounts.get(series.series_id) || 0
        const required = series.required_quantity ?? 1

        return (
          <div key={series.series_id} className="space-y-1.5">
            {/* 系列標題 */}
            <div className="flex items-center justify-between text-xs font-medium text-text-secondary px-1">
              <span>{series.series_name}</span>
              {comboMode === 'each' && (
                <span className={seriesCount >= required ? 'text-green-600' : 'text-amber-600'}>
                  {seriesCount} / {required}
                </span>
              )}
            </div>

            {/* 商品列表 */}
            {series.products.map(product => {
              const qty = selections.get(product.product_id) || 0
              const canIncrease = canIncreaseInSeries(series.series_id)
              return (
                <div
                  key={product.product_id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded bg-surface-secondary/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{product.product_name}</div>
                    <div className="text-xs text-text-secondary">
                      {product.product_code && <span className="mr-2">{product.product_code}</span>}
                      <span>{formatPrice(product.tier_price)}</span>
                      {product.retail_price > product.tier_price && (
                        <span className="ml-1 line-through text-text-secondary/60">
                          {formatPrice(product.retail_price)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 數量控制 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-30"
                      disabled={qty <= 0}
                      onClick={() => setQuantity(product.product_id, qty - 1)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm tabular-nums">{qty}</span>
                    <button
                      type="button"
                      className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-30"
                      disabled={!canIncrease}
                      onClick={() => setQuantity(product.product_id, qty + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      {/* 價格預覽 */}
      {pricing && totalSelected > 0 && (
        <div className="px-1 pt-1 text-sm space-y-0.5">
          <div className="flex justify-between text-text-secondary">
            <span>等級價小計</span>
            <span>{formatPrice(pricing.originalPrice)}</span>
          </div>
          {pricing.discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>組合折扣</span>
              <span>-{formatPrice(pricing.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-medium">
            <span>合計</span>
            <span>{formatPrice(pricing.discountedPrice)}</span>
          </div>
        </div>
      )}

      {/* 驗證提示 */}
      {!isValid && totalSelected > 0 && comboMode === 'each' && (
        <div className="px-1 text-xs text-amber-600">
          {seriesList
            .filter(s => {
              const required = s.required_quantity ?? 1
              const selected = seriesSelectedCounts.get(s.series_id) || 0
              return selected < required
            })
            .map(s => `「${s.series_name}」還需選 ${(s.required_quantity ?? 1) - (seriesSelectedCounts.get(s.series_id) || 0)} 件`)
            .join('、')}
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          className="flex-1 py-2 text-sm font-medium rounded-theme-sm bg-primary text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          disabled={!isValid || !pricing}
          onClick={handleAdd}
        >
          加入訂單
        </button>
        <button
          type="button"
          className="flex items-center gap-1 px-3 py-2 text-sm text-text-secondary hover:text-foreground transition-colors"
          onClick={onClose}
        >
          <ChevronUp className="h-3.5 w-3.5" />
          收合
        </button>
      </div>
    </div>
  )
}
