'use client'

/**
 * Smart Product List - 智能切換組件
 * Feature: Performance Optimization - Phase 3.1
 *
 * 根據商品數量智能切換渲染模式：
 * - <= 100 筆：使用標準表格（支援完整功能）
 * - > 100 筆：使用虛擬滾動（優化渲染性能）
 */

import { ProductTableWithTags } from '@/components/admin/product-table-with-tags'
import { VirtualProductList } from '@/components/admin/products/virtual-product-list'
import { useConfirm, useAlert } from '@/lib/contexts/dialog-context'
import { deleteProduct } from '@/lib/actions/products'
import { useRouter } from 'next/navigation'
import type { Product, Series } from '@/types'

interface SmartProductListProps {
  products: Product[]
  series: Series[]
  total: number
  currentPage: number
  pageSize: number
  searchQuery: string
  selectedSeries: string
  useVirtualScroll?: boolean // 強制使用虛擬滾動
}

export function SmartProductList({
  products,
  series,
  total,
  currentPage,
  pageSize,
  searchQuery,
  selectedSeries,
  useVirtualScroll = false,
}: SmartProductListProps) {
  const router = useRouter()
  const confirm = useConfirm()
  const alert = useAlert()

  // 刪除商品處理函數
  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: '刪除商品',
      description: `確定要刪除商品「${name}」嗎？此操作無法復原。`,
      variant: 'danger',
    })

    if (!confirmed) return

    const result = await deleteProduct(id)
    if (result.success) {
      await alert({
        title: '刪除成功',
        message: result.message || '商品已成功刪除',
        variant: 'success',
      })
      router.refresh()
    } else {
      await alert({
        title: '刪除失敗',
        message: result.message || '刪除商品失敗',
        variant: 'error',
      })
    }
  }

  // 智能切換：商品數量 > 100 或強制啟用虛擬滾動
  const shouldUseVirtualScroll = useVirtualScroll || products.length > 100

  if (shouldUseVirtualScroll) {
    return (
      <div>
        {/* 提示訊息 */}
        <div className="mb-4 text-sm text-gray-600 bg-blue-50 border p-3">
          ⚡ 虛擬滾動模式已啟用（{products.length} 筆商品）- 部分批次編輯功能已簡化以提升性能
        </div>

        <VirtualProductList
          products={products}
          series={series}
          onDelete={handleDelete}
        />
      </div>
    )
  }

  // 標準模式：使用完整功能的 ProductTableWithTags
  return (
    <ProductTableWithTags
      products={products}
      series={series}
      total={total}
      currentPage={currentPage}
      pageSize={pageSize}
      searchQuery={searchQuery}
      selectedSeries={selectedSeries}
    />
  )
}
