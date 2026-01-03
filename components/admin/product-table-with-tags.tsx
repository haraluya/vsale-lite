'use client'

/**
 * Product Table with Batch Tag Management
 * Feature: 006-ux-enhancement (US9 - T069, T071)
 * Feature: 005-responsive-ui (Phase 3.2 - T013-T014)
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
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
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
    <div className={designTokens.spacing.page.gap}>
      <div className={cn("card-neo", designTokens.spacing.card.padding)}>
        {/* Search & Filter */}
        <div className="mb-4 md:mb-6 flex flex-col gap-3 md:flex-row md:gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜尋商品編號或名稱..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <select
            className={cn(
              "rounded-none border-2 md:border-3 border-black font-bold",
              "px-3 py-2 md:px-4 md:py-2",
              designTokens.neoBrutalism.shadow.mobile,
              designTokens.typography.body.base
            )}
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
            <Search className="mr-2 h-4 w-4 md:h-5 md:w-5" />
            搜尋
          </Button>
        </div>

        {/* Batch Actions */}
        {selectedProductIds.length > 0 && (
          <div className={cn(
            "mb-4 rounded-none border-2 border-blue-500 bg-blue-50",
            designTokens.spacing.card.padding
          )}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className={cn(designTokens.typography.body.base, "font-bold")}>
                已選擇 {selectedProductIds.length} 個商品
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBatchTags(!showBatchTags)}
                  className={cn(
                    "flex-1 md:flex-none inline-flex items-center justify-center gap-2 rounded-none bg-yellow-400 font-bold",
                    designTokens.neoBrutalism.border.full,
                    designTokens.neoBrutalism.shadow.mobile,
                    designTokens.neoBrutalism.hover,
                    designTokens.button.md
                  )}
                >
                  <Tags className="h-4 w-4" />
                  {showBatchTags ? '隱藏' : '顯示'}批次標籤管理
                </button>
                <button
                  onClick={() => setSelectedProductIds([])}
                  className={cn(
                    "flex-1 md:flex-none rounded-none bg-gray-200 font-bold",
                    designTokens.neoBrutalism.border.full,
                    designTokens.neoBrutalism.shadow.mobile,
                    designTokens.neoBrutalism.hover,
                    designTokens.button.md
                  )}
                >
                  取消選擇
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 桌面版: 完整表格 */}
        <div className="hidden lg:block overflow-x-auto">
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
                <th className={cn("px-4 py-3 text-left font-bold", designTokens.typography.body.base)}>商品編號</th>
                <th className={cn("px-4 py-3 text-left font-bold", designTokens.typography.body.base)}>商品名稱</th>
                <th className={cn("px-4 py-3 text-left font-bold", designTokens.typography.body.base)}>系列</th>
                <th className={cn("px-4 py-3 text-left font-bold", designTokens.typography.body.base)}>標籤</th>
                <th className={cn("px-4 py-3 text-right font-bold", designTokens.typography.body.base)}>庫存</th>
                <th className={cn("px-4 py-3 text-left font-bold", designTokens.typography.body.base)}>狀態</th>
                <th className={cn("px-4 py-3 text-right font-bold", designTokens.typography.body.base)}>操作</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={8} className={cn("px-4 py-8 text-center text-gray-500", designTokens.typography.body.base)}>
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
                    <td className={cn("px-4 py-3 font-mono", designTokens.typography.caption)}>{product.code}</td>
                    <td className={cn("px-4 py-3 font-medium", designTokens.typography.body.base)}>{product.name}</td>
                    <td className={cn("px-4 py-3 text-gray-600", designTokens.typography.caption)}>{product.series_name}</td>
                    <td className="px-4 py-3">
                      {product.tags && product.tags.length > 0 ? (
                        <TagBadgeList tags={product.tags} maxTags={2} size="sm" />
                      ) : (
                        <span className={cn("text-gray-400", designTokens.typography.caption)}>無標籤</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingStockId === product.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            value={stockValue}
                            onChange={(e) => setStockValue(parseInt(e.target.value) || 0)}
                            className={cn(
                              "w-20 rounded-none border-2 border-black px-2 py-1 text-right font-mono",
                              designTokens.typography.caption
                            )}
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
                          className={cn(
                            "font-mono hover:underline",
                            designTokens.typography.caption,
                            product.stock < 0
                              ? 'text-orange-600'
                              : product.stock === 0
                                ? 'text-gray-500'
                                : 'text-green-600'
                          )}
                          title="點擊快速編輯庫存"
                        >
                          {product.stock}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-none border-2 border-black px-2 py-1 font-bold",
                          designTokens.typography.caption,
                          product.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        )}
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

        {/* 手機版: 卡片視圖 */}
        <div className="lg:hidden space-y-3 md:space-y-4">
          {products.length === 0 ? (
            <div className={cn("text-center py-8 text-gray-500", designTokens.typography.body.base)}>
              {searchQuery || selectedSeries
                ? '找不到符合條件的商品'
                : '尚未建立任何商品'}
            </div>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className={cn(
                  "rounded-none bg-white",
                  getNeoBrutalismClasses(),
                  designTokens.spacing.card.padding
                )}
              >
                {/* 選擇框與商品編號 */}
                <div className="flex items-start gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(product.id)}
                    onChange={() => toggleProductSelection(product.id)}
                    className="mt-1 h-5 w-5 min-w-[44px] min-h-[44px] rounded border-2 border-black"
                  />
                  <div className="flex-1">
                    <div className={cn("font-mono text-gray-600 mb-1", designTokens.typography.caption)}>
                      {product.code}
                    </div>
                    <h3 className={cn(designTokens.typography.h3, "mb-1")}>{product.name}</h3>
                  </div>
                </div>

                {/* 系列與狀態 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn("text-gray-600", designTokens.typography.caption)}>
                    系列: {product.series_name}
                  </span>
                  <span
                    className={cn(
                      "rounded-none border-2 border-black px-2 py-1 font-bold",
                      designTokens.typography.caption,
                      product.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    )}
                  >
                    {product.status === 'active' ? '啟用' : '停用'}
                  </span>
                </div>

                {/* 標籤 */}
                <div className="mb-3">
                  {product.tags && product.tags.length > 0 ? (
                    <TagBadgeList tags={product.tags} maxTags={3} size="sm" />
                  ) : (
                    <span className={cn("text-gray-400 italic", designTokens.typography.caption)}>無標籤</span>
                  )}
                </div>

                {/* 庫存編輯 */}
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <div className={cn("text-gray-600 mb-2", designTokens.typography.caption)}>庫存數量:</div>
                  {editingStockId === product.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={stockValue}
                        onChange={(e) => setStockValue(parseInt(e.target.value) || 0)}
                        className={cn(
                          "flex-1 rounded-none border-2 border-black px-3 py-2 text-right font-mono",
                          designTokens.typography.body.base
                        )}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveStock(product.id)}
                        className={cn(
                          "min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-none border-2 border-black bg-green-100",
                          designTokens.neoBrutalism.shadow.mobile,
                          designTokens.neoBrutalism.hover
                        )}
                        title="儲存"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleCancelEditStock}
                        className={cn(
                          "min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-none border-2 border-black bg-gray-100",
                          designTokens.neoBrutalism.shadow.mobile,
                          designTokens.neoBrutalism.hover
                        )}
                        title="取消"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEditStock(product.id, product.stock)}
                      className={cn(
                        "w-full text-left font-mono font-bold py-2 px-3 rounded-none border-2 border-black hover:bg-gray-50",
                        designTokens.typography.body.base,
                        product.stock < 0
                          ? 'text-orange-600 bg-orange-50'
                          : product.stock === 0
                            ? 'text-gray-500 bg-gray-50'
                            : 'text-green-600 bg-green-50'
                      )}
                    >
                      {product.stock} (點擊編輯)
                    </button>
                  )}
                </div>

                {/* 操作按鈕 */}
                <div className="flex gap-2">
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-2 bg-blue-100 font-bold transition-all",
                      getNeoBrutalismClasses({ active: true }),
                      designTokens.button.md
                    )}
                  >
                    <Edit className="h-4 w-4" />
                    編輯
                  </Link>
                  <button
                    onClick={() => handleDelete(product.id, product.name)}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-2 bg-red-100 font-bold transition-all",
                      getNeoBrutalismClasses({ active: true }),
                      designTokens.button.md
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                    刪除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4 md:mt-6">
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

      {/* 提示訊息 */}
      <div className={cn(
        "card-neo bg-blue-50 border-blue-500",
        designTokens.spacing.card.padding
      )}>
        <p className={cn("text-gray-700", designTokens.typography.caption)}>
          <strong>提示：</strong>
          <span className="hidden lg:inline">勾選商品後可使用批次標籤管理功能,點擊庫存數字可快速編輯</span>
          <span className="lg:hidden">勾選商品後可使用批次標籤管理,點擊庫存卡片可編輯</span>
        </p>
      </div>
    </div>
  )
}
