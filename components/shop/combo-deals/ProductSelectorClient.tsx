/**
 * ProductSelectorClient Component
 * Feature: 021-combo-deals (Phase 7 - T062)
 *
 * Client-side wrapper for ProductSelector to support edit mode
 * - Loads cart item data when in edit mode
 * - Passes initial selection to ProductSelector
 * - Handles cart item not found error
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCartStore } from '@/stores/cart'
import { ProductSelector } from './ProductSelector'
import type { ComboDealWithDetails } from '@/types'
import type { SelectedProduct } from '@/types/combo-deals'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'

interface ProductSelectorClientProps {
  comboDeal: ComboDealWithDetails
  editMode: boolean
  cartItemId: string | null
}

export function ProductSelectorClient({
  comboDeal,
  editMode,
  cartItemId,
}: ProductSelectorClientProps) {
  const getComboDeal = useCartStore((state) => state.getComboDeal)
  const [initialSelection, setInitialSelection] = useState<SelectedProduct[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editMode && cartItemId) {
      // 從購物車載入組合優惠項目
      const cartItem = getComboDeal(cartItemId)

      if (!cartItem) {
        setError('找不到購物車中的組合優惠項目')
        return
      }

      // 轉換為 ProductSelector 所需的格式
      const selectedProducts: SelectedProduct[] = cartItem.selected_products.map((p) => ({
        product_id: p.product_id,
        quantity: p.quantity,
        series_id: p.series_id,
        // 這些欄位在 ProductSelector 中會重新從 comboDeal 獲取
        product_name: '',
        series_name: '',
        unit_price: 0,
      }))

      setInitialSelection(selectedProducts)
    } else {
      // 非編輯模式，無初始選擇
      setInitialSelection([])
    }
  }, [editMode, cartItemId, getComboDeal])

  // 載入中狀態
  if (editMode && initialSelection === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-text-secondary">載入購物車項目...</p>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div
        className={cn(
          'rounded-none bg-error-bg',
          designTokens.neoBrutalism.border.full,
          'border-red-600',
          'p-6 text-center',
          designTokens.neoBrutalism.shadow.mobile
        )}
      >
        <AlertCircle className="mx-auto mb-3 h-12 w-12 text-error" />
        <p className="text-lg font-semibold text-error">載入失敗</p>
        <p className="mt-2 text-sm text-error">{error}</p>
        <Link
          href="/store/cart"
          className={cn(
            'mt-4 inline-block rounded-none bg-blue-400 font-bold transition-all',
            designTokens.neoBrutalism.border.full,
            'border-black',
            designTokens.neoBrutalism.shadow.mobile,
            designTokens.neoBrutalism.hover,
            'px-6 py-3'
          )}
        >
          返回購物車
        </Link>
      </div>
    )
  }

  return (
    <ProductSelector
      comboDeal={comboDeal}
      editMode={editMode}
      cartItemId={cartItemId || undefined}
      initialSelection={initialSelection || undefined}
    />
  )
}
