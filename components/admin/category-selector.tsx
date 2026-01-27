/**
 * CategorySelector Component
 * Feature: 價格管理優化 - 分類選擇器
 *
 * 分類選擇器 (用於價格管理頁面)
 * - 依 sort_order 排序分類
 * - 使用 URL 參數控制: ?category_id=xxx
 */

'use client'

import type { Category } from '@/types'

interface CategorySelectorProps {
  categories: Category[]
  selectedCategoryId?: string
}

export function CategorySelector({ categories, selectedCategoryId }: CategorySelectorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value
    if (categoryId) {
      window.location.href = `/admin/pricing?category_id=${categoryId}`
    } else {
      window.location.href = '/admin/pricing'
    }
  }

  return (
    <div className="rounded-none border-2 md:border-3 border-black bg-white p-6 shadow-neo">
      <div className="mb-4">
        <h2 className="text-xl font-bold">選擇分類 (批量設定)</h2>
        <p className="mt-1 text-sm text-gray-600">選擇分類後可批量設定該分類所有商品的價格</p>
      </div>

      <select
        value={selectedCategoryId || ''}
        onChange={handleChange}
        className="w-full rounded-none border-2 md:border-3 border-black bg-white px-4 py-3 font-bold shadow-neo-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none focus:outline-none focus:ring-2 focus:ring-black"
      >
        <option value="">請選擇分類...</option>
        {categories
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((category) => (
            <option key={category.id} value={category.id}>
              {category.name} ({category.code})
            </option>
          ))}
      </select>

      {categories.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">目前沒有可用的分類</p>
      )}
    </div>
  )
}
