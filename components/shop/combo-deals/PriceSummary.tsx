/**
 * PriceSummary Component (價格摘要元件)
 * Feature: 021-combo-deals (Phase 6 - User Story 3)
 * Feature: 021-combo-deals (Phase 7 - T062 - 編輯組合功能)
 *
 * 顯示組合優惠的價格計算摘要和「加入購物車」按鈕
 * - 支援編輯模式（更新購物車項目）
 */

'use client'

import { useState } from 'react'
import { ShoppingCart, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'
import { useAlert } from '@/lib/contexts/dialog-context'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/stores/cart'
import type { ComboDealWithDetails, ComboDealPricing } from '@/types'

interface PriceSummaryProps {
  comboDeal: ComboDealWithDetails
  selectedProducts: Array<{
    product_id: string
    product_name: string
    series_id: string
    series_name: string
    quantity: number
    unit_price: number
    retail_price?: number // 🆕 零售價（用於顯示折扣明細）
  }>
  priceInfo: ComboDealPricing
  isValid: boolean
  isValidating: boolean
  editMode?: boolean // 🆕 Phase 7: 是否為編輯模式
  cartItemId?: string // 🆕 Phase 7: 購物車項目 ID
}

export function PriceSummary({
  comboDeal,
  selectedProducts,
  priceInfo,
  isValid,
  isValidating,
  editMode = false,
  cartItemId,
}: PriceSummaryProps) {
  const alert = useAlert()
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)

  // 🆕 Phase 7: 取得購物車操作方法
  const addComboDeal = useCartStore((state) => state.addComboDeal)
  const updateComboDeal = useCartStore((state) => state.updateComboDeal)

  // 處理加入購物車或更新購物車
  const handleSubmit = async () => {
    if (!isValid) {
      await alert({
        title: editMode ? '無法更新購物車' : '無法加入購物車',
        message: '請先滿足組合條件',
        variant: 'warning',
      })
      return
    }

    setIsAdding(true)

    try {
      // 轉換選擇的商品為 cart store 所需的格式
      const selectedProductsForCart = selectedProducts.map((p) => ({
        product_id: p.product_id,
        series_id: p.series_id,
        quantity: p.quantity,
      }))

      if (editMode && cartItemId) {
        // 🆕 Phase 7: 編輯模式 - 更新購物車項目
        updateComboDeal(
          cartItemId,
          selectedProductsForCart,
          priceInfo.originalPrice,
          priceInfo.discountedPrice,
          priceInfo.discountAmount
        )

        await alert({
          title: '更新成功',
          message: `已更新「${comboDeal.name}」`,
          variant: 'success',
        })
      } else {
        // 新增模式 - 加入購物車
        addComboDeal(
          comboDeal.id,
          comboDeal.name,
          selectedProductsForCart,
          priceInfo.originalPrice,
          priceInfo.discountedPrice,
          priceInfo.discountAmount
        )

        await alert({
          title: '加入購物車成功',
          message: `已將「${comboDeal.name}」加入購物車`,
          variant: 'success',
        })
      }

      // 導向購物車頁面
      router.push('/store/cart')
    } catch (error) {
      await alert({
        title: editMode ? '更新購物車失敗' : '加入購物車失敗',
        message: '請稍後再試',
        variant: 'error',
      })
    } finally {
      setIsAdding(false)
    }
  }

  // 🆕 Phase 7: 根據模式顯示不同的按鈕文字和圖示
  const buttonText = editMode ? '更新購物車' : '加入購物車'
  const ButtonIcon = editMode ? Check : ShoppingCart

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-surface border-t p-4 md:p-6 shadow-neo z-10">
      <div className="container mx-auto max-w-2xl">
        {/* 🆕 價格明細（完整折扣明細） */}
        {selectedProducts.length > 0 && (
          <div className="mb-4 space-y-2">
            {/* 商品清單（顯示零售價） */}
            <div className="space-y-1 mb-3">
              {selectedProducts.map((product) => (
                <div
                  key={product.product_id}
                  className="flex justify-between text-xs md:text-sm text-text-secondary"
                >
                  <span className="line-clamp-1">
                    {product.product_name} × {product.quantity}
                  </span>
                  <span className="flex-shrink-0">
                    ${(product.unit_price * product.quantity).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            {/* 分隔線 */}
            <div className="border-t-2 border-border pt-2" />

            {/* 🆕 顯示小計（使用等級價格總和，與商品卡片一致） */}
            <div className="flex justify-between text-sm md:text-base">
              <span className="font-semibold text-foreground">小計</span>
              <span className="font-semibold text-foreground">
                ${priceInfo.tierPrice.toFixed(0)}
              </span>
            </div>

            {/* 🆕 組合優惠折扣 */}
            <div className="flex justify-between text-sm md:text-base text-success font-bold">
              <span>組合優惠折扣</span>
              <span>-${priceInfo.comboDealDiscount.toFixed(0)}</span>
            </div>

            {/* 分隔線 */}
            <div className="border-t pt-2" />

            {/* 🆕 最終價格 */}
            <div className="flex justify-between text-lg md:text-2xl font-black">
              <span className="text-foreground">總計</span>
              <span className="text-error">
                ${priceInfo.finalPrice.toFixed(0)}
              </span>
            </div>
          </div>
        )}

        {/* 加入購物車 / 更新購物車按鈕 */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || isValidating || isAdding || selectedProducts.length === 0}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-theme-sm border-theme py-3 md:py-4 text-base md:text-lg font-black transition-all',
            designTokens.cleanCommerce.shadow.base,
            'md:shadow-neo',
            isValid && !isValidating && !isAdding && selectedProducts.length > 0
              ? editMode
                ? 'bg-blue-400 text-foreground hover:-translate-y-0.5 hover:shadow-theme-hover'
                : 'bg-green-400 text-foreground hover:-translate-y-0.5 hover:shadow-theme-hover'
              : 'bg-gray-200 text-text-secondary cursor-not-allowed'
          )}
        >
          {isAdding ? (
            <>
              <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
              {editMode ? '更新中...' : '加入中...'}
            </>
          ) : isValidating ? (
            <>
              <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
              驗證中...
            </>
          ) : (
            <>
              <ButtonIcon className="w-5 h-5 md:w-6 md:h-6" />
              {buttonText}
              {selectedProducts.length > 0 &&
                ` - $${priceInfo.finalPrice.toFixed(0)}`}
            </>
          )}
        </button>

        {/* 提示訊息 */}
        {selectedProducts.length === 0 && (
          <p className="mt-2 text-center text-xs md:text-sm text-text-secondary">
            請選擇商品以查看價格
          </p>
        )}
      </div>
    </div>
  )
}
