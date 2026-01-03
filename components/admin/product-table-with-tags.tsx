'use client'

/**
 * Product Table with Batch Tag Management
 * Feature: 006-ux-enhancement (US9 - T069, T071)
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit, Trash2, Search, Check, X, Tags } from 'lucide-react'
import { deleteProduct, updateProductStock } from '@/lib/actions/products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/admin/pagination'
import { BatchTagManager } from '@/components/admin/batch-tag-manager'
import { TagBadgeList } from '@/components/ui/tag-badge'
import type { Product, Series } from '@/types'

interface ProductTableWithTagsProps {
  products: Product[]
  series: Series[]
  total: number
  currentPage: number
  pageSize?: number
  searchQuery: string
  selectedSeries: string
}

export function ProductTableWithTags({
  products,
  series,
  total,
  currentPage,
  pageSize = 20,
  searchQuery,
  selectedSeries,
}: ProductTableWithTagsProps) {
  const router = useRouter()
  const [search, setSearch] = useState(searchQuery)
  const [seriesFilter, setSeriesFilter] = useState(selectedSeries)
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [stockValue, setStockValue] = useState<number>(0)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [showBatchTags, setShowBatchTags] = useState(false)

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (seriesFilter) params.set('series', seriesFilter)
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

  const handleEditStock = (productId: string, currentStock: number) => {
    setEditingStockId(productId)
    setStockValue(currentStock)
  }

  const handleSaveStock = async (productId: string) => {
    const result = await updateProductStock(productId, stockValue)
    if (result.success) {
      setEditingStockId(null)
      router.refresh()
    } else {
      alert(`更新失敗: ${result.message}`)
    }
  }

  const handleCancelEditStock = () => {
    setEditingStockId(null)
  }

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const toggleAllSelection = () => {
    if (selectedProductIds.length === products.length) {
      setSelectedProductIds([])
    } else {
      setSelectedProductIds(products.map(p => p.id))
    }
  }

  return (
    <div className="space-y-6">
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
            value={seriesFilter}
            onChange={(e) => {
              setSeriesFilter(e.target.value)
              const params = new URLSearchParams()
              if (search) params.set('search', search)
              if (e.target.value) params.set('series', e.target.value)
              router.push(`/admin/products?${params.toString()}`)
            }}
          >
            <option value="">所有系列</option>
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <Button onClick={handleSearch}>
            <Search className="mr-2 h-4 w-4" />
            搜尋
          </Button>
        </div>

        {/* Batch Actions */}
        {selectedProductIds.length > 0 && (
          <div className="mb-4 rounded-none border-2 border-blue-500 bg-blue-50 p-4">
            <div className="flex items-center justify-between">
              <p className="font-bold">
                已選擇 {selectedProductIds.length} 個商品
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBatchTags(!showBatchTags)}
                  className="rounded-none border-2 border-black bg-yellow-400 px-4 py-2 font-bold shadow-neo transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                >
                  <Tags className="mr-2 inline-block h-4 w-4" />
                  {showBatchTags ? '隱藏' : '顯示'}批次標籤管理
                </button>
                <button
                  onClick={() => setSelectedProductIds([])}
                  className="rounded-none border-2 border-black bg-gray-200 px-4 py-2 font-bold shadow-neo transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                >
                  取消選擇
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-3 border-black">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.length === products.length && products.length > 0}
                    onChange={toggleAllSelection}
                    className="h-4 w-4 rounded border-2 border-black"
                  />
                </th>
                <th className="px-4 py-3 text-left font-bold">商品編號</th>
                <th className="px-4 py-3 text-left font-bold">商品名稱</th>
                <th className="px-4 py-3 text-left font-bold">系列</th>
                <th className="px-4 py-3 text-left font-bold">標籤</th>
                <th className="px-4 py-3 text-right font-bold">庫存</th>
                <th className="px-4 py-3 text-left font-bold">狀態</th>
                <th className="px-4 py-3 text-right font-bold">操作</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery || selectedSeries
                      ? '找不到符合條件的商品'
                      : '尚未建立任何商品'}
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                        className="h-4 w-4 rounded border-2 border-black"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{product.code}</td>
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{product.series_name}</td>
                    <td className="px-4 py-3">
                      {product.tags && product.tags.length > 0 ? (
                        <TagBadgeList tags={product.tags} maxTags={2} size="sm" />
                      ) : (
                        <span className="text-xs text-gray-400">無標籤</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingStockId === product.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            value={stockValue}
                            onChange={(e) => setStockValue(parseInt(e.target.value) || 0)}
                            className="w-20 rounded-none border-2 border-black px-2 py-1 text-right font-mono text-sm"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveStock(product.id)}
                            className="rounded-none border-2 border-black bg-green-100 p-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                            title="儲存"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleCancelEditStock}
                            className="rounded-none border-2 border-black bg-gray-100 p-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                            title="取消"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditStock(product.id, product.stock)}
                          className={`font-mono hover:underline ${
                            product.stock < 0
                              ? 'text-orange-600'
                              : product.stock === 0
                                ? 'text-gray-500'
                                : 'text-green-600'
                          }`}
                          title="點擊快速編輯庫存"
                        >
                          {product.stock}
                        </button>
                      )}
                    </td>
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
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="rounded-none border-2 border-black bg-blue-100 p-2 shadow-neo-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                          title="編輯"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="rounded-none border-2 border-black bg-red-100 p-2 shadow-neo-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                          title="刪除"
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

        {/* Pagination */}
        <div className="mt-6">
          <Pagination
            total={total}
            currentPage={currentPage}
            pageSize={pageSize}
          />
        </div>
      </div>

      {/* Batch Tag Manager */}
      {showBatchTags && selectedProductIds.length > 0 && (
        <BatchTagManager
          selectedProductIds={selectedProductIds}
          onComplete={() => {
            setShowBatchTags(false)
            setSelectedProductIds([])
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
