'use client'

import { logout } from '@/lib/actions/auth'
import { LogOut } from 'lucide-react'
import { useState } from 'react'

export function LogoutButton() {
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await logout() // logout 函數會自動根據角色導向對應的登入頁
    } catch (error) {
      console.error('登出失敗:', error)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      title={loading ? '登出中...' : '登出'}
      className="flex w-full items-center rounded-none border-2 border-black bg-red-500 font-bold text-white transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo-sm disabled:opacity-50 md:justify-center md:w-12 md:h-12 md:p-0 lg:w-full lg:h-auto lg:justify-start lg:gap-3 lg:px-4 lg:py-3"
    >
      <LogOut className="h-5 w-5 flex-shrink-0" />
      <span className="hidden lg:inline">{loading ? '登出中...' : '登出'}</span>
    </button>
  )
}
