'use client'

/**
 * 商店搜尋與篩選元件
 * Feature: 006-ux-enhancement (US1, US2)
 */

import { useState, useEffect } from 'react'
import { SearchBar } from '@/components/ui/search-bar'
import { FilterButtons, ClearFiltersButton, FilterResultCount, FilterOption } from '@/components/ui/filter-buttons'
import { searchProducts, filterProducts } from '@/lib/actions/products'
import { Product } from '@/types'
import { ProductCard } from '@/components/shop/product-card'

interface StoreSearchProps {
  categories: { id: string; name: string }[]
  availableTags: string[]
}

export function StoreSearch({ categories, availableTags }: StoreSearchProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [isActive, setIsActive] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // 從 localStorage 載入篩選狀態
  useEffect(() => {
    const savedCategories = localStorage.getItem('filter_categories')
    const savedTags = localStorage.getItem('filter_tags')

    if (savedCategories) {
      try {
        setSelectedCategories(JSON.parse(savedCategories))
      } catch (e) {
        console.error('Failed to parse saved categories', e)
      }
    }

    if (savedTags) {
      try {
        setSelectedTags(JSON.parse(savedTags))
      } catch (e) {
        console.error('Failed to parse saved tags', e)
      }
    }
  }, [])

  // 儲存篩選狀態到 localStorage
  useEffect(() => {
    if (selectedCategories.length > 0) {
      localStorage.setItem('filter_categories', JSON.stringify(selectedCategories))
    } else {
      localStorage.removeItem('filter_categories')
    }
  }, [selectedCategories])

  useEffect(() => {
    if (selectedTags.length > 0) {
      localStorage.setItem('filter_tags', JSON.stringify(selectedTags))
    } else {
      localStorage.removeItem('filter_tags')
    }
  }, [selectedTags])

  // 執行搜尋或篩選
  const executeSearchOrFilter = async () => {
    // 如果有搜尋關鍵字，執行搜尋
    if (searchQuery.trim().length >= 2) {
      const result = await searchProducts(searchQuery)
      if (result.success && result.data) {
        setProducts(result.data)
        setIsActive(true)
      }
      return
    }

    // 如果有篩選條件，執行篩選
    if (selectedCategories.length > 0 || selectedTags.length > 0) {
      const result = await filterProducts({
        category_ids: selectedCategories,
        tags: selectedTags,
      })
      if (result.success && result.data) {
        setProducts(result.data)
        setIsActive(true)
      }
      return
    }

    // 沒有任何條件，清空結果
    setIsActive(false)
    setProducts([])
  }

  // 監聽篩選條件變化
  useEffect(() => {
    executeSearchOrFilter()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategories, selectedTags])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)

    // 如果查詢為空，檢查是否有篩選條件
    if (query.trim().length === 0) {
      if (selectedCategories.length === 0 && selectedTags.length === 0) {
        setIsActive(false)
        setProducts([])
      } else {
        // 有篩選條件，執行篩選
        executeSearchOrFilter()
      }
      return
    }

    // 執行搜尋
    const result = await searchProducts(query)
    if (result.success && result.data) {
      setProducts(result.data)
      setIsActive(true)
    } else {
      setProducts([])
      setIsActive(true)
    }
  }

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    )
  }

  const handleClearFilters = () => {
    setSelectedCategories([])
    setSelectedTags([])
    setSearchQuery('')
    setIsActive(false)
    setProducts([])
  }

  const hasFilters = selectedCategories.length > 0 || selectedTags.length > 0

  // 轉換為 FilterOption 格式
  const categoryOptions: FilterOption[] = categories.map((cat) => ({
    id: cat.id,
    label: cat.name,
    color: 'bg-blue-100 border-blue-500 text-blue-900',
  }))

  const tagOptions: FilterOption[] = availableTags.map((tag) => ({
    id: tag,
    label: tag,
    color: 'bg-green-100 border-green-500 text-green-900',
  }))

  return (
    <div>
      {/* 搜尋欄 */}
      <div className="mb-4">
        <SearchBar
          onSearch={handleSearch}
          placeholder="搜尋商品名稱或編號..."
          debounceMs={300}
          minLength={2}
        />
      </div>

      {/* 類別篩選 */}
      {categories.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-bold">類別</h3>
          <FilterButtons
            options={categoryOptions}
            selected={selectedCategories}
            onToggle={handleCategoryToggle}
            multiSelect={true}
          />
        </div>
      )}

      {/* 標籤篩選 */}
      {availableTags.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-bold">標籤</h3>
          <FilterButtons
            options={tagOptions}
            selected={selectedTags}
            onToggle={handleTagToggle}
            multiSelect={true}
          />
        </div>
      )}

      {/* 篩選狀態與清除按鈕 */}
      {(hasFilters || isActive) && (
        <div className="mb-4 flex items-center gap-4">
          <FilterResultCount count={products.length} />
          {hasFilters && (
            <ClearFiltersButton onClick={handleClearFilters} />
          )}
        </div>
      )}

      {/* 搜尋/篩選結果 */}
      {isActive && (
        <div>
          {products.length === 0 ? (
            <div className="rounded-none border-3 border-black bg-white p-12 text-center shadow-neo">
              <p className="text-lg text-gray-500">
                找不到符合條件的商品
              </p>
              <p className="mt-2 text-sm text-gray-400">
                請嘗試使用其他關鍵字或篩選條件
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
