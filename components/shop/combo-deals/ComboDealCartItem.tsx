/**
 * Combo Deal Cart Item Component
 * Feature: 021-combo-deals (Phase 7 - T060 + Enhancement)
 *
 * 組合優惠購物車項目元件（amber 容器設計）
 * - amber 背景標示組合優惠項目
 * - 顯示零售原價與已省金額
 * - 編輯和刪除按鈕並排顯示
 */

'use client'

import Link from 'next/link'
import { Trash2, Edit2 } from 'lucide-react'
import { useCartStore, type ComboDealCartItem as ComboDealCartItemType } from '@/stores/cart'
import type { ProductDetailInfo } from '@/types'
import { useConfirm, useAlert } from '@/lib/contexts/dialog-context'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'

interface ComboDealCartItemProps {
  item: ComboDealCartItemType
  productDetails?: Map<string, ProductDetailInfo>
}

export function ComboDealCartItem({ item, productDetails }: ComboDealCartItemProps) {
  const removeComboDeal = useCartStore((state) => state.removeComboDeal)
  const confirm = useConfirm()
  const alert = useAlert()

  async function handleDelete() {
    const confirmed = await confirm({
      title: '確認刪除',
      description: `確定要從購物車移除「${item.combo_deal_name}」？`,
      variant: 'danger',
    })

    if (confirmed) {
      removeComboDeal(item.id)
      await alert({
        title: '已刪除',
        message: '組合優惠已從購物車移除',
        variant: 'success',
      })
    }
  }

  // 計算零售價合計
  const retailTotal = item.selected_products.reduce((sum, product) => {
    const detail = productDetails?.get(product.product_id)
    return sum + (detail?.retail_price || detail?.unit_price || 0) * product.quantity
  }, 0)

  // 總省下金額
  const totalSavings = retailTotal - item.discounted_price

  return (
    <div className="border-2 border-amber-200 bg-amber-50/30 dark:bg-amber-950/20 rounded-xl overflow-hidden">
      {/* 標題列 */}
      <div className="flex items-center justify-between gap-2 bg-amber-50 dark:bg-amber-900/30 px-4 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg flex-shrink-0">🔥</span>
          <span className="font-bold text-amber-900 dark:text-amber-100 truncate">
            {item.combo_deal_name}
          </span>
          {totalSavings > 0 && (
            <span className="text-sm font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
              已省 NT$ {totalSavings.toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/store/combo-deals/${item.combo_deal_id}?edit=true&cart_item_id=${item.id}`}
            className={cn(
              'flex items-center gap-1 rounded-theme-sm bg-blue-400 font-bold transition-all',
              designTokens.cleanCommerce.border.full,
              'border-border shadow-neo-sm',
              'hover:-translate-y-0.5 hover:shadow-theme-hover',
              'px-3 py-2 text-sm min-h-[44px]'
            )}
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden sm:inline">編輯</span>
          </Link>

          <button
            onClick={handleDelete}
            className="flex items-center gap-1 rounded-theme-sm text-red-500 font-bold
                       text-sm px-3 py-2 min-h-[44px] hover:bg-red-50 dark:hover:bg-red-950
                       transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">移除整組</span>
          </button>
        </div>
      </div>

      {/* 商品列表 */}
      <div className="p-3 space-y-2">
        {item.selected_products.map((product, index) => {
          const detail = productDetails?.get(product.product_id)
          return (
            <div
              key={`${product.product_id}-${index}`}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <div className="flex-1 min-w-0">
                {detail?.series_name && (
                  <span className="inline-block rounded bg-amber-100 dark:bg-amber-800 border border-amber-300
                                   px-1.5 py-0.5 mr-1.5 text-xs font-bold text-amber-800 dark:text-amber-200">
                    {detail.series_name}
                  </span>
                )}
                <span className="text-foreground">
                  {detail?.product_name || product.product_id}
                </span>
              </div>
              <span className="text-text-secondary whitespace-nowrap">
                NT$ {(detail?.retail_price || detail?.unit_price || 0).toLocaleString()} × {product.quantity}
              </span>
            </div>
          )
        })}
      </div>

      {/* 小計 */}
      <div className="border-t border-amber-200 px-4 py-2 flex items-center justify-between">
        <span className="text-sm text-text-secondary">小計</span>
        <div className="flex items-center gap-2">
          {retailTotal !== item.discounted_price && (
            <span className="text-sm text-text-secondary line-through">
              NT$ {retailTotal.toLocaleString()}
            </span>
          )}
          <span className="text-lg font-bold text-success">
            NT$ {item.discounted_price.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}
