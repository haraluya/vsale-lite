/**
 * ProductSelector Component (商品選擇器元件)
 * Feature: 021-combo-deals (Phase 6 - User Story 3 & 4)
 * Feature: 021-combo-deals (Phase 7 - T062 - 編輯組合功能)
 *
 * 支援各選模式與任選模式的商品選擇
 * - 各選模式：每個系列需選擇指定數量
 * - 任選模式：從所有系列任選指定總數量
 * - 即時價格計算與條件檢查
 * - 支援編輯模式（從購物車載入初始選擇）
 */

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Check, Plus, Minus, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'
import type { ComboDealWithDetails } from '@/types'
import type { SelectedProduct as SelectedProductType } from '@/types/combo-deals'
import { PriceSummary } from './PriceSummary'
import { validateComboDealSelection } from '@/lib/actions/combo-deals'
import { calculateComboDealPrice } from '@/lib/pricing/combo-deals'

interface ProductSelectorProps {
  comboDeal: ComboDealWithDetails
  editMode?: boolean // 🆕 Phase 7: 是否為編輯模式
  cartItemId?: string // 🆕 Phase 7: 購物車項目 ID
  initialSelection?: SelectedProductType[] // 🆕 Phase 7: 初始選擇（編輯模式時使用）
}

interface SelectedProduct {
  product_id: string
  product_name: string
  series_id: string
  series_name: string
  quantity: number
  unit_price: number
}

export function ProductSelector({
  comboDeal,
  editMode = false,
  cartItemId,
  initialSelection = [],
}: ProductSelectorProps) {
  // 🆕 Phase 7: 使用初始選擇初始化狀態（編輯模式）
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(() => {
    if (initialSelection.length > 0) {
      // 將 initialSelection 轉換為完整的 SelectedProduct 格式
      return initialSelection.map((item) => {
        // 從 comboDeal 中找出對應的商品和系列資訊
        for (const series of comboDeal.series) {
          const product = series.products.find((p) => p.product_id === item.product_id)
          if (product) {
            return {
              product_id: item.product_id,
              product_name: product.product_name,
              series_id: item.series_id,
              series_name: series.series_name,
              quantity: item.quantity,
              unit_price: product.tier_price,
            }
          }
        }
        // 找不到的情況（理論上不應發生）
        return {
          product_id: item.product_id,
          product_name: '',
          series_id: item.series_id,
          series_name: '',
          quantity: item.quantity,
          unit_price: 0,
        }
      })
    }
    return []
  })

  const [validationMessage, setValidationMessage] = useState<string>('')
  const [isValid, setIsValid] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  // 計算價格
  const priceInfo = calculateComboDealPrice(
    selectedProducts,
    comboDeal.discount_type,
    comboDeal.discount_value
  )

  // 當選擇變化時，驗證組合條件
  useEffect(() => {
    const validateSelection = async () => {
      if (selectedProducts.length === 0) {
        setValidationMessage('')
        setIsValid(false)
        return
      }

      setIsValidating(true)

      const result = await validateComboDealSelection(
        comboDeal.id,
        selectedProducts.map((p) => ({
          product_id: p.product_id,
          quantity: p.quantity,
        }))
      )

      setIsValidating(false)

      if (result.success && result.data) {
        setIsValid(result.data.valid)
        setValidationMessage(result.data.message || '')
      } else {
        setIsValid(false)
        setValidationMessage(result.message || '驗證失敗')
      }
    }

    validateSelection()
  }, [selectedProducts, comboDeal.id])

  // 處理商品選擇（各選模式）
  const handleToggleProduct = (
    productId: string,
    productName: string,
    seriesId: string,
    seriesName: string,
    unitPrice: number,
    requiredQuantity: number
  ) => {
    setSelectedProducts((prev) => {
      const existingIndex = prev.findIndex((p) => p.product_id === productId)

      if (existingIndex >= 0) {
        // 已選擇，移除
        return prev.filter((p) => p.product_id !== productId)
      } else {
        // 未選擇，檢查該系列是否已達上限
        const seriesCount = prev.filter((p) => p.series_id === seriesId).length

        if (seriesCount >= requiredQuantity) {
          // 達到上限，不允許再選（可以考慮替換最舊的選擇）
          return prev
        }

        // 新增選擇
        return [
          ...prev,
          {
            product_id: productId,
            product_name: productName,
            series_id: seriesId,
            series_name: seriesName,
            quantity: 1,
            unit_price: unitPrice,
          },
        ]
      }
    })
  }

  // 處理數量變更（任選模式）
  const handleQuantityChange = (
    productId: string,
    productName: string,
    seriesId: string,
    seriesName: string,
    unitPrice: number,
    delta: number
  ) => {
    setSelectedProducts((prev) => {
      const existingIndex = prev.findIndex((p) => p.product_id === productId)

      if (existingIndex >= 0) {
        // 已存在，更新數量
        const newQuantity = prev[existingIndex].quantity + delta

        if (newQuantity <= 0) {
          // 數量歸零，移除
          return prev.filter((p) => p.product_id !== productId)
        }

        // 更新數量
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQuantity,
        }
        return updated
      } else {
        // 不存在，新增
        if (delta > 0) {
          return [
            ...prev,
            {
              product_id: productId,
              product_name: productName,
              series_id: seriesId,
              series_name: seriesName,
              quantity: delta,
              unit_price: unitPrice,
            },
          ]
        }
        return prev
      }
    })
  }

  // 取得商品的選擇狀態或數量
  const getProductQuantity = (productId: string): number => {
    const found = selectedProducts.find((p) => p.product_id === productId)
    return found ? found.quantity : 0
  }

  // 檢查商品是否已選擇
  const isProductSelected = (productId: string): boolean => {
    return selectedProducts.some((p) => p.product_id === productId)
  }

  // 計算任選模式的已選總數
  const totalSelectedCount = selectedProducts.reduce(
    (sum, p) => sum + p.quantity,
    0
  )

  // 渲染各選模式的系列
  const renderEachModeSeries = () => {
    return comboDeal.series.map((series) => {
      const seriesSelectedCount = selectedProducts.filter(
        (p) => p.series_id === series.series_id
      ).length
      const requiredQuantity = series.required_quantity || 0

      return (
        <div key={series.series_id} className="mb-8">
          {/* 系列標題 */}
          <div className="mb-4 rounded-none border-2 md:border-3 border-black bg-yellow-50 p-4 shadow-neo-sm">
            <h3 className="text-lg md:text-xl font-black text-foreground mb-2">
              {series.series_name}
            </h3>
            <p className="text-sm md:text-base text-gray-700">
              需選擇 <span className="font-bold">{requiredQuantity}</span> 個商品
              {seriesSelectedCount > 0 && (
                <span
                  className={cn(
                    'ml-2 font-bold',
                    seriesSelectedCount === requiredQuantity
                      ? 'text-green-600'
                      : 'text-orange-600'
                  )}
                >
                  （已選 {seriesSelectedCount} 個）
                </span>
              )}
            </p>
          </div>

          {/* 商品列表 */}
          {series.products.length === 0 ? (
            <div className="rounded-none border-2 border-gray-300 bg-gray-50 p-4 text-center text-gray-500">
              此系列無可用商品
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {series.products.map((product) => {
                const isSelected = isProductSelected(product.product_id)
                const canSelect =
                  !isSelected && seriesSelectedCount < requiredQuantity

                return (
                  <button
                    key={product.product_id}
                    onClick={() =>
                      canSelect || isSelected
                        ? handleToggleProduct(
                            product.product_id,
                            product.product_name,
                            series.series_id,
                            series.series_name,
                            product.tier_price,
                            requiredQuantity
                          )
                        : null
                    }
                    disabled={!canSelect && !isSelected}
                    className={cn(
                      'group relative rounded-none border-2 md:border-3 border-black p-3 text-left transition-all',
                      isSelected
                        ? 'bg-green-100 shadow-neo translate-x-[2px] translate-y-[2px]'
                        : canSelect
                          ? 'bg-white shadow-neo-sm md:shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                          : 'bg-gray-100 opacity-50 cursor-not-allowed'
                    )}
                  >
                    {/* 選擇標記 */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-600 border-2 border-black flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </div>
                    )}

                    {/* 商品圖片 */}
                    <div className="relative w-full aspect-square bg-gray-100 mb-2 overflow-hidden">
                      {product.product_image ? (
                        <Image
                          src={product.product_image}
                          alt={product.product_name}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          無圖片
                        </div>
                      )}
                    </div>

                    {/* 商品名稱 */}
                    <h4 className="text-sm md:text-base font-bold text-foreground mb-1 line-clamp-2 min-h-[2.5em]">
                      {product.product_name}
                    </h4>

                    {/* 商品價格 */}
                    <p className="text-sm md:text-base font-bold text-blue-600">
                      ${product.tier_price}
                    </p>

                    {/* 庫存狀態 */}
                    {product.stock !== undefined && product.stock <= 0 && (
                      <p className="text-xs text-gray-500 mt-1">庫存不足</p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )
    })
  }

  // 渲染任選模式的所有商品
  const renderMixMatchMode = () => {
    const requiredQuantity = comboDeal.mix_match_total_quantity || 0
    const isLimitReached = totalSelectedCount >= requiredQuantity

    return (
      <div className="mb-8">
        {/* 任選規則說明 */}
        <div className="mb-4 rounded-none border-2 md:border-3 border-black bg-yellow-50 p-4 shadow-neo-sm">
          <h3 className="text-lg md:text-xl font-black text-foreground mb-2">
            任選 {requiredQuantity} 個商品
          </h3>
          <p className="text-sm md:text-base text-gray-700">
            從以下所有系列中任意選擇商品，總數量達到{' '}
            <span className="font-bold">{requiredQuantity}</span> 個即可享受優惠
            {totalSelectedCount > 0 && (
              <span
                className={cn(
                  'ml-2 font-bold',
                  totalSelectedCount === requiredQuantity
                    ? 'text-green-600'
                    : 'text-orange-600'
                )}
              >
                （已選 {totalSelectedCount} 個）
              </span>
            )}
          </p>
        </div>

        {/* 所有系列商品 */}
        {comboDeal.series.map((series) => (
          <div key={series.series_id} className="mb-6">
            <h4 className="text-base md:text-lg font-bold text-foreground mb-3 px-2">
              {series.series_name}
            </h4>

            {series.products.length === 0 ? (
              <div className="rounded-none border-2 border-gray-300 bg-gray-50 p-4 text-center text-gray-500">
                此系列無可用商品
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {series.products.map((product) => {
                  const quantity = getProductQuantity(product.product_id)
                  const canIncrease = !isLimitReached || quantity > 0

                  return (
                    <div
                      key={product.product_id}
                      className={cn(
                        'rounded-none border-2 md:border-3 border-black bg-white p-3 shadow-neo-sm md:shadow-neo',
                        quantity > 0 && 'bg-green-50'
                      )}
                    >
                      {/* 商品圖片 */}
                      <div className="relative w-full aspect-square bg-gray-100 mb-2 overflow-hidden">
                        {product.product_image ? (
                          <Image
                            src={product.product_image}
                            alt={product.product_name}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            無圖片
                          </div>
                        )}
                      </div>

                      {/* 商品名稱 */}
                      <h5 className="text-sm md:text-base font-bold text-foreground mb-1 line-clamp-2 min-h-[2.5em]">
                        {product.product_name}
                      </h5>

                      {/* 商品價格 */}
                      <p className="text-sm md:text-base font-bold text-blue-600 mb-2">
                        ${product.tier_price}
                      </p>

                      {/* 數量選擇器 */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleQuantityChange(
                              product.product_id,
                              product.product_name,
                              series.series_id,
                              series.series_name,
                              product.tier_price,
                              -1
                            )
                          }
                          disabled={quantity === 0}
                          className={cn(
                            'flex-shrink-0 w-8 h-8 rounded-none border-2 border-black bg-red-300 flex items-center justify-center transition-all',
                            quantity > 0
                              ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo-sm'
                              : 'opacity-30 cursor-not-allowed'
                          )}
                        >
                          <Minus className="w-4 h-4" />
                        </button>

                        <span className="flex-1 text-center text-base md:text-lg font-bold">
                          {quantity}
                        </span>

                        <button
                          onClick={() =>
                            handleQuantityChange(
                              product.product_id,
                              product.product_name,
                              series.series_id,
                              series.series_name,
                              product.tier_price,
                              1
                            )
                          }
                          disabled={!canIncrease}
                          className={cn(
                            'flex-shrink-0 w-8 h-8 rounded-none border-2 border-black bg-green-300 flex items-center justify-center transition-all',
                            canIncrease
                              ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo-sm'
                              : 'opacity-30 cursor-not-allowed'
                          )}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* 庫存狀態 */}
                      {product.stock !== undefined && product.stock <= 0 && (
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          庫存不足
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* 商品選擇區域 */}
      <div className="mb-6">
        {comboDeal.combo_mode === 'each'
          ? renderEachModeSeries()
          : renderMixMatchMode()}
      </div>

      {/* 驗證訊息 */}
      {validationMessage && (
        <div
          className={cn(
            'mb-6 rounded-none border-2 md:border-3 border-black p-4 shadow-neo-sm flex items-start gap-3',
            isValid ? 'bg-green-50' : 'bg-orange-50'
          )}
        >
          <AlertCircle
            className={cn(
              'flex-shrink-0 w-5 h-5 md:w-6 md:h-6',
              isValid ? 'text-green-600' : 'text-orange-600'
            )}
          />
          <p
            className={cn(
              'text-sm md:text-base font-semibold',
              isValid ? 'text-green-800' : 'text-orange-800'
            )}
          >
            {validationMessage}
          </p>
        </div>
      )}

      {/* 價格摘要與加入購物車 / 更新購物車 */}
      <PriceSummary
        comboDeal={comboDeal}
        selectedProducts={selectedProducts}
        priceInfo={priceInfo}
        isValid={isValid}
        isValidating={isValidating}
        editMode={editMode} // 🆕 Phase 7
        cartItemId={cartItemId} // 🆕 Phase 7
      />
    </div>
  )
}
