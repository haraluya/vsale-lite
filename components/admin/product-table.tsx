'use client'

/**
 * Product Table Component
 * Feature: 002-product-management
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit, Trash2, Search } from 'lucide-react'
import { deleteProduct } from '@/lib/actions/products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Product, Category } from '@/types'

interface ProductTableProps {
  products: Product[]
  categories: Category[]
  total: number
  currentPage: number
  searchQuery: string
  selectedCategory: string
}

export function ProductTable({
  products,
  categories,
  total,
  currentPage,
  searchQuery,
  selectedCategory,
}: ProductTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState(searchQuery)
  const [categoryFilter, setCategoryFilter] = useState(selectedCategory)

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (categoryFilter) params.set('category', categoryFilter)
    router.push(`/admin/products?${params.toString()}`)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`確定要刪除商品「${name}」嗎?此操作無法復原。`)) {
      return
    }

    const result = await deleteProduct(id)
    if (result.success) {
      alert(result.message)
      router.refresh()
    } else {
      alert(`刪除失敗: ${result.message}`)
    }
  }

  return (
    <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
      {/* Search & Filter */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="搜尋商品編號或名稱..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <select
          className="rounded-none border-3 border-black px-4 py-2 font-bold shadow-neo-sm"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value)
            const params = new URLSearchParams()
            if (search) params.set('search', search)
            if (e.target.value) params.set('category', e.target.value)
            router.push(`/admin/products?${params.toString()}`)
          }}
        >
          <option value="">所有分類</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <Button onClick={handleSearch}>
          <Search className="mr-2 h-4 w-4" />
          搜尋
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-3 border-black">
              <th className="px-4 py-3 text-left font-bold">商品編號</th>
              <th className="px-4 py-3 text-left font-bold">商品名稱</th>
              <th className="px-4 py-3 text-left font-bold">分類</th>
              <th className="px-4 py-3 text-right font-bold">庫存</th>
              <th className="px-4 py-3 text-left font-bold">單位</th>
              <th className="px-4 py-3 text-left font-bold">狀態</th>
              <th className="px-4 py-3 text-right font-bold">操作</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {searchQuery || selectedCategory
                    ? '找不到符合條件的商品'
                    : '尚未建立任何商品'}
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{product.code}</td>
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{product.category_name}</td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${
                      product.stock < 0
                        ? 'text-orange-600'
                        : product.stock === 0
                          ? 'text-gray-500'
                          : 'text-green-600'
                    }`}
                  >
                    {product.stock}
                  </td>
                  <td className="px-4 py-3 text-sm">{product.unit}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-none border-2 border-black px-2 py-1 text-xs font-bold ${
                        product.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {product.status === 'active' ? '啟用' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/products/${product.id}/edit`}>
                        <button className="rounded-none border-2 border-black bg-blue-100 p-2 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                          <Edit className="h-4 w-4" />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        className="rounded-none border-2 border-black bg-red-100 p-2 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Info */}
      <div className="mt-4 text-sm text-gray-600">
        顯示 {products.length} 筆,共 {total} 筆商品
      </div>
    </div>
  )
}
