/**
 * Navbar Component
 * Feature: 003-series-and-pricing (US3)
 *
 * 前台導航列元件
 * - 顯示手機號碼與會員等級
 * - 登出按鈕
 * - Neo-Brutalism 設計風格
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logout } from '@/lib/actions/shop'
import type { CurrentUser } from '@/types'
import { LogOut, User } from 'lucide-react'

interface NavbarProps {
  user: CurrentUser
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    if (!confirm('確定要登出嗎?')) return

    setLoading(true)

    try {
      const result = await logout()

      if (result.success) {
        router.push('/login')
        router.refresh()
      } else {
        alert(result.message || '登出失敗')
      }
    } catch (error) {
      alert('登出失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <nav className="border-b-3 border-black bg-white shadow-neo">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / 品牌 */}
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Vsale</h1>
            <span className="hidden text-sm text-gray-600 sm:block">批發訂貨系統</span>
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
