/**
 * Combo Deal Cart Item Component
 * Feature: 021-combo-deals (Phase 7 - T060 + Enhancement)
 *
 * 組合優惠購物車項目元件（優化版）
 * - 黃色背景標示組合優惠項目
 * - 顯示完整商品資訊（系列 + 名稱 + 單價 × 數量）
 * - 編輯和刪除按鈕並排顯示（節省空間）
 * - 價格資訊移至購物車摘要統一顯示
 * - Neo-Brutalism 設計風格
 */

'use client'

import Link from 'next/link'
import { Trash2, Edit2, Package } from 'lucide-react'
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

  // 處理刪除組合優惠
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

  // 計算商品總數
  const totalQuantity = item.selected_products.reduce((sum, p) => sum + p.quantity, 0)

  return (
    <div
      className={cn(
        'rounded-none bg-yellow-50',
        designTokens.neoBrutalism.border.full,
        'border-yellow-400',
        designTokens.neoBrutalism.shadow.mobile,
        'p-4 md:p-6'
      )}
    >
      {/* 組合標籤與按鈕 */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Package className="w-5 h-5 text-yellow-700 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-yellow-800 mb-1">
              📦 組合優惠
            </div>
            <h3 className={cn(designTokens.typography.h3, 'text-yellow-900 truncate')}>
              {item.combo_deal_name}
            </h3>
          </div>
        </div>

        {/* 編輯與刪除按鈕 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/store/combo-deals/${item.combo_deal_id}?edit=true&cart_item_id=${item.id}`}
            className={cn(
              'flex items-center gap-2 rounded-none bg-blue-400 font-bold transition-all',
              designTokens.neoBrutalism.border.full,
              'border-black',
              'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
              'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
              'px-3 py-2 text-sm',
              'min-h-[44px]'  // WCAG 2.1 AA 觸控目標
            )}
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden sm:inline">編輯</span>
          </Link>

          <button
            onClick={handleDelete}
            className={cn(
              'flex items-center justify-center rounded-none bg-red-100 font-bold transition-all',
              designTokens.neoBrutalism.border.full,
              'border-red-400',
              'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
              'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
              'hover:bg-red-200',
              'p-2 text-red-700',
              'min-h-[44px] min-w-[44px]'  // WCAG 2.1 AA 觸控目標
            )}
            aria-label="刪除組合優惠"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 商品清單 */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-gray-700 mb-2">
          包含商品 ({totalQuantity} 件):
        </div>
        {item.selected_products.map((product, index) => {
          const detail = productDetails?.get(product.product_id)
          return (
            <div
              key={`${product.product_id}-${index}`}
              className={cn(
                'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2',
                'rounded-none bg-white',
                'border-2 border-yellow-300',
                'px-3 py-2'
              )}
            >
              <div className="flex-1 min-w-0">
                {/* 系列名稱標籤 */}
                {detail?.series_name && (
                  <div className={cn(
                    "inline-block rounded-none bg-yellow-100 px-2 py-0.5 mb-1",
                    "border border-yellow-400",
                    "text-xs font-bold text-yellow-800"
                  )}>
                    【{detail.series_name}】
                  </div>
                )}

                {/* 商品名稱 */}
                <div className="font-medium text-gray-900">
                  {detail?.product_name || product.product_id}
                </div>

                {/* 商品編號（如果有） */}
                {detail?.product_code && (
                  <div className="text-xs text-gray-500">
                    品號: {detail.product_code}
                  </div>
                )}
              </div>

              {/* 🔧 顯示零售價 × 數量 */}
              <div className="text-sm text-gray-600 whitespace-nowrap sm:text-right">
                {detail?.retail_price ? (
                  <>
                    <span className="text-gray-600 font-semibold">
                      NT$ {detail.retail_price.toLocaleString()}
                    </span>
                    {' × '}
                    <span className="font-semibold">{product.quantity}</span>
                  </>
                ) : detail?.unit_price ? (
                  <>
                    <span className="text-green-600 font-semibold">
                      NT$ {detail.unit_price.toLocaleString()}
                    </span>
                    {' × '}
                    <span className="font-semibold">{product.quantity}</span>
                  </>
                ) : (
                  <span className="text-gray-500">× {product.quantity}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
