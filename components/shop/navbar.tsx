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

import { useState } from 'react'
import Link from 'next/link'
import type { CurrentUser } from '@/types'
import { LogOut, User, ShoppingCart, Package } from 'lucide-react'
import { useCartStore } from '@/stores/cart'
import { Logo } from '@/components/ui/logo'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface NavbarProps {
  user: CurrentUser
}

export function Navbar({ user }: NavbarProps) {
  const [loading, setLoading] = useState(false)
  const { getTotalItems } = useCartStore()
  const cartItemsCount = getTotalItems()

  const handleLogout = async () => {
    if (!confirm('確定要登出嗎?')) return

    setLoading(true)

    try {
      // 移除 shop.ts 的 logout，改用統一的 auth.ts logout
      // logout 函數會自動根據角色導向對應的登入頁
      const authLogout = await import('@/lib/actions/auth').then(m => m.logout)
      await authLogout()
    } catch (error) {
      alert('登出失敗，請稍後再試')
      setLoading(false)
    }
  }

  return (
    <nav className={cn(
      "sticky top-0 z-50 bg-white",
      designTokens.neoBrutalism.border.mobile,
      "md:border-b-3",
      "border-b-black",
      designTokens.neoBrutalism.shadow.mobile,
      "md:shadow-neo"
    )}>
      <div className={cn(
        designTokens.container.default,
        "p-3 md:p-4"
      )}>
        <div className="flex h-14 md:h-16 items-center justify-between">
          {/* Logo / 品牌 */}
          <div className="flex items-center gap-4">
            <Logo variant="full" href="/store" className="hidden sm:block" />
            <Logo variant="icon" href="/store" className="block sm:hidden" />
            <span className="hidden text-sm text-gray-600 lg:block">批發訂貨系統</span>
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
