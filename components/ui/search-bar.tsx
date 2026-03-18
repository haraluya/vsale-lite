'use client'

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

  useEffect(() => {
    const cleanup = debouncedSearch(query)
    return cleanup
  }, [query, debouncedSearch])

  const handleClear = () => {
    setQuery('')
  }

  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
        {isSearching ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Search className="h-5 w-5" />
        )}
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pl-10 pr-10 py-3
          border-theme rounded-theme-sm
          bg-surface
          shadow-neo-sm
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
          transition-all duration-200
          text-base
          placeholder:text-muted
        "
        aria-label="搜尋商品"
      />

      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="
            absolute right-3 top-1/2 -translate-y-1/2
            text-muted hover:text-foreground
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
