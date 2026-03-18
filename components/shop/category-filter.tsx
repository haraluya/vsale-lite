'use client'

/**
 * CategoryFilter Component
 * Feature: 002-product-management (US6 - 前台客戶瀏覽商品列表)
 *
 * 前台分類篩選器元件
 * - 顯示所有可用分類
 * - 支援「全部」選項
 * - URL 參數同步 (使用 Next.js searchParams)
 * - Neo-Brutalism 設計風格
 */

import type { Category } from '@/types'
import { useRouter, useSearchParams } from 'next/navigation'

interface CategoryFilterProps {
  categories: Category[]
}

export function CategoryFilter({ categories }: CategoryFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentCategoryId = searchParams.get('category') || ''

  const handleCategoryChange = (categoryId: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (categoryId) {
      params.set('category', categoryId)
    } else {
      params.delete('category')
    }

    router.push(`/store?${params.toString()}`)
  }

  return (
    <div className="rounded-none border-2 md:border-3 border-black bg-surface p-4 shadow-neo">
      <h3 className="mb-3 text-sm font-bold uppercase text-text-secondary">商品分類</h3>

      <div className="flex flex-wrap gap-2">
        {/* 全部按鈕 */}
        <button
          onClick={() => handleCategoryChange('')}
          className={`rounded-none border-2 border-black px-4 py-2 text-sm font-bold transition-all ${
            currentCategoryId === ''
              ? 'bg-black text-white'
              : 'bg-surface text-foreground hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
          }`}
        >
          全部
        </button>

        {/* 分類按鈕 */}
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryChange(category.id)}
            className={`rounded-none border-2 border-black px-4 py-2 text-sm font-bold transition-all ${
              currentCategoryId === category.id
                ? 'bg-black text-white'
                : 'bg-surface text-foreground hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  )
}
