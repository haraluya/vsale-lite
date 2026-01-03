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
      className="flex w-full items-center gap-3 rounded-none border-3 border-black bg-red-500 px-4 py-3 font-bold text-white transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo-sm disabled:opacity-50"
    >
      <LogOut className="h-5 w-5" />
      <span>{loading ? '登出中...' : '登出'}</span>
    </button>
  )
}
