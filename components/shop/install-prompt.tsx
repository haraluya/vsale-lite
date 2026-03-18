'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'vsale-install-dismissed'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isDismissed, setIsDismissed] = useState(true)

  useEffect(() => {
    // 檢查是否已被使用者關閉
    const dismissed = localStorage.getItem(DISMISSED_KEY)
    if (dismissed) return

    setIsDismissed(false)

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }

    handleDismiss()
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem(DISMISSED_KEY, 'true')
  }

  if (isDismissed || !deferredPrompt) return null

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 mx-4 mb-2 md:mx-auto md:max-w-md">
      <div className="flex items-center gap-3 rounded-none border-2 border-black bg-primary px-4 py-3 shadow-neo-sm md:border-3 md:shadow-neo">
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
          className="shrink-0 rounded-none border-2 border-black bg-surface px-3 py-1.5 text-sm font-bold text-foreground shadow-neo-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
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
