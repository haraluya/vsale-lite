'use client'

/**
 * Product Table Component
 * Feature: 002-product-management
 * Updated: 005-responsive-ui (響應式表格/卡片視圖)
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit, Trash2, Search, Check, X } from 'lucide-react'
import { deleteProduct, updateProductStock } from '@/lib/actions/products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/admin/pagination'
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import type { Product, Series } from '@/types'
import { useConfirm, useAlert } from '@/lib/contexts/dialog-context'
import { toast } from 'sonner'

interface ProductTableProps {
  products: Product[]
  series: Series[]  // 🔄 Feature 003: 改為系列列表
  total: number
  currentPage: number
  pageSize?: number
  searchQuery: string
  selectedSeries: string  // 🔄 Feature 003: 改為系列 ID
}

export function ProductTable({
  products,
  series,
  total,
  currentPage,
  pageSize = 20,
  searchQuery,
  selectedSeries,
}: ProductTableProps) {
  const confirm = useConfirm()
  const alert = useAlert()
  const router = useRouter()
  const [search, setSearch] = useState(searchQuery)
  const [seriesFilter, setSeriesFilter] = useState(selectedSeries)
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [stockValue, setStockValue] = useState<number>(0)

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (seriesFilter) params.set('series', seriesFilter)
    router.push(`/admin/products?${params.toString()}`)
  }

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: '確認刪除',
      description: `確定要刪除商品「${name}」嗎？此操作無法復原。`,
      variant: 'danger',
      confirmText: '刪除',
      cancelText: '取消',
    })

    if (!confirmed) {
      return
    }

    const result = await deleteProduct(id)
    if (result.success) {
      toast.success(result.message || '刪除成功')
      router.refresh()
    } else {
      await alert({
        title: '刪除失敗',
        message: result.message || '無法刪除商品',
        variant: 'error',
      })
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
      toast.success('庫存已更新')
      router.refresh()
    } else {
      await alert({
        title: '更新失敗',
        message: result.message || '無法更新庫存',
        variant: 'error',
      })
    }
  }

  const handleCancelEditStock = () => {
    setEditingStockId(null)
  }

  return (
    <div className={cn(
      "rounded-none bg-white",
      designTokens.neoBrutalism.border.full,
      designTokens.neoBrutalism.shadow.full,
      designTokens.spacing.card.padding,
      designTokens.spacing.page.gap
    )}>
      {/* Search & Filter */}
      <div className="flex flex-col gap-3 md:flex-row md:gap-4">
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
            "rounded-none border-2 border-black bg-white font-bold",
            designTokens.input.base,
            designTokens.neoBrutalism.shadow.mobile
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
          <Search className="mr-2 h-4 w-4" />
          搜尋
        </Button>
      </div>

      {/* 桌面版: 完整表格 */}
      <div className="hidden lg:block overflow-x-auto">
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
                  {searchQuery || selectedSeries
                    ? '找不到符合條件的商品'
                    : '尚未建立任何商品'}
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{product.code}</td>
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{product.series_name}</td>
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
                          className="rounded-none border-2 border-black bg-green-100 p-1 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
                          title="儲存"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleCancelEditStock}
                          className="rounded-none border-2 border-black bg-gray-100 p-1 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
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

      {/* 手機版: 卡片視圖 */}
      <div className="lg:hidden space-y-3 md:space-y-4">
        {products.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery || selectedSeries
              ? '找不到符合條件的商品'
              : '尚未建立任何商品'}
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className={cn(
                "rounded-none bg-gray-50",
                "border-2 border-black",
                "shadow-neo-sm",
                designTokens.spacing.card.padding,
                designTokens.spacing.card.gap
              )}
            >
              {/* 商品編號與狀態 */}
              <div className="flex items-start justify-between gap-3">
                <div className={cn("font-mono text-gray-600", designTokens.typography.caption)}>
                  {product.code}
                </div>
                <span
                  className={`rounded-none border-2 border-black px-2 py-1 text-xs font-bold whitespace-nowrap ${
                    product.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {product.status === 'active' ? '啟用' : '停用'}
                </span>
              </div>

              {/* 商品名稱與分類 */}
              <div className={designTokens.spacing.card.gap}>
                <div className={cn("font-bold", designTokens.typography.body.base)}>
                  {product.name}
                </div>
                <div className={cn("text-gray-600", designTokens.typography.caption)}>
                  {product.series_name}
                </div>
              </div>

              {/* 庫存資訊 */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-300">
                <span className={cn("text-gray-600", designTokens.typography.caption)}>
                  庫存
                </span>
                {editingStockId === product.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={stockValue}
                      onChange={(e) => setStockValue(parseInt(e.target.value) || 0)}
                      className="w-20 rounded-none border-2 border-black px-2 py-1 text-right font-mono text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveStock(product.id)}
                      className="rounded-none border-2 border-black bg-green-100 p-1.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleCancelEditStock}
                      className="rounded-none border-2 border-black bg-gray-100 p-1.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEditStock(product.id, product.stock)}
                    className={cn(
                      "font-mono font-bold",
                      designTokens.typography.body.base,
                      product.stock < 0
                        ? 'text-orange-600'
                        : product.stock === 0
                          ? 'text-gray-500'
                          : 'text-green-600'
                    )}
                  >
                    {product.stock} {product.unit}
                  </button>
                )}
              </div>

              {/* 操作按鈕 */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link href={`/admin/products/${product.id}/edit`}>
                  <button className="w-full rounded-none border-2 border-black bg-blue-100 px-3 py-2 text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                    <Edit className="inline h-3 w-3 mr-1" />
                    編輯
                  </button>
                </Link>
                <button
                  onClick={() => handleDelete(product.id, product.name)}
                  className="w-full rounded-none border-2 border-black bg-red-100 px-3 py-2 text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  <Trash2 className="inline h-3 w-3 mr-1" />
                  刪除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="mt-6">
          <Pagination total={total} currentPage={currentPage} pageSize={pageSize} />
        </div>
      )}
    </div>
  )
}
