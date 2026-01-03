'use client'

/**
 * 商店搜尋元件
 * Feature: 006-ux-enhancement (US1)
 */

import { useState } from 'react'
import { SearchBar } from '@/components/ui/search-bar'
import { searchProducts } from '@/lib/actions/products'
import { Product } from '@/types'
import { ProductCard } from '@/components/shop/product-card'

interface StoreSearchProps {
  initialProducts?: Product[]
}

export function StoreSearch({ initialProducts = [] }: StoreSearchProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (query: string) => {
    // 如果查詢為空，回復到初始狀態
    if (query.trim().length === 0) {
      setIsSearchActive(false)
      setHasSearched(false)
      return
    }

    setIsSearchActive(true)
    setHasSearched(true)

    const result = await searchProducts(query)

    if (result.success && result.data) {
      setProducts(result.data)
    } else {
      setProducts([])
    }
  }

  return (
    <div>
      {/* 搜尋欄 */}
      <div className="mb-6">
        <SearchBar
          onSearch={handleSearch}
          placeholder="搜尋商品名稱或編號..."
          debounceMs={300}
          minLength={2}
        />
        {hasSearched && (
          <p className="mt-2 text-sm text-gray-600">
            找到 {products.length} 筆商品
          </p>
        )}
      </div>

      {/* 搜尋結果 */}
      {isSearchActive && (
        <div>
          {products.length === 0 ? (
            <div className="rounded-none border-3 border-black bg-white p-12 text-center shadow-neo">
              <p className="text-lg text-gray-500">
                找不到符合條件的商品
              </p>
              <p className="mt-2 text-sm text-gray-400">
                請嘗試使用其他關鍵字搜尋
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
