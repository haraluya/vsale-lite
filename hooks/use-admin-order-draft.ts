'use client'

import { useState, useCallback, useMemo } from 'react'
import { calculateOrderAmounts, calculateGrandTotal } from '@/lib/pricing/order-calculator'
import type { RegularItemInput, ComboDealInput, CouponInput, OrderCalculationResult } from '@/lib/pricing/order-calculator'
import type { Coupon } from '@/types'
import type { ComboDealCartItem } from '@/stores/cart'

// ===== Type definitions =====

export interface SelectedCustomer {
  id: string
  phone: string
  displayName: string | null
  tierId: string
  tierName: string | null
}

export interface DraftRegularItem {
  productId: string
  productName: string
  code: string
  seriesId: string
  seriesName: string
  quantity: number
  retailPrice: number
  tierPrice: number
}

export interface DraftAppliedCoupon {
  userCouponId: string
  coupon: Coupon
  discountAmount: number
}

export type AdminOrderStep = 1 | 2 | 3

// ===== Hook =====

export function useAdminOrderDraft() {
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null)
  const [regularItems, setRegularItems] = useState<DraftRegularItem[]>([])
  const [comboDeals, setComboDeals] = useState<ComboDealCartItem[]>([])
  const [appliedCoupon, setAppliedCoupon] = useState<DraftAppliedCoupon | null>(null)
  const [notes, setNotes] = useState('')
  const [currentStep, setCurrentStep] = useState<AdminOrderStep>(1)

  // 使用 order-calculator 自動計算金額
  const calculation = useMemo((): OrderCalculationResult | null => {
    if (regularItems.length === 0 && comboDeals.length === 0) return null

    const regularInputs: RegularItemInput[] = regularItems.map(item => ({
      retailPrice: item.retailPrice,
      tierPrice: item.tierPrice,
      quantity: item.quantity,
      seriesId: item.seriesId,
    }))

    // 將 ComboDealCartItem（snake_case）映射到 ComboDealInput（camelCase）
    // 注意：ComboDealCartItem 沒有 retail_total 欄位，
    // 在代客下單情境下，由呼叫端在加入時自行計算零售價，
    // 此處以 original_price（等級價總計）作為 retailTotal 的回退值
    const comboDealInputs: ComboDealInput[] = comboDeals.map(deal => ({
      name: deal.combo_deal_name,
      retailTotal: deal.original_price,
      originalPrice: deal.original_price,
      discountedPrice: deal.discounted_price,
      discountAmount: deal.discount_amount,
    }))

    const couponInput: CouponInput | undefined = appliedCoupon
      ? {
          code: appliedCoupon.coupon.code_normalized || appliedCoupon.coupon.code,
          discountType: appliedCoupon.coupon.discount_type,
          discountValue: appliedCoupon.coupon.discount_value,
          minOrderAmount: appliedCoupon.coupon.min_order_amount,
          seriesRestrictions: appliedCoupon.coupon.series_restrictions ?? [],
        }
      : undefined

    return calculateOrderAmounts({
      regularItems: regularInputs,
      comboDeals: comboDealInputs,
      coupon: couponInput,
    })
  }, [regularItems, comboDeals, appliedCoupon])

  // 普通商品操作
  const addRegularItem = useCallback((item: DraftRegularItem) => {
    setRegularItems(prev => {
      const existing = prev.find(i => i.productId === item.productId)
      if (existing) {
        return prev.map(i =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        )
      }
      return [...prev, item]
    })
  }, [])

  const removeRegularItem = useCallback((productId: string) => {
    setRegularItems(prev => prev.filter(i => i.productId !== productId))
  }, [])

  const updateRegularItemQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setRegularItems(prev => prev.filter(i => i.productId !== productId))
      return
    }
    setRegularItems(prev =>
      prev.map(i => i.productId === productId ? { ...i, quantity } : i)
    )
  }, [])

  // 組合優惠操作
  const addComboDeal = useCallback((deal: ComboDealCartItem) => {
    setComboDeals(prev => [...prev, deal])
  }, [])

  const removeComboDeal = useCallback((dealId: string) => {
    setComboDeals(prev => prev.filter(d => d.id !== dealId))
  }, [])

  // 優惠券操作
  const applyCouponFn = useCallback((couponData: DraftAppliedCoupon) => {
    setAppliedCoupon(couponData)
  }, [])

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null)
  }, [])

  // 重置
  const resetDraft = useCallback(() => {
    setSelectedCustomer(null)
    setRegularItems([])
    setComboDeals([])
    setAppliedCoupon(null)
    setNotes('')
    setCurrentStep(1)
  }, [])

  const resetItemsAndCoupon = useCallback(() => {
    setRegularItems([])
    setComboDeals([])
    setAppliedCoupon(null)
    setNotes('')
  }, [])

  const totalItemCount = regularItems.reduce((sum, i) => sum + i.quantity, 0) + comboDeals.length
  const hasItems = regularItems.length > 0 || comboDeals.length > 0

  return {
    selectedCustomer, regularItems, comboDeals, appliedCoupon, notes, currentStep,
    calculation, totalItemCount, hasItems,
    setSelectedCustomer, setNotes, setCurrentStep,
    addRegularItem, removeRegularItem, updateRegularItemQuantity,
    addComboDeal, removeComboDeal,
    applyCoupon: applyCouponFn, removeCoupon,
    resetDraft, resetItemsAndCoupon,
  }
}

export type AdminOrderDraftReturn = ReturnType<typeof useAdminOrderDraft>
