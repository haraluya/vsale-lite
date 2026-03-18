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
        'flex items-center justify-center rounded-theme-sm border-theme font-medium transition-all duration-200',
        'bg-surface shadow-neo-sm',
        'hover:-translate-y-0.5 hover:shadow-theme-hover',
        'active:scale-[0.98] active:translate-y-0',
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
