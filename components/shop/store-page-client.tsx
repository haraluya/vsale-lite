/**
 * Store Page Client Component
 *
 * 處理前台主頁面的客戶端狀態（搜尋/篩選）
 * - 分類篩選：篩選該分類下的系列
 * - 搜尋：搜尋系列名稱/編號與商品名稱/編號
 */

'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { SeriesCard } from '@/components/shop/series-card'
import { ComboDealCard } from '@/components/shop/combo-deals/ComboDealCard'
import { SearchBar } from '@/components/ui/search-bar'
import { FilterButtons, ClearFiltersButton, FilterResultCount, FilterOption } from '@/components/ui/filter-buttons'
import { globalSearch } from '@/lib/actions/shop'
import { ProductCard } from '@/components/shop/product-card'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import type { Series, Product } from '@/types'

interface ComboDeal {
  id: string
  name: string
  poster_url: string
  combo_mode: 'each' | 'mix_match'
  discount_type: 'fixed' | 'percentage'
  discount_value: number
  start_date: string
  end_date: string
  series_count: number
  mix_match_total_quantity?: number
}

interface StorePageClientProps {
  series: Series[]
  categories: { id: string; name: string }[]
  availableTags: string[]
  comboDeals: ComboDeal[]
}

export function StorePageClient({
  series,
  categories,
  availableTags,
  comboDeals,
}: StorePageClientProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [showPromotionsOnly, setShowPromotionsOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchedSeries, setSearchedSeries] = useState<Series[]>([])
  const [searchedProducts, setSearchedProducts] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // 確保元件已掛載（避免 Hydration 錯誤）
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 從 localStorage 載入篩選狀態
  useEffect(() => {
    if (!isMounted) return

    const savedCategories = localStorage.getItem('store_filter_categories')
    if (savedCategories) {
      try {
        setSelectedCategories(JSON.parse(savedCategories))
      } catch (e) {
        console.error('Failed to parse saved categories', e)
      }
    }
  }, [isMounted])

  // 儲存篩選狀態到 localStorage
  useEffect(() => {
    if (selectedCategories.length > 0) {
      localStorage.setItem('store_filter_categories', JSON.stringify(selectedCategories))
    } else {
      localStorage.removeItem('store_filter_categories')
    }
  }, [selectedCategories])

  /**
   * 處理分類切換
   */
  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    )
  }

  /**
   * 處理搜尋（使用 useCallback 避免無限循環）
   * 搜尋範圍：系列名稱+編號、商品名稱+編號
   */
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)

    if (query.trim().length === 0) {
      setIsSearching(false)
      setSearchedSeries([])
      setSearchedProducts([])
      return
    }

    // 輸入少於 2 個字元時，不執行搜尋
    if (query.trim().length < 2) {
      setIsSearching(false)
      setSearchedSeries([])
      setSearchedProducts([])
      return
    }

    // 執行全域搜尋（系列 + 商品）
    const result = await globalSearch(query)
    if (result.success && result.data) {
      setSearchedSeries(result.data.series || [])
      setSearchedProducts(result.data.products || [])
      setIsSearching(true)
    } else {
      setSearchedSeries([])
      setSearchedProducts([])
      setIsSearching(true)
    }
  }, [])

  /**
   * 清除篩選
   */
  const handleClearFilters = () => {
    setSelectedCategories([])
    setShowPromotionsOnly(false)
    setSearchQuery('')
    setIsSearching(false)
    setSearchedSeries([])
    setSearchedProducts([])
  }

  /**
   * 根據分類篩選系列（僅在非搜尋模式且非優惠活動模式時使用）
   */
  const filteredSeries = useMemo(() => {
    // 分類篩選
    if (selectedCategories.length > 0) {
      return series.filter((s) => s.category_id && selectedCategories.includes(s.category_id))
    }
    return series
  }, [series, selectedCategories])

  /**
   * 顯示的系列列表
   * - 搜尋模式：使用搜尋結果
   * - 一般模式：使用分類篩選結果
   */
  const displaySeries = useMemo(() => {
    if (isSearching) {
      return searchedSeries
    }
    return filteredSeries
  }, [isSearching, searchedSeries, filteredSeries])

  // 轉換為 FilterOption 格式
  const categoryOptions: FilterOption[] = categories.map((cat) => ({
    id: cat.id,
    label: cat.name,
    color: 'bg-blue-100 border-blue-500 text-blue-900',
  }))

  const hasFilters = selectedCategories.length > 0 || showPromotionsOnly

  return (
    <>
      {/* 搜尋欄 */}
      <div className="mb-4">
        <SearchBar
          onSearch={handleSearch}
          placeholder="搜尋系列、商品名稱或編號..."
          debounceMs={300}
          minLength={2}
        />
      </div>

      {/* 篩選按鈕群組 */}
      <div className="mb-4 space-y-3">
        {/* 優惠活動按鈕 */}
        {comboDeals.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-bold">優惠活動</h3>
            <button
              onClick={() => setShowPromotionsOnly(!showPromotionsOnly)}
              className={cn(
                'rounded-theme-sm border-theme px-4 py-2 text-sm font-bold transition-all',
                designTokens.cleanCommerce.shadow.base,
                'md:shadow-neo',
                showPromotionsOnly
                  ? 'bg-red-500 text-white'
                  : 'bg-surface text-foreground hover:-translate-y-0.5 hover:shadow-theme-hover'
              )}
            >
              🔥 優惠活動 ({comboDeals.length} 個)
            </button>
          </div>
        )}

        {/* 分類篩選 */}
        {categories.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-bold">類別</h3>
            <FilterButtons
              options={categoryOptions}
              selected={selectedCategories}
              onToggle={handleCategoryToggle}
              multiSelect={true}
            />
          </div>
        )}
      </div>

      {/* 篩選狀態與清除按鈕 */}
      {(hasFilters || isSearching) && (
        <div className="mb-4 flex items-center gap-4">
          <FilterResultCount
            count={isSearching ? (searchedSeries.length + searchedProducts.length) : displaySeries.length}
          />
          {(hasFilters || searchQuery) && (
            <ClearFiltersButton onClick={handleClearFilters} />
          )}
        </div>
      )}

      {/* 搜尋結果：同時顯示系列與商品 */}
      {isSearching ? (
        <>
          {searchedSeries.length === 0 && searchedProducts.length === 0 ? (
            <div className={cn(
              "rounded-theme-sm bg-surface text-center",
              designTokens.cleanCommerce.border.full,
              "border-border",
              designTokens.cleanCommerce.shadow.full,
              "p-8 md:p-12"
            )}>
              <p className={cn(
                designTokens.typography.body.large,
                "text-text-secondary"
              )}>找不到符合條件的系列或商品</p>
              <p className="mt-2 text-sm text-text-secondary">
                請嘗試使用其他關鍵字
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* 搜尋到的系列 */}
              {searchedSeries.length > 0 && (
                <div>
                  <h2 className={cn(
                    designTokens.typography.h2,
                    "mb-4"
                  )}>系列 ({searchedSeries.length})</h2>
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {searchedSeries.map((s) => (
                      <SeriesCard key={s.id} series={s} />
                    ))}
                  </div>
                </div>
              )}

              {/* 搜尋到的商品 */}
              {searchedProducts.length > 0 && (
                <div className={searchedSeries.length > 0 ? "mt-8" : ""}>
                  <h2 className={cn(
                    designTokens.typography.h2,
                    "mb-4"
                  )}>商品 ({searchedProducts.length})</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                    {searchedProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : showPromotionsOnly ? (
        /* 優惠活動模式：僅顯示組合優惠 */
        <>
          {comboDeals.length === 0 ? (
            <div className={cn(
              "rounded-theme-sm bg-surface text-center",
              designTokens.cleanCommerce.border.full,
              "border-border",
              designTokens.cleanCommerce.shadow.full,
              "p-8 md:p-12"
            )}>
              <p className={cn(
                designTokens.typography.body.large,
                "text-text-secondary"
              )}>目前沒有適用於您等級的優惠活動</p>
              <p className="mt-2 text-sm text-text-secondary">
                請稍後再來看看，或聯繫客服了解更多優惠資訊
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {comboDeals.map((deal) => (
                <ComboDealCard key={deal.id} deal={deal} />
              ))}
            </div>
          )}
        </>
      ) : (
        /* 預設或篩選後：先顯示組合優惠，再顯示系列 */
        <>
          {displaySeries.length === 0 && comboDeals.length === 0 ? (
            <div className={cn(
              "rounded-theme-sm bg-surface text-center",
              designTokens.cleanCommerce.border.full,
              "border-border",
              designTokens.cleanCommerce.shadow.full,
              "p-8 md:p-12"
            )}>
              <p className={cn(
                designTokens.typography.body.large,
                "text-text-secondary"
              )}>{hasFilters ? '找不到符合條件的系列' : '目前沒有可用的商品系列'}</p>
              {hasFilters && (
                <p className="mt-2 text-sm text-text-secondary">
                  請嘗試使用其他篩選條件
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* 🔥 組合優惠區塊（優先顯示在最上方） */}
              {comboDeals.length > 0 && (
                <div>
                  <h2 className={cn(
                    designTokens.typography.h2,
                    "mb-4 flex items-center gap-2"
                  )}>
                    <span>🔥 優惠活動</span>
                    <span className="text-base font-normal text-text-secondary">
                      ({comboDeals.length} 個)
                    </span>
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {comboDeals.map((deal) => (
                      <ComboDealCard key={deal.id} deal={deal} />
                    ))}
                  </div>
                </div>
              )}

              {/* 系列區塊 */}
              {displaySeries.length > 0 && (
                <div>
                  <h2 className={cn(
                    designTokens.typography.h2,
                    "mb-4"
                  )}>商品系列</h2>
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {displaySeries.map((s) => (
                      <SeriesCard key={s.id} series={s} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}
