'use client'

/**
 * 搜尋欄元件
 * Feature: 006-ux-enhancement (US1)
 */

import { useState, useCallback, useEffect } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

interface SearchBarProps {
  onSearch: (query: string) => void | Promise<void>
  placeholder?: string
  debounceMs?: number
  minLength?: number
  className?: string
}

export function SearchBar({
  onSearch,
  placeholder = '搜尋商品...',
  debounceMs = 300,
  minLength = 2,
  className = '',
}: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // 防抖搜尋
  const debouncedSearch = useCallback(
    (searchQuery: string) => {
      const timer = setTimeout(async () => {
        if (searchQuery.length >= minLength || searchQuery.length === 0) {
          setIsSearching(true)
          try {
            await onSearch(searchQuery)
          } finally {
            setIsSearching(false)
          }
        }
      }, debounceMs)

      return () => clearTimeout(timer)
    },
    [onSearch, debounceMs, minLength]
  )

  // 監聽 query 變化
  useEffect(() => {
    const cleanup = debouncedSearch(query)
    return cleanup
  }, [query, debouncedSearch])

  // 清除搜尋
  const handleClear = () => {
    setQuery('')
  }

  return (
    <div className={`relative ${className}`}>
      {/* 搜尋圖示 */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
        {isSearching ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Search className="h-5 w-5" />
        )}
      </div>

      {/* 輸入框 */}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pl-10 pr-10 py-3
          border-2 md:border-3 border-black rounded-none
          bg-white
          shadow-neo-sm md:shadow-neo 
          focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none
          transition-all duration-150
          text-base
          placeholder:text-gray-400
        "
        aria-label="搜尋商品"
      />

      {/* 清除按鈕 */}
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="
            absolute right-3 top-1/2 -translate-y-1/2
            text-gray-500 hover:text-black
            transition-colors
          "
          aria-label="清除搜尋"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
