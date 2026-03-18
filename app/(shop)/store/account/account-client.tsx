'use client'

import { LogOut, Sun, Moon } from 'lucide-react'
import { useConfirm } from '@/lib/contexts/dialog-context'
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
        'border-2 md:border-3 border-black bg-surface shadow-neo-sm md:shadow-neo',
        'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
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

  async function handleLogout() {
    const confirmed = await confirm({
      title: '確認登出',
      description: '您確定要登出嗎？',
      variant: 'danger',
    })

    if (confirmed) {
      await logout()
    }
  }

  return (
    <button
      onClick={handleLogout}
      className={cn(
        'flex items-center justify-center gap-2 w-full',
        'border-2 md:border-3 border-black bg-red-400 text-black shadow-neo-sm md:shadow-neo',
        'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
        'p-4 md:p-5 font-bold transition-all'
      )}
    >
      <LogOut className="w-5 h-5" />
      <span className="text-sm md:text-base">登出</span>
    </button>
  )
}
