'use client'

import { logout } from '@/lib/actions/auth'
import { LogOut } from 'lucide-react'
import { useState } from 'react'

interface LogoutButtonProps {
  variant?: 'sidebar' | 'mobile'
}

export function LogoutButton({ variant = 'sidebar' }: LogoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await logout() // logout 函數會自動根據角色導向對應的登入頁
      // 注意：logout() 會執行 redirect()，所以這裡不會執行到
    } catch (error) {
      // 檢查是否為 Next.js 的 redirect 錯誤（正常登出流程）
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        // 這是正常的登出流程，不需要處理
        return
      }
      // 其他錯誤才記錄
      console.error('登出失敗:', error)
      setLoading(false)
    }
  }

  if (variant === 'mobile') {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        title={loading ? '登出中...' : '登出'}
        className="flex w-full items-center gap-3 rounded-theme-sm border bg-error px-4 py-2.5 text-sm font-bold text-white shadow-neo-sm transition-all active:scale-[0.98] disabled:opacity-50"
      >
        <LogOut className="h-5 w-5 flex-shrink-0" />
        <span>{loading ? '登出中...' : '登出'}</span>
      </button>
    )
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      title={loading ? '登出中...' : '登出'}
      className="flex w-full items-center rounded-theme-sm border bg-error font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-theme-hover shadow-neo-sm disabled:opacity-50 md:justify-center md:w-12 md:h-12 md:p-0 lg:w-full lg:h-auto lg:justify-start lg:gap-3 lg:px-4 lg:py-3"
    >
      <LogOut className="h-5 w-5 flex-shrink-0" />
      <span className="hidden lg:inline">{loading ? '登出中...' : '登出'}</span>
    </button>
  )
}
