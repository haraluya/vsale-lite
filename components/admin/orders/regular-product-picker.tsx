'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Search, Plus, Minus, Package } from 'lucide-react'
import { getProductsWithTierPrices } from '@/lib/actions/products'
import { getSeries } from '@/lib/actions/series'
import type { AdminOrderDraftReturn, DraftRegularItem } from '@/hooks/use-admin-order-draft'
import type { Series } from '@/types'

interface RegularProductPickerProps {
  draft: AdminOrderDraftReturn
  tierId: string
}

type ProductItem = {
  id: string
  name: string
  code: string
  series_id: string
  series_name: string
  retail_price: number
  tier_price: number
  stock: number
  image_url: string | null
}

export function RegularProductPicker({ draft, tierId }: RegularProductPickerProps) {
  const [search, setSearch] = useState('')
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null)
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [products, setProducts] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // 載入系列列表
  useEffect(() => {
    async function loadSeries() {
      const result = await getSeries()
      if (result.success && result.data) {
        setSeriesList(result.data.filter(s => s.status === 'active'))
      }
    }
    loadSeries()
  }, [])

  // 搜尋防抖
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [search])

  // 載入商品
  const loadProducts = useCallback(async () => {
    setLoading(true)
    const result = await getProductsWithTierPrices(tierId, {
      search: debouncedSearch || undefined,
      seriesId: selectedSeriesId || undefined,
      limit: 50,
    })
    if (result.success && result.data) {
      setProducts(result.data)
    }
    setLoading(false)
  }, [tierId, debouncedSearch, selectedSeriesId])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // 取得商品在草稿中的數量
  const getItemQuantity = useCallback((productId: string) => {
    const item = draft.regularItems.find(i => i.productId === productId)
    return item?.quantity ?? 0
  }, [draft.regularItems])

  // 加入商品
  const handleAdd = useCallback((product: ProductItem) => {
    const item: DraftRegularItem = {
      productId: product.id,
      productName: product.name,
      code: product.code,
      seriesId: product.series_id,
      seriesName: product.series_name,
      quantity: 1,
      retailPrice: product.retail_price,
      tierPrice: product.tier_price,
    }
    draft.addRegularItem(item)
  }, [draft])

  // 更新數量
  const handleQuantityChange = useCallback((productId: string, delta: number) => {
    const currentQty = getItemQuantity(productId)
    const newQty = currentQty + delta
    if (newQty <= 0) {
      draft.removeRegularItem(productId)
    } else {
      draft.updateRegularItemQuantity(productId, newQty)
    }
  }, [draft, getItemQuantity])

  return (
    <div className="space-y-3">
      {/* 搜尋欄 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
        <input
          type="text"
          placeholder="搜尋商品名稱或編號..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border-theme rounded-theme-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* 系列篩選標籤 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setSelectedSeriesId(null)}
          className={`shrink-0 px-3 py-1 text-xs rounded-full border-theme transition-colors ${
            selectedSeriesId === null
              ? 'bg-primary text-text-inverse'
              : 'bg-surface-secondary text-text-secondary hover:bg-surface'
          }`}
        >
          全部
        </button>
        {seriesList.map((series) => (
          <button
            key={series.id}
            onClick={() => setSelectedSeriesId(series.id === selectedSeriesId ? null : series.id)}
            className={`shrink-0 px-3 py-1 text-xs rounded-full border-theme transition-colors ${
              selectedSeriesId === series.id
                ? 'bg-primary text-text-inverse'
                : 'bg-surface-secondary text-text-secondary hover:bg-surface'
            }`}
          >
            {series.name}
          </button>
        ))}
      </div>

      {/* 商品列表 */}
      <div className="max-h-[40vh] overflow-y-auto space-y-1.5">
        {loading ? (
          <div className="py-8 text-center text-sm text-text-secondary">載入中...</div>
        ) : products.length === 0 ? (
          <div className="py-8 text-center text-sm text-text-secondary">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
            找不到商品
          </div>
        ) : (
          products.map((product) => {
            const qty = getItemQuantity(product.id)
            return (
              <div
                key={product.id}
                className="flex items-center gap-3 p-2.5 rounded-theme-sm border-theme bg-surface hover:bg-surface-secondary transition-colors"
              >
                {/* 商品資訊 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-text-secondary font-mono">{product.code}</span>
                    <span className="text-xs text-text-secondary">·</span>
                    <span className="text-xs text-text-secondary">{product.series_name}</span>
                  </div>
                  <div className="text-sm font-medium truncate">{product.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-semibold text-blue-600">
                      ${product.tier_price.toLocaleString()}
                    </span>
                    {product.tier_price < product.retail_price && (
                      <span className="text-xs text-text-secondary line-through">
                        ${product.retail_price.toLocaleString()}
                      </span>
                    )}
                    <span className="text-xs text-text-secondary">
                      庫存: {product.stock}
                    </span>
                  </div>
                </div>

                {/* 數量控制 */}
                <div className="shrink-0">
                  {qty > 0 ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={() => handleQuantityChange(product.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={() => handleQuantityChange(product.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => handleAdd(product)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
