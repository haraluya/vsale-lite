/**
 * Navbar Component
 * Feature: 003-series-and-pricing (US3)
 * Feature: 006-ux-enhancement (US3)
 *
 * 前台導航列元件
 * - 顯示 Logo（可點擊回首頁）
 * - 顯示手機號碼與會員等級
 * - 登出按鈕
 * - 固定置頂（sticky）
 * - Neo-Brutalism 設計風格
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { CurrentUser } from '@/types'
import { LogOut, User, ShoppingCart, Package, Ticket } from 'lucide-react'
import { useCartStore } from '@/stores/cart'
import { Logo } from '@/components/ui/logo'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import { useConfirm, useAlert } from '@/lib/contexts/dialog-context'

interface NavbarProps {
  user: CurrentUser
}

export function Navbar({ user }: NavbarProps) {
  const confirm = useConfirm()
  const alert = useAlert()
  const [loading, setLoading] = useState(false)
  const [cartItemsCount, setCartItemsCount] = useState(0)
  const { getTotalItems } = useCartStore()

  // 修復 Hydration Error：在客戶端載入後才讀取購物車數量
  useEffect(() => {
    setCartItemsCount(getTotalItems())
  }, [getTotalItems])

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: '確認登出',
      description: '確定要登出嗎？',
      variant: 'default'
    })

    if (!confirmed) return

    setLoading(true)

    try {
      // 移除 shop.ts 的 logout，改用統一的 auth.ts logout
      // logout 函數會自動根據角色導向對應的登入頁
      const authLogout = await import('@/lib/actions/auth').then(m => m.logout)
      await authLogout()
      // 注意：logout() 會執行 redirect()，所以這裡不會執行到
      // redirect() 會拋出 NEXT_REDIRECT 錯誤，這是正常行為
    } catch (error) {
      // 檢查是否為 Next.js 的 redirect 錯誤（正常登出流程）
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        // 這是正常的登出流程，不需要顯示錯誤
        return
      }

      // 其他錯誤才顯示錯誤訊息
      await alert({
        title: '登出失敗',
        message: '登出失敗，請稍後再試',
        variant: 'error'
      })
      setLoading(false)
    }
  }

  return (
    <nav className={cn(
      "sticky top-0 z-50 bg-white w-full max-w-full",
      designTokens.neoBrutalism.border.mobile,
      "md:border-b-3",
      "border-b-black",
      designTokens.neoBrutalism.shadow.mobile,
      "md:shadow-neo"
    )}>
      <div className={cn(
        designTokens.container.default,
        "p-3 md:p-4",
        "w-full"
      )}>
        <div className="flex h-14 md:h-16 items-center justify-between flex-wrap gap-2">
          {/* Logo / 品牌 */}
          <div className="flex items-center gap-4">
            <Logo variant="full" href="/store" className="hidden sm:block" />
            <Logo variant="icon" href="/store" className="block sm:hidden" />
          </div>

          {/* 用戶資訊與登出 */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* 用戶資訊 (統一,使用響應式顯示) */}
            <div className={cn(
              "flex items-center gap-2 rounded-none bg-blue-50",
              designTokens.neoBrutalism.border.full,
              "border-black",
              "px-3 py-2 md:px-4"
            )}>
              <User className="h-4 w-4 md:h-5 md:w-5" />
              <div className="text-xs md:text-sm">
                <p className="font-bold">{user.phone || user.email}</p>
                {user.tier_name && (
                  <p className="text-gray-600">
                    <span className="hidden md:inline">會員等級: </span>
                    <span className="font-bold">{user.tier_name}</span>
                  </p>
                )}
              </div>
            </div>

            {/* 我的訂單按鈕 */}
            <Link
              href="/store/orders"
              className={cn(
                "flex items-center gap-2 rounded-none bg-yellow-100 font-bold transition-all",
                designTokens.neoBrutalism.border.full,
                "border-black",
                designTokens.neoBrutalism.shadow.mobile,
                "md:shadow-neo",
                designTokens.neoBrutalism.hover,
                "px-3 py-2 md:px-4",
                "min-h-[44px] min-w-[44px]"  // WCAG 2.1 AA 觸控目標
              )}
            >
              <Package className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">我的訂單</span>
            </Link>

            {/* 優惠券按鈕 */}
            <Link
              href="/store/coupons"
              className={cn(
                "flex items-center gap-2 rounded-none bg-orange-100 font-bold transition-all",
                designTokens.neoBrutalism.border.full,
                "border-black",
                designTokens.neoBrutalism.shadow.mobile,
                "md:shadow-neo",
                designTokens.neoBrutalism.hover,
                "px-3 py-2 md:px-4",
                "min-h-[44px] min-w-[44px]"  // WCAG 2.1 AA 觸控目標
              )}
            >
              <Ticket className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">優惠券</span>
            </Link>

            {/* 購物車按鈕 */}
            <Link
              href="/store/cart"
              className={cn(
                "relative flex items-center gap-2 rounded-none bg-green-100 font-bold transition-all",
                designTokens.neoBrutalism.border.full,
                "border-black",
                designTokens.neoBrutalism.shadow.mobile,
                "md:shadow-neo",
                designTokens.neoBrutalism.hover,
                "px-3 py-2 md:px-4",
                "min-h-[44px] min-w-[44px]"  // WCAG 2.1 AA 觸控目標
              )}
            >
              <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">購物車</span>
              {/* 數量徽章 */}
              {cartItemsCount > 0 && (
                <span className={cn(
                  "absolute -right-2 -top-2 flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full bg-red-500 font-bold text-white",
                  designTokens.neoBrutalism.border.mobile,
                  "border-black",
                  "text-xs"
                )}>
                  {cartItemsCount > 99 ? '99+' : cartItemsCount}
                </span>
              )}
            </Link>

            {/* 登出按鈕 */}
            <button
              onClick={handleLogout}
              disabled={loading}
              className={cn(
                "flex items-center gap-2 rounded-none bg-red-300 font-bold transition-all",
                designTokens.neoBrutalism.border.full,
                "border-black",
                designTokens.neoBrutalism.shadow.mobile,
                "md:shadow-neo",
                designTokens.neoBrutalism.hover,
                "px-3 py-2 md:px-4",
                "min-h-[44px] min-w-[44px]",  // WCAG 2.1 AA 觸控目標
                "disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0",
                "disabled:hover:shadow-neo-sm md:disabled:hover:shadow-neo"
              )}
            >
              <LogOut className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">{loading ? '登出中...' : '登出'}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
