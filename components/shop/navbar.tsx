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
    <nav className="sticky top-0 z-50 border-b-3 border-black bg-white shadow-neo">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / 品牌 */}
          <div className="flex items-center gap-4">
            <Logo variant="full" className="hidden sm:block" />
            <Logo variant="icon" className="block sm:hidden" />
            <span className="hidden text-sm text-gray-600 lg:block">批發訂貨系統</span>
          </div>

          {/* 用戶資訊與登出 */}
          <div className="flex items-center gap-4">
            {/* 用戶資訊 */}
            <div className="hidden items-center gap-2 rounded-none border-2 border-black bg-blue-50 px-4 py-2 md:flex">
              <User className="h-5 w-5" />
              <div className="text-sm">
                <p className="font-bold">{user.phone || user.email}</p>
                {user.tier_name && (
                  <p className="text-xs text-gray-600">
                    會員等級: <span className="font-bold">{user.tier_name}</span>
                  </p>
                )}
              </div>
            </div>

            {/* 手機版用戶資訊 */}
            <div className="flex items-center gap-2 rounded-none border-2 border-black bg-blue-50 px-3 py-2 md:hidden">
              <User className="h-5 w-5" />
              <div className="text-xs">
                <p className="font-bold">{user.phone || user.email}</p>
                {user.tier_name && (
                  <p className="text-gray-600">{user.tier_name}</p>
                )}
              </div>
            </div>

            {/* 我的訂單按鈕 */}
            <Link
              href="/store/orders"
              className="flex items-center gap-2 rounded-none border-2 border-black bg-yellow-100 px-4 py-2 font-bold shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              <Package className="h-5 w-5" />
              <span className="hidden sm:inline">我的訂單</span>
            </Link>

            {/* 購物車按鈕 */}
            <Link
              href="/store/cart"
              className="relative flex items-center gap-2 rounded-none border-2 border-black bg-green-100 px-4 py-2 font-bold shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="hidden sm:inline">購物車</span>
              {/* 數量徽章 */}
              {cartItemsCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-black bg-red-500 text-xs font-bold text-white">
                  {cartItemsCount > 99 ? '99+' : cartItemsCount}
                </span>
              )}
            </Link>

            {/* 登出按鈕 */}
            <button
              onClick={handleLogout}
              disabled={loading}
              className="flex items-center gap-2 rounded-none border-2 border-black bg-red-300 px-4 py-2 font-bold shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-neo"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline">{loading ? '登出中...' : '登出'}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
