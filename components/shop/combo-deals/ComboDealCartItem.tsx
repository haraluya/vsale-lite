/**
 * Combo Deal Cart Item Component
 * Feature: 021-combo-deals (Phase 7 - T060)
 *
 * 組合優惠購物車項目元件
 * - 黃色背景標示組合優惠項目
 * - 顯示組合優惠名稱和選購的商品清單
 * - 提供「編輯組合」功能連結
 * - 提供刪除按鈕
 * - Neo-Brutalism 設計風格
 */

'use client'

import Link from 'next/link'
import { Trash2, Edit2, Package } from 'lucide-react'
import { useCartStore, type ComboDealCartItem as ComboDealCartItemType } from '@/stores/cart'
import { useConfirm, useAlert } from '@/lib/contexts/dialog-context'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'

interface ComboDealCartItemProps {
  item: ComboDealCartItemType
  productDetails?: Map<string, { name: string; code: string; image?: string }>
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

  // 計算每個商品的單價（從原價推算）
  const getProductPrice = (productId: string, quantity: number): number => {
    // 這裡無法精確計算，顯示為預估值
    // 實際價格已包含在 original_price 中
    return 0
  }

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
      {/* 組合標籤與編輯連結 */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-yellow-700 flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-yellow-800 mb-1">
              📦 組合優惠
            </div>
            <h3 className={cn(designTokens.typography.h3, 'text-yellow-900')}>
              {item.combo_deal_name}
            </h3>
          </div>
        </div>

        <Link
          href={`/store/combo-deals/${item.combo_deal_id}?edit=true&cart_item_id=${item.id}`}
          className={cn(
            'flex items-center gap-2 rounded-none bg-blue-400 font-bold transition-all',
            designTokens.neoBrutalism.border.full,
            'border-black',
            'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
            'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
            'px-3 py-2 text-sm whitespace-nowrap'
          )}
        >
          <Edit2 className="w-4 h-4" />
          編輯組合
        </Link>
      </div>

      {/* 商品清單 */}
      <div className="space-y-2 mb-4">
        <div className="text-sm font-semibold text-gray-700 mb-2">
          包含商品 ({totalQuantity} 件):
        </div>
        {item.selected_products.map((product, index) => {
          const detail = productDetails?.get(product.product_id)
          return (
            <div
              key={`${product.product_id}-${index}`}
              className={cn(
                'flex justify-between items-center gap-4',
                'rounded-none bg-white',
                'border-2 border-yellow-300',
                'px-3 py-2'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {detail?.name || product.product_id}
                </div>
                {detail?.code && (
                  <div className="text-xs text-gray-500">
                    品號: {detail.code}
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-600 whitespace-nowrap">
                × {product.quantity}
              </div>
            </div>
          )
        })}
      </div>

      {/* 價格資訊 */}
      <div className="space-y-2 border-t-2 border-yellow-300 pt-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">原價</span>
          <span className="font-medium text-gray-700 line-through">
            NT$ {item.original_price.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="font-semibold text-green-600">組合優惠折扣</span>
          <span className="font-bold text-green-600">
            - NT$ {item.discount_amount.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t-2 border-yellow-300">
          <span className="font-bold text-gray-900">優惠價</span>
          <span className={cn(designTokens.typography.h3, 'text-green-600')}>
            NT$ {item.discounted_price.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 刪除按鈕 */}
      <button
        onClick={handleDelete}
        className={cn(
          'mt-4 flex items-center justify-center gap-2 w-full',
          'rounded-none bg-red-100 font-bold transition-all',
          designTokens.neoBrutalism.border.full,
          'border-red-400',
          'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
          'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
          'hover:bg-red-200',
          'px-4 py-2 text-sm text-red-700'
        )}
      >
        <Trash2 className="w-4 h-4" />
        刪除組合優惠
      </button>
    </div>
  )
}
