'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { usePwaInstall } from '@/lib/hooks/use-pwa-install'

const DISMISSED_KEY = 'vsale-install-dismissed'

export function InstallPrompt() {
  const { canInstall, install } = usePwaInstall()
  const [isDismissed, setIsDismissed] = useState(true)

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY)
    if (!dismissed) {
      setIsDismissed(false)
    }
  }, [])

  const handleInstall = async () => {
    await install()
    handleDismiss()
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem(DISMISSED_KEY, 'true')
  }

  if (isDismissed || !canInstall) return null

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 mx-4 mb-2 md:mx-auto md:max-w-md">
      <div className="flex items-center gap-3 rounded-theme-sm border bg-primary px-4 py-3 shadow-neo-sm md:border md:shadow-neo">
        <Download className="h-5 w-5 shrink-0 text-primary-foreground" />

        <div className="flex-1">
          <p className="text-sm font-bold text-primary-foreground">
            安裝 Vsale 到主畫面
          </p>
          <p className="text-xs text-primary-foreground/80">
            更快速的存取體驗
          </p>
        </div>

        <button
          onClick={handleInstall}
          className="shrink-0 rounded-theme-sm border bg-surface px-3 py-1.5 text-sm font-bold text-foreground shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover"
        >
          安裝
        </button>

        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 text-primary-foreground/80 hover:text-primary-foreground"
          aria-label="關閉安裝提示"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
