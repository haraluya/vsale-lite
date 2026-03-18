/**
 * Navbar Component
 * 前台導航列元件 — Clean Commerce 風格
 * - 手機版：僅 Logo + 主題切換
 * - 桌面版：完整功能按鈕
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { CurrentUser } from '@/types'
import { LogOut, ShoppingCart, Package, Ticket, Gift } from 'lucide-react'
import { logout } from '@/lib/actions/auth'
import { useCartStore } from '@/stores/cart'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
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

  const cartItemsCount = useCartStore(state => {
    const normalItemsCount = state.items.reduce(
      (total, item) => total + item.quantity,
      0
    )
    const comboDealItemsCount = state.comboDeals.reduce(
      (sum, deal) =>
        sum + deal.selected_products.reduce((s, p) => s + p.quantity, 0),
      0
    )
    return normalItemsCount + comboDealItemsCount
  })

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: '確認登出',
      description: '確定要登出嗎？',
      variant: 'default'
    })

    if (!confirmed) return

    setLoading(true)

    try {
      await logout()
    } catch (error) {
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        return
      }

      await alert({
        title: '登出失敗',
        message: '登出失敗，請稍後再試',
        variant: 'error'
      })
      setLoading(false)
    }
  }

  const navBtnClass = cn(
    "flex items-center gap-2 rounded-theme-sm border-theme font-medium transition-all duration-200",
    "shadow-neo-sm hover:-translate-y-0.5 hover:shadow-theme-hover",
    "active:scale-[0.98] active:translate-y-0",
    "px-3 py-2 md:px-4",
    "min-h-[44px] min-w-[44px]"
  )

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-surface w-full",
        "border-b shadow-neo-sm"
      )}
      style={{ paddingTop: 'var(--safe-area-top)' }}
    >
      <div className={cn(
        designTokens.container.default,
        "p-3 md:p-4",
        "w-full mx-auto"
      )}>
        <div className="flex h-14 md:h-16 items-center justify-between flex-wrap gap-2">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Logo variant="full" href="/store" className="hidden sm:block" />
            <Logo variant="icon" href="/store" className="block sm:hidden" />
          </div>

          {/* 手機版：僅主題切換 */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
          </div>

          {/* 桌面版：完整功能按鈕 */}
          <div className="hidden md:flex items-center gap-2 md:gap-3">
            {/* 優惠活動按鈕 */}
            <Link
              href="/store/promotions"
              className={navBtnClass}
              style={{ backgroundColor: 'var(--color-nav-promotions)' }}
            >
              <Gift className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">優惠活動</span>
            </Link>

            {/* 我的訂單按鈕 */}
            <Link
              href="/store/orders"
              className={navBtnClass}
              style={{ backgroundColor: 'var(--color-nav-orders)' }}
            >
              <Package className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">我的訂單</span>
            </Link>

            {/* 優惠券按鈕 */}
            <Link
              href="/store/coupons"
              className={navBtnClass}
              style={{ backgroundColor: 'var(--color-nav-coupons)' }}
            >
              <Ticket className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">優惠券</span>
            </Link>

            {/* 購物車按鈕 */}
            <Link
              href="/store/cart"
              className={cn(navBtnClass, "relative")}
              style={{ backgroundColor: 'var(--color-nav-cart)' }}
            >
              <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">購物車</span>
              {cartItemsCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full bg-error font-semibold text-text-inverse border text-xs">
                  {cartItemsCount > 99 ? '99+' : cartItemsCount}
                </span>
              )}
            </Link>

            {/* 主題切換 */}
            <ThemeToggle />

            {/* 登出按鈕 */}
            <button
              onClick={handleLogout}
              disabled={loading}
              className={cn(
                navBtnClass,
                "disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-neo-sm"
              )}
              style={{ backgroundColor: 'var(--color-nav-logout)' }}
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
