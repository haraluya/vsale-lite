'use client'

import { Download, Check } from 'lucide-react'
import { usePwaInstall } from '@/lib/hooks/use-pwa-install'

interface LoginPwaPromptProps {
  variant: 'brand-panel' | 'form-section'
}

export function LoginPwaPrompt({ variant }: LoginPwaPromptProps) {
  const { canInstall, install, isInstalled } = usePwaInstall()

  if (!canInstall && !isInstalled) return null

  if (variant === 'brand-panel') {
    return (
      <div className="mt-8 rounded-theme-sm border border-white/20 bg-white/15 backdrop-blur-sm p-4">
        {isInstalled ? (
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-white" />
            <span className="text-sm font-bold text-white">已安裝為應用程式</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-white flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-white">安裝成 APP</p>
              <p className="text-xs text-white/80">享受更快速的使用體驗</p>
            </div>
            <button
              onClick={install}
              className="shrink-0 rounded-theme-sm border border-white/30 bg-white/20 px-3 py-1.5 text-sm font-bold text-white transition-all hover:bg-white/30 active:scale-[0.98]"
            >
              立即安裝
            </button>
          </div>
        )}
      </div>
    )
  }

  // variant === 'form-section'
  return (
    <div className="mt-6 rounded-theme-sm border-theme bg-surface-secondary p-4">
      {isInstalled ? (
        <div className="flex items-center gap-3">
          <Check className="h-5 w-5 text-green-600" />
          <span className="text-sm font-bold text-foreground">已安裝為應用程式</span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Download className="h-5 w-5 text-foreground flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">安裝成 APP</p>
            <p className="text-xs text-text-secondary">享受更快速的使用體驗</p>
          </div>
          <button
            onClick={install}
            className="shrink-0 rounded-theme-sm border-theme bg-surface px-3 py-1.5 text-sm font-bold text-foreground shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover active:scale-[0.98]"
          >
            立即安裝
          </button>
        </div>
      )}
    </div>
  )
}
