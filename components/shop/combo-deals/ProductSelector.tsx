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
  retail_price: number // 🆕 零售價（顯示會員折扣）
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
              retail_price: product.retail_price, // 🆕 零售價
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
          retail_price: 0, // 🆕 零售價
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

  // 🔧 處理商品選擇（各選模式 - 已改為數量選擇模式）
  // 此函式已棄用，各選模式現在使用 handleQuantityChange

  // 🔧 處理數量變更（任選模式 & 各選模式）
  const handleQuantityChange = (
    productId: string,
    productName: string,
    seriesId: string,
    seriesName: string,
    unitPrice: number,
    retailPrice: number, // 🆕 零售價
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
              retail_price: retailPrice, // 🆕 零售價
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

  // 🔧 渲染各選模式的系列（改為數量選擇模式）
  const renderEachModeSeries = () => {
    return comboDeal.series.map((series) => {
      // 🔧 計算該系列已選擇的商品數量總和（而非商品個數）
      const seriesSelectedCount = selectedProducts
        .filter((p) => p.series_id === series.series_id)
        .reduce((sum, p) => sum + p.quantity, 0)
      const requiredQuantity = series.required_quantity || 0

      return (
        <div key={series.series_id} className="mb-8">
          {/* 系列標題 */}
          <div className="mb-4 rounded-none border-2 md:border-3 border-black bg-yellow-50 p-4 shadow-neo-sm">
            <h3 className="text-lg md:text-xl font-black text-foreground mb-2">
              {series.series_name}
              {/* 🆕 顯示可選數量提示 */}
              <span className="ml-2 text-base md:text-lg font-semibold text-text-secondary">
                (需選 {requiredQuantity} 件)
              </span>
            </h3>
            <p className="text-sm md:text-base text-foreground">
              {seriesSelectedCount > 0 && (
                <span
                  className={cn(
                    'font-bold',
                    seriesSelectedCount === requiredQuantity
                      ? 'text-success'
                      : 'text-orange-600'
                  )}
                >
                  已選 {seriesSelectedCount} 件
                </span>
              )}
              {seriesSelectedCount === 0 && (
                <span className="text-text-secondary">尚未選擇</span>
              )}
            </p>
          </div>

          {/* 商品列表 */}
          {series.products.length === 0 ? (
            <div className="rounded-none border-2 border-gray-300 bg-surface-secondary p-4 text-center text-text-secondary">
              此系列無可用商品
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {series.products.map((product) => {
                const quantity = getProductQuantity(product.product_id)
                // 🔧 檢查該系列是否還能再選（基於數量總和）
                const canIncrease = seriesSelectedCount < requiredQuantity

                return (
                  <div
                    key={product.product_id}
                    className={cn(
                      'group relative rounded-none bg-surface p-2 md:p-4 transition-all',
                      designTokens.neoBrutalism.border.full,
                      designTokens.neoBrutalism.shadow.full,
                      'border-black'
                    )}
                  >
                    {/* 商品圖片 */}
                    <div className={cn(
                      "mb-2 md:mb-4 aspect-square overflow-hidden rounded-none bg-surface-secondary relative",
                      designTokens.neoBrutalism.border.mobile,
                      "border-black"
                    )}>
                      {product.product_image ? (
                        <Image
                          src={product.product_image}
                          alt={product.product_name}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl md:text-6xl text-text-secondary">
                          📦
                        </div>
                      )}
                    </div>

                    {/* 商品資訊 */}
                    <div className="space-y-1.5 md:space-y-2">
                      {/* 商品名稱（黃色標籤） */}
                      <div className={cn(
                        "rounded-none bg-yellow-300 p-1.5 md:p-2",
                        designTokens.neoBrutalism.border.mobile,
                        "border-black"
                      )}>
                        <h4 className="text-sm md:text-base font-bold text-foreground line-clamp-2 min-h-[2.5em]">
                          {product.product_name}
                        </h4>
                      </div>

                      {/* 商品價格 */}
                      <p className="text-lg md:text-2xl font-bold text-brand-primary">
                        ${product.tier_price}
                        <span className="text-xs ml-1 font-normal text-text-secondary">
                          /件
                        </span>
                      </p>

                      {/* 🔧 數量選擇器（各選模式改為數量選擇） */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleQuantityChange(
                              product.product_id,
                              product.product_name,
                              series.series_id,
                              series.series_name,
                              product.tier_price,
                              product.retail_price,
                              -1
                            )
                          }
                          disabled={quantity === 0}
                          className={cn(
                            'flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-none flex items-center justify-center transition-all',
                            designTokens.neoBrutalism.border.full,
                            'border-black',
                            quantity > 0
                              ? 'bg-red-400 shadow-neo-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                              : 'bg-gray-200 opacity-30 cursor-not-allowed'
                          )}
                        >
                          <Minus className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
                        </button>

                        <div className="flex-1 text-center">
                          <span className="text-xl md:text-2xl font-black">
                            {quantity}
                          </span>
                        </div>

                        <button
                          onClick={() =>
                            handleQuantityChange(
                              product.product_id,
                              product.product_name,
                              series.series_id,
                              series.series_name,
                              product.tier_price,
                              product.retail_price,
                              1
                            )
                          }
                          disabled={!canIncrease}
                          className={cn(
                            'flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-none flex items-center justify-center transition-all',
                            designTokens.neoBrutalism.border.full,
                            'border-black',
                            canIncrease
                              ? 'bg-green-400 shadow-neo-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                              : 'bg-gray-200 opacity-30 cursor-not-allowed'
                          )}
                        >
                          <Plus className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
                        </button>
                      </div>
                    </div>

                    {/* 庫存狀態（根據 stock_status 判斷，支援負庫存銷售） */}
                    {product.stock_status === 'out_of_stock' && (
                      <p className="text-xs text-error mt-1 text-center font-bold">
                        暫時缺貨
                      </p>
                    )}
                  </div>
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
            任選 {requiredQuantity} 件商品
          </h3>
          <p className="text-sm md:text-base text-foreground">
            從以下所有系列中任意選擇商品，總數量達到{' '}
            <span className="font-bold">{requiredQuantity}</span> 件即可享受優惠
            {totalSelectedCount > 0 && (
              <span
                className={cn(
                  'ml-2 font-bold',
                  totalSelectedCount === requiredQuantity
                    ? 'text-success'
                    : 'text-orange-600'
                )}
              >
                （已選 {totalSelectedCount} 件）
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
              <div className="rounded-none border-2 border-gray-300 bg-surface-secondary p-4 text-center text-text-secondary">
                此系列無可用商品
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                {series.products.map((product) => {
                  const quantity = getProductQuantity(product.product_id)
                  const canIncrease = !isLimitReached

                  return (
                    <div
                      key={product.product_id}
                      className={cn(
                        'group relative rounded-none bg-surface p-2 md:p-4 transition-all',
                        designTokens.neoBrutalism.border.full,
                        designTokens.neoBrutalism.shadow.full,
                        'border-black'
                      )}
                    >
                      {/* 商品圖片 */}
                      <div className={cn(
                        "mb-2 md:mb-4 aspect-square overflow-hidden rounded-none bg-surface-secondary relative",
                        designTokens.neoBrutalism.border.mobile,
                        "border-black"
                      )}>
                        {product.product_image ? (
                          <Image
                            src={product.product_image}
                            alt={product.product_name}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl md:text-6xl text-text-secondary">
                            📦
                          </div>
                        )}
                      </div>

                      {/* 商品資訊 */}
                      <div className="space-y-1.5 md:space-y-2">
                        {/* 商品名稱（黃色標籤） */}
                        <div className={cn(
                          "rounded-none bg-yellow-300 p-1.5 md:p-2",
                          designTokens.neoBrutalism.border.mobile,
                          "border-black"
                        )}>
                          <h5 className="text-sm md:text-base font-bold text-foreground line-clamp-2 min-h-[2.5em]">
                            {product.product_name}
                          </h5>
                        </div>

                        {/* 商品價格 */}
                        <p className="text-lg md:text-2xl font-bold text-brand-primary">
                          ${product.tier_price}
                          <span className="text-xs ml-1 font-normal text-text-secondary">
                            /件
                          </span>
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
                                product.retail_price, // 🆕 零售價
                                -1
                              )
                            }
                            disabled={quantity === 0}
                            className={cn(
                              'flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-none flex items-center justify-center transition-all',
                              designTokens.neoBrutalism.border.full,
                              'border-black',
                              quantity > 0
                                ? 'bg-red-400 shadow-neo-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                                : 'bg-gray-200 opacity-30 cursor-not-allowed'
                            )}
                          >
                            <Minus className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
                          </button>

                          <div className="flex-1 text-center">
                            <span className="text-xl md:text-2xl font-black">
                              {quantity}
                            </span>
                          </div>

                          <button
                            onClick={() =>
                              handleQuantityChange(
                                product.product_id,
                                product.product_name,
                                series.series_id,
                                series.series_name,
                                product.tier_price,
                                product.retail_price, // 🆕 零售價
                                1
                              )
                            }
                            disabled={!canIncrease}
                            className={cn(
                              'flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-none flex items-center justify-center transition-all',
                              designTokens.neoBrutalism.border.full,
                              'border-black',
                              canIncrease
                                ? 'bg-green-400 shadow-neo-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                                : 'bg-gray-200 opacity-30 cursor-not-allowed'
                            )}
                          >
                            <Plus className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
                          </button>
                        </div>
                      </div>

                      {/* 庫存狀態（根據 stock_status 判斷，支援負庫存銷售） */}
                      {product.stock_status === 'out_of_stock' && (
                        <p className="text-xs text-error mt-1 text-center font-bold">
                          暫時缺貨
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
            isValid ? 'bg-success-bg' : 'bg-orange-50'
          )}
        >
          <AlertCircle
            className={cn(
              'flex-shrink-0 w-5 h-5 md:w-6 md:h-6',
              isValid ? 'text-success' : 'text-orange-600'
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
