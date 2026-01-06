'use client'

/**
 * 優惠券輸入口令元件 (Foodpanda 風格 + Neo-Brutalism)
 *
 * @feature 009-coupon-system
 * @date 2026-01-07
 */

import { useState } from 'react'
import { claimCoupon } from '@/lib/actions/coupons'
import { toast } from 'sonner'

interface CouponCodeInputProps {
  onClaimSuccess?: () => void
}

/**
 * 優惠券輸入口令元件
 *
 * 特色：
 * - Foodpanda 風格設計（大觸控按鈕、醒目色彩）
 * - 自動轉大寫（使用者輸入時即時轉換）
 * - 即時驗證（輸入完成後自動觸發領取）
 * - Neo-Brutalism 樣式（黑邊框、硬邊陰影）
 */
export function CouponCodeInput({ onClaimSuccess }: CouponCodeInputProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  /**
   * 處理優惠券領取
   */
  const handleClaim = async () => {
    if (!code.trim()) {
      toast.error('請輸入優惠券代碼')
      return
    }

    setLoading(true)

    try {
      const result = await claimCoupon({ couponCode: code.trim() })

      if (result.success) {
        toast.success(result.message || '優惠券領取成功！')
        setCode('')
        onClaimSuccess?.()
      } else {
        toast.error(result.message || '領取失敗，請稍後再試')
      }
    } catch (error) {
      console.error('領取優惠券錯誤:', error)
      toast.error('領取優惠券時發生錯誤')
    } finally {
      setLoading(false)
    }
  }

  /**
   * 處理輸入變更（自動轉大寫）
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase()
    setCode(value)
  }

  /**
   * 處理按下 Enter 鍵
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleClaim()
    }
  }

  return (
    <div className="border-2 md:border-3 border-black shadow-neo-sm md:shadow-neo bg-white p-4 md:p-6">
      <div className="mb-3">
        <h3 className="text-base md:text-lg font-black">輸入優惠券代碼</h3>
        <p className="text-xs md:text-sm text-gray-600 mt-1">
          輸入口令即可領取優惠券
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="例如：WELCOME100"
          className="flex-1 px-4 py-3 md:py-4 border-2 border-black text-base md:text-lg
                     font-bold placeholder:text-gray-400 placeholder:font-normal
                     focus:outline-none focus:ring-2 focus:ring-offset-2
                     focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed"
          disabled={loading}
          maxLength={20}
        />
        <button
          onClick={handleClaim}
          disabled={loading || !code.trim()}
          className="px-6 md:px-8 py-3 md:py-4 bg-orange-400 text-black font-black
                     border-2 border-black shadow-neo-sm hover:translate-x-[2px]
                     hover:translate-y-[2px] hover:shadow-none transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed
                     disabled:hover:translate-x-0 disabled:hover:translate-y-0
                     disabled:hover:shadow-neo-sm text-sm md:text-base
                     whitespace-nowrap"
        >
          {loading ? '領取中...' : '領取'}
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        提示：輸入時會自動轉換為大寫，不用擔心大小寫問題
      </div>
    </div>
  )
}
