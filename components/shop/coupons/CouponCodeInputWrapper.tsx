'use client'

/**
 * CouponCodeInput Client Wrapper
 *
 * @feature 009-coupon-system
 * @date 2026-01-07
 */

import { CouponCodeInput } from './CouponCodeInput'

export function CouponCodeInputWrapper() {
  const handleClaimSuccess = () => {
    // 重新整理頁面以更新優惠券列表
    window.location.reload()
  }

  return <CouponCodeInput onClaimSuccess={handleClaimSuccess} />
}
