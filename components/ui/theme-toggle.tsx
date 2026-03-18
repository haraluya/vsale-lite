'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/contexts/theme-context'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'flex items-center justify-center rounded-none border-2 md:border-3 font-bold transition-all',
        'bg-surface shadow-neo-sm md:shadow-neo',
        'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
        'min-h-[44px] min-w-[44px] p-2',
        className
      )}
      aria-label={theme === 'dark' ? '切換為亮色模式' : '切換為深色模式'}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  )
}
