'use client'

import { useState } from 'react'
import { LogOut, Sun, Moon } from 'lucide-react'
import { useConfirm, useAlert } from '@/lib/contexts/dialog-context'
import { useTheme } from '@/lib/contexts/theme-context'
import { logout } from '@/lib/actions/auth'
import { cn } from '@/lib/utils'

/**
 * 主題切換按鈕（帳戶頁面用）
 */
export function AccountThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'flex items-center justify-between w-full',
        'border-theme bg-surface shadow-neo-sm',
        'active:scale-[0.98]',
        'p-4 md:p-5 font-bold transition-all'
      )}
    >
      <div className="flex items-center gap-3">
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 md:w-6 md:h-6" />
        ) : (
          <Moon className="w-5 h-5 md:w-6 md:h-6" />
        )}
        <span className="text-sm md:text-base">
          {theme === 'dark' ? '切換為亮色模式' : '切換為深色模式'}
        </span>
      </div>
      <div className="text-xs md:text-sm text-muted-foreground">
        目前：{theme === 'dark' ? '深色' : '亮色'}
      </div>
    </button>
  )
}

/**
 * 登出按鈕
 */
export function LogoutButton() {
  const confirm = useConfirm()
  const alert = useAlert()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    const confirmed = await confirm({
      title: '確認登出',
      description: '您確定要登出嗎？',
      variant: 'danger',
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
        variant: 'error',
      })
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={cn(
        'flex items-center justify-center gap-2 w-full',
        'border-theme bg-red-400 text-black shadow-neo-sm',
        'active:scale-[0.98]',
        'p-4 md:p-5 font-bold transition-all',
        'disabled:opacity-50'
      )}
    >
      <LogOut className="w-5 h-5" />
      <span className="text-sm md:text-base">{loading ? '登出中...' : '登出'}</span>
    </button>
  )
}
