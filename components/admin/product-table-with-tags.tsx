'use client'

/**
 * Product Table with Batch Tag Management
 * Feature: 006-ux-enhancement (US9 - T069, T071)
 * Feature: 005-responsive-ui (Phase 3.2 - T013-T014)
 * Feature: 013-unified-dialog (T030)
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit, Trash2, Search, Check, X, Tags, Save } from 'lucide-react'
import { deleteProduct, updateProductStock, batchUpdateProducts } from '@/lib/actions/products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/admin/pagination'
import { BatchTagManager } from '@/components/admin/batch-tag-manager'
import { SortableTableHeader } from '@/components/admin/products/sortable-table-header'
import { ProductNameWithSeries } from '@/components/admin/products/product-name-with-series'
import { ProductThumbnail } from '@/components/admin/products/product-thumbnail'
import { ProductTagsEditor } from '@/components/admin/products/ProductTagsEditor'
import { ProductStatusToggle } from '@/components/admin/product-status-toggle'
import { ProductStockStatusToggle } from '@/components/admin/product-stock-status-toggle'
import { TagBadgeList } from '@/components/ui/tag-badge'
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import type { Product, Series } from '@/types'
import { useConfirm, useAlert } from '@/lib/contexts/dialog-context'

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
  const confirm = useConfirm()
  const alert = useAlert()
  const [search, setSearch] = useState(searchQuery)
  const [seriesFilter, setSeriesFilter] = useState(selectedSeries)
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [stockValue, setStockValue] = useState<number>(0)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [showBatchTags, setShowBatchTags] = useState(false)

  // Feature 016: 批次編輯狀態
  const [batchEditMode, setBatchEditMode] = useState(false)
  const [editedProducts, setEditedProducts] = useState<Record<string, {
    name?: string
    stock?: number
    retail_price?: number | null
    unit?: string
  }>>({})

  // 批次帶入狀態
  const [quickFillValues, setQuickFillValues] = useState({
    namePrefix: '',
    retail_price: '',
    unit: ''
  })

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (seriesFilter) params.set('series', seriesFilter)
    router.push(`/admin/products?${params.toString()}`)
  }

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: '刪除商品',
      description: `確定要刪除商品「${name}」嗎？此操作無法復原。`,
      variant: 'danger'
    })

    if (!confirmed) return

    const result = await deleteProduct(id)
    if (result.success) {
      await alert({
        title: '刪除成功',
        message: result.message || '商品已成功刪除',
        variant: 'success'
      })
      router.refresh()
    } else {
      await alert({
        title: '刪除失敗',
        message: result.message || '刪除商品失敗',
        variant: 'error'
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
      router.refresh()
    } else {
      await alert({
        title: '更新失敗',
        message: result.message,
        variant: 'error'
      })
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

  // Feature 016: 批次編輯處理函數
  const handleEnterBatchEdit = () => {
    // 初始化編輯狀態,使用當前商品的值
    const initialEditState: Record<string, {
      name?: string
      stock?: number
      retail_price?: number | null
      unit?: string
    }> = {}

    selectedProductIds.forEach(productId => {
      const product = products.find(p => p.id === productId)
      if (product) {
        initialEditState[productId] = {
          name: product.name,
          stock: product.stock,
          retail_price: product.retail_price,
          unit: product.unit
        }
      }
    })

    setEditedProducts(initialEditState)
    setBatchEditMode(true)
    setShowBatchTags(false) // 進入編輯模式時隱藏標籤管理
  }

  const handleUpdateEditedProduct = (
    productId: string,
    field: 'name' | 'stock' | 'retail_price' | 'unit',
    value: string | number | null
  ) => {
    setEditedProducts(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }))
  }

  const handleSaveBatchEdit = async () => {
    const confirmed = await confirm({
      title: '確認批次編輯',
      description: `確定要更新 ${selectedProductIds.length} 個商品嗎？`,
      variant: 'info'
    })

    if (!confirmed) return

    // 準備批次更新資料
    const productsToUpdate = selectedProductIds.map(productId => {
      const edited = editedProducts[productId]
      return {
        id: productId,
        name: edited?.name,
        stock: edited?.stock,
        retail_price: edited?.retail_price,
        unit: edited?.unit
      }
    })

    const result = await batchUpdateProducts({ products: productsToUpdate })

    if (result.success) {
      await alert({
        title: '批次編輯成功',
        message: result.message || `成功更新 ${result.data?.updated_count || 0} 個商品`,
        variant: 'success'
      })
      setBatchEditMode(false)
      setEditedProducts({})
      setSelectedProductIds([])
      router.refresh()
    } else {
      await alert({
        title: '批次編輯失敗',
        message: result.message || '批次編輯失敗',
        variant: 'error'
      })
    }
  }

  const handleCancelBatchEdit = async () => {
    const confirmed = await confirm({
      title: '取消批次編輯',
      description: '確定要放棄所有編輯內容嗎？',
      variant: 'warning'
    })

    if (!confirmed) return

    setBatchEditMode(false)
    setEditedProducts({})
  }

  // 批次帶入處理函數
  const handleQuickFillNamePrefix = () => {
    if (!quickFillValues.namePrefix || quickFillValues.namePrefix.trim() === '') return

    setEditedProducts(prev => {
      const updated = { ...prev }
      selectedProductIds.forEach(productId => {
        const product = products.find(p => p.id === productId)
        if (product && updated[productId]) {
          updated[productId] = {
            ...updated[productId],
            name: quickFillValues.namePrefix + (updated[productId].name || product.name)
          }
        }
      })
      return updated
    })

    // 清空輸入框
    setQuickFillValues(prev => ({ ...prev, namePrefix: '' }))
  }

  const handleQuickFillRetailPrice = () => {
    const price = quickFillValues.retail_price
    if (!price || price === '') return

    const numValue = parseFloat(price)
    if (isNaN(numValue) || numValue < 0) return

    setEditedProducts(prev => {
      const updated = { ...prev }
      selectedProductIds.forEach(productId => {
        if (updated[productId]) {
          updated[productId] = {
            ...updated[productId],
            retail_price: numValue
          }
        }
      })
      return updated
    })

    // 清空輸入框
    setQuickFillValues(prev => ({ ...prev, retail_price: '' }))
  }

  const handleQuickFillUnit = () => {
    if (!quickFillValues.unit || quickFillValues.unit.trim() === '') return

    setEditedProducts(prev => {
      const updated = { ...prev }
      selectedProductIds.forEach(productId => {
        if (updated[productId]) {
          updated[productId] = {
            ...updated[productId],
            unit: quickFillValues.unit
          }
        }
      })
      return updated
    })

    // 清空輸入框
    setQuickFillValues(prev => ({ ...prev, unit: '' }))
  }

  return (
    <div className={designTokens.spacing.page.gap}>
      <div className={cn("card-neo", designTokens.spacing.card.padding)}>
        {/* Batch Actions */}
        {selectedProductIds.length > 0 && (
          <div className={cn(
            "mb-4 rounded-none border-2 border-blue-500 bg-blue-50",
            designTokens.spacing.card.padding
          )}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className={cn(designTokens.typography.body.base, "font-bold")}>
                已選擇 {selectedProductIds.length} 個商品
                {batchEditMode && <span className="ml-2 text-orange-600">(批次編輯模式)</span>}
              </p>
              <div className="flex gap-2">
                {!batchEditMode ? (
                  <>
                    <button
                      onClick={handleEnterBatchEdit}
                      className={cn(
                        "flex-1 md:flex-none inline-flex items-center justify-center gap-2 rounded-none bg-green-400 font-bold",
                        designTokens.neoBrutalism.border.full,
                        designTokens.neoBrutalism.shadow.mobile,
                        designTokens.neoBrutalism.hover,
                        designTokens.button.md
                      )}
                    >
                      <Edit className="h-4 w-4" />
                      進入批次編輯
                    </button>
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
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleSaveBatchEdit}
                      className={cn(
                        "flex-1 md:flex-none inline-flex items-center justify-center gap-2 rounded-none bg-green-400 font-bold",
                        designTokens.neoBrutalism.border.full,
                        designTokens.neoBrutalism.shadow.mobile,
                        designTokens.neoBrutalism.hover,
                        designTokens.button.md
                      )}
                    >
                      <Save className="h-4 w-4" />
                      保存所有修改
                    </button>
                    <button
                      onClick={handleCancelBatchEdit}
                      className={cn(
                        "flex-1 md:flex-none rounded-none bg-gray-200 font-bold",
                        designTokens.neoBrutalism.border.full,
                        designTokens.neoBrutalism.shadow.mobile,
                        designTokens.neoBrutalism.hover,
                        designTokens.button.md
                      )}
                    >
                      取消編輯
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 桌面版: 完整表格 */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 md:border-b-3 border-black">
                {/* 勾選框 */}
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.length === products.length && products.length > 0}
                    onChange={toggleAllSelection}
                    className="h-5 w-5 rounded border-2 border-black"
                  />
                </th>
                {/* 縮圖 */}
                {!batchEditMode && <th className={cn("px-4 py-3 text-left font-bold", designTokens.typography.body.base)}>圖示</th>}
                {/* 商品名稱 / 系列 */}
                <th className={cn("px-4 py-3 text-left font-bold", designTokens.typography.body.large)}>
                  <div className="mb-2">商品名稱 / 系列</div>
                  {batchEditMode && (
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="text"
                        value={quickFillValues.namePrefix}
                        onChange={(e) => setQuickFillValues(prev => ({ ...prev, namePrefix: e.target.value }))}
                        placeholder="前方插入文字"
                        className="w-32 rounded-none border border-gray-400 px-1.5 py-0.5 text-xs focus:border-blue-500 focus:outline-none font-normal"
                      />
                      <button
                        type="button"
                        onClick={handleQuickFillNamePrefix}
                        className="rounded-none border border-black bg-blue-400 px-2 py-0.5 text-xs font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-none whitespace-nowrap"
                      >
                        帶入
                      </button>
                    </div>
                  )}
                </th>
                {/* 商品編號 */}
                <th className="px-4 py-3 text-left">
                  <SortableTableHeader label="商品編號" sortKey="code" />
                </th>
                {/* 零售價格 */}
                <th className={cn("px-4 py-3 text-right font-bold", designTokens.typography.body.base)}>
                  <div className="mb-2">零售價格</div>
                  {batchEditMode && (
                    <div className="flex items-center gap-1 mt-1 justify-end">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={quickFillValues.retail_price}
                        onChange={(e) => setQuickFillValues(prev => ({ ...prev, retail_price: e.target.value }))}
                        placeholder="金額"
                        className="w-20 rounded-none border border-gray-400 px-1.5 py-0.5 text-xs focus:border-blue-500 focus:outline-none font-normal [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={handleQuickFillRetailPrice}
                        className="rounded-none border border-black bg-green-400 px-2 py-0.5 text-xs font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-none whitespace-nowrap"
                      >
                        帶入
                      </button>
                    </div>
                  )}
                </th>
                {/* 標籤 */}
                {!batchEditMode && <th className={cn("px-4 py-3 text-left font-bold", designTokens.typography.body.base)}>標籤</th>}
                {/* 庫存 */}
                <th className={cn("px-4 py-3 text-right font-bold", designTokens.typography.body.base)}>
                  庫存
                </th>
                {/* 庫存狀態 */}
                {!batchEditMode && <th className={cn("px-4 py-3 text-left font-bold", designTokens.typography.body.base)}>庫存狀態</th>}
                {/* 單位（批次編輯模式） */}
                {batchEditMode && (
                  <th className={cn("px-4 py-3 text-left font-bold", designTokens.typography.body.base)}>
                    <div className="mb-2">單位</div>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="text"
                        value={quickFillValues.unit}
                        onChange={(e) => setQuickFillValues(prev => ({ ...prev, unit: e.target.value }))}
                        placeholder="單位"
                        className="w-16 rounded-none border border-gray-400 px-1.5 py-0.5 text-xs focus:border-blue-500 focus:outline-none font-normal"
                      />
                      <button
                        type="button"
                        onClick={handleQuickFillUnit}
                        className="rounded-none border border-black bg-green-400 px-2 py-0.5 text-xs font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-none whitespace-nowrap"
                      >
                        帶入
                      </button>
                    </div>
                  </th>
                )}
                {/* 上架 */}
                {!batchEditMode && <th className={cn("px-4 py-3 text-left font-bold", designTokens.typography.body.base)}>上架</th>}
                {/* 操作 */}
                {!batchEditMode && <th className={cn("px-4 py-3 text-right font-bold", designTokens.typography.body.base)}>操作</th>}
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
                products.map((product) => {
                  const isSelected = selectedProductIds.includes(product.id)
                  const isInBatchEdit = batchEditMode && isSelected
                  const editedData = editedProducts[product.id]

                  return (
                    <tr key={product.id} className={cn(
                      "border-b border-gray-200",
                      isInBatchEdit ? "bg-green-50" : "hover:bg-gray-50"
                    )}>
                      {/* 勾選框 */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => !batchEditMode && toggleProductSelection(product.id)}
                          disabled={batchEditMode}
                          className="h-5 w-5 rounded border-2 border-black disabled:opacity-50"
                        />
                      </td>

                      {/* 縮圖 - 僅在非批次編輯模式顯示 */}
                      {!batchEditMode && (
                        <td className="px-4 py-3">
                          <ProductThumbnail
                            productId={product.id}
                            imageUrl={product.image_url}
                            productName={product.name}
                            onUploadSuccess={() => router.refresh()}
                          />
                        </td>
                      )}

                      {/* 商品名稱 / 系列 - 批次編輯模式下可編輯 */}
                      <td className={cn("px-4 py-3", designTokens.typography.body.large)}>
                        {isInBatchEdit ? (
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              value={editedData?.name || ''}
                              onChange={(e) => handleUpdateEditedProduct(product.id, 'name', e.target.value)}
                              className={cn(
                                "w-full rounded-none border-2 border-black px-2 py-1 font-medium",
                                designTokens.typography.body.base
                              )}
                              placeholder="商品名稱"
                            />
                            <span className={cn("text-xs text-gray-500")}>
                              系列：{product.series_name}
                            </span>
                          </div>
                        ) : (
                          <ProductNameWithSeries
                            productName={product.name}
                            seriesName={product.series_name || '未知系列'}
                            seriesColor={product.series_color || '#94A3B8'}
                          />
                        )}
                      </td>

                      {/* 商品編號 */}
                      <td className={cn("px-4 py-3 font-mono", designTokens.typography.caption)}>{product.code}</td>

                      {/* 零售價格 */}
                      <td className="px-4 py-3 text-right">
                        {isInBatchEdit ? (
                          <input
                            type="number"
                            step="1"
                            value={editedData?.retail_price ?? ''}
                            onChange={(e) => handleUpdateEditedProduct(product.id, 'retail_price', e.target.value ? parseFloat(e.target.value) : null)}
                            className="w-24 rounded-none border-2 border-black px-2 py-1 text-right font-mono text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        ) : (
                          <span className={cn("font-mono font-bold text-base text-brand-primary")}>
                            {product.retail_price !== null ? `$${Math.round(product.retail_price)}` : 'N/A'}
                          </span>
                        )}
                      </td>

                      {/* 標籤編輯器 - 僅在非批次編輯模式顯示 */}
                      {!batchEditMode && (
                        <td className="px-4 py-3">
                          <ProductTagsEditor
                            productId={product.id}
                            currentTags={product.tags || []}
                            onUpdateSuccess={() => router.refresh()}
                          />
                        </td>
                      )}

                      {/* 庫存 - 批次編輯模式下可編輯 */}
                      <td className="px-4 py-3 text-right">
                        {isInBatchEdit ? (
                          <input
                            type="number"
                            value={editedData?.stock ?? 0}
                            onChange={(e) => handleUpdateEditedProduct(product.id, 'stock', parseInt(e.target.value) || 0)}
                            className="w-24 rounded-none border-2 border-black px-2 py-1 text-right font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        ) : editingStockId === product.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              value={stockValue}
                              onChange={(e) => setStockValue(parseInt(e.target.value) || 0)}
                              className={cn(
                                "w-20 rounded-none border-2 border-black px-2 py-1 text-right font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
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
                            disabled={batchEditMode}
                            className={cn(
                              "font-mono hover:underline disabled:opacity-50 disabled:cursor-not-allowed",
                              designTokens.typography.caption,
                              product.stock < 0
                                ? 'text-orange-600'
                                : product.stock === 0
                                  ? 'text-gray-500'
                                  : 'text-green-600'
                            )}
                            title={batchEditMode ? "批次編輯模式下無法快速編輯" : "點擊快速編輯庫存"}
                          >
                            {product.stock}
                          </button>
                        )}
                      </td>

                      {/* 庫存狀態（快速切換開關 - 樂觀更新）- 僅在非批次編輯模式顯示 */}
                      {!batchEditMode && (
                        <td className="px-4 py-3">
                          <ProductStockStatusToggle
                            productId={product.id}
                            initialStockStatus={product.stock_status as 'sufficient' | 'low' | 'out_of_stock'}
                            productName={product.name}
                            onStatusChanged={() => router.refresh()}
                          />
                        </td>
                      )}

                      {/* 單位 - 僅在批次編輯模式顯示 */}
                      {batchEditMode && (
                        <td className="px-4 py-3">
                          {isInBatchEdit ? (
                            <input
                              type="text"
                              value={editedData?.unit || ''}
                              onChange={(e) => handleUpdateEditedProduct(product.id, 'unit', e.target.value)}
                              className="w-20 rounded-none border-2 border-black px-2 py-1"
                            />
                          ) : (
                            <span className={cn("text-gray-600", designTokens.typography.caption)}>
                              {product.unit}
                            </span>
                          )}
                        </td>
                      )}

                      {/* 狀態（快速切換開關 - 樂觀更新）- 僅在非批次編輯模式顯示 */}
                      {!batchEditMode && (
                        <td className="px-4 py-3">
                          <ProductStatusToggle
                            productId={product.id}
                            initialStatus={product.status as 'active' | 'inactive'}
                            productName={product.name}
                            onStatusChanged={() => router.refresh()}
                          />
                        </td>
                      )}

                      {/* 操作 - 僅在非批次編輯模式顯示 */}
                      {!batchEditMode && (
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
                      )}
                    </tr>
                  )
                })
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
                {/* 選擇框、縮圖與商品編號 */}
                <div className="flex items-start gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(product.id)}
                    onChange={() => toggleProductSelection(product.id)}
                    className="mt-1 h-5 w-5 min-w-[44px] min-h-[44px] rounded border-2 border-black"
                  />
                  <ProductThumbnail
                    productId={product.id}
                    imageUrl={product.image_url}
                    productName={product.name}
                    onUploadSuccess={() => router.refresh()}
                  />
                  <div className="flex-1">
                    <div className={cn("font-mono text-gray-600 mb-1", designTokens.typography.caption)}>
                      {product.code}
                    </div>
                    {/* 使用 ProductNameWithSeries 元件顯示商品名稱與彩色系列 Badge */}
                    <ProductNameWithSeries
                      productName={product.name}
                      seriesName={product.series_name || '未知系列'}
                      seriesColor={product.series_color || '#94A3B8'}
                    />
                  </div>
                </div>

                {/* 狀態與庫存狀態（快速切換開關 - 樂觀更新） */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("text-gray-600", designTokens.typography.caption)}>上架:</div>
                  <ProductStatusToggle
                    productId={product.id}
                    initialStatus={product.status as 'active' | 'inactive'}
                    productName={product.name}
                    onStatusChanged={() => router.refresh()}
                  />
                  <div className={cn("text-gray-600 ml-2", designTokens.typography.caption)}>庫存狀態:</div>
                  <ProductStockStatusToggle
                    productId={product.id}
                    initialStockStatus={product.stock_status as 'sufficient' | 'low' | 'out_of_stock'}
                    productName={product.name}
                    onStatusChanged={() => router.refresh()}
                  />
                </div>

                {/* 標籤編輯器 */}
                <div className="mb-3">
                  <ProductTagsEditor
                    productId={product.id}
                    currentTags={product.tags || []}
                    onUpdateSuccess={() => router.refresh()}
                  />
                </div>

                {/* 零售價格 */}
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <div className={cn("text-gray-600 mb-2", designTokens.typography.caption)}>零售價格:</div>
                  <div className={cn("font-mono font-bold text-brand-primary", designTokens.typography.body.large)}>
                    {product.retail_price !== null ? `$${Math.round(product.retail_price)}` : 'N/A'}
                  </div>
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
