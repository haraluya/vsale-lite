'use client'

/**
 * Pagination Component
 * Feature: 002-product-management (US5)
 *
 * 提供分頁導航與每頁筆數選擇功能
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  total: number
  currentPage: number
  pageSize: number
  onPageSizeChange?: (size: number) => void
}

export function Pagination({ total, currentPage, pageSize, onPageSizeChange }: PaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const totalPages = Math.ceil(total / pageSize)

  // 建立新的 URL 參數
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    return `?${params.toString()}`
  }

  const handlePageSizeChange = (newSize: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', newSize.toString())
    params.set('page', '1') // 重置到第一頁
    router.push(`?${params.toString()}`)
    onPageSizeChange?.(newSize)
  }

  // 如果總數為 0,不顯示分頁
  if (total === 0) return null

  // 計算顯示的頁碼範圍
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      // 總頁數小於等於 5,顯示所有頁碼
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // 總頁數大於 5,顯示部分頁碼
      if (currentPage <= 3) {
        // 靠近開頭
        pages.push(1, 2, 3, 4, '...', totalPages)
      } else if (currentPage >= totalPages - 2) {
        // 靠近結尾
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        // 在中間
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* 每頁筆數選擇器 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">每頁顯示:</span>
        <select
          value={pageSize}
          onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
          className="rounded-none border-2 border-black px-3 py-1 text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="20">20 筆</option>
          <option value="50">50 筆</option>
          <option value="100">100 筆</option>
        </select>

        <span className="ml-4 text-sm text-gray-600">
          共 {total} 筆,顯示第 {Math.min((currentPage - 1) * pageSize + 1, total)} -{' '}
          {Math.min(currentPage * pageSize, total)} 筆
        </span>
      </div>

      {/* 分頁導航 */}
      <div className="flex items-center gap-2">
        {/* 上一頁按鈕 */}
        <button
          onClick={() => router.push(createPageUrl(currentPage - 1))}
          disabled={currentPage === 1}
          className="rounded-none border-2 border-black bg-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          aria-label="上一頁"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* 頁碼按鈕 */}
        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                ...
              </span>
            )
          }

          const pageNumber = page as number
          const isActive = pageNumber === currentPage

          return (
            <button
              key={pageNumber}
              onClick={() => router.push(createPageUrl(pageNumber))}
              className={`min-w-[2.5rem] rounded-none border-2 border-black px-3 py-1 text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${
                isActive
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              {pageNumber}
            </button>
          )
        })}

        {/* 下一頁按鈕 */}
        <button
          onClick={() => router.push(createPageUrl(currentPage + 1))}
          disabled={currentPage === totalPages}
          className="rounded-none border-2 border-black bg-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          aria-label="下一頁"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
