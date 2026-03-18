/**
 * InstallPrompt Component
 * 底部浮動安裝提示 — 所有平台都可見
 * - 已安裝（standalone 模式）不顯示
 * - 取消後 7 天內不再顯示
 * - 支援 beforeinstallprompt 的瀏覽器直接安裝，否則導向教學頁
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Download, X } from 'lucide-react'
import { usePwaInstall } from '@/lib/hooks/use-pwa-install'
import { cn } from '@/lib/utils'

const DISMISSED_KEY = 'vsale-install-dismissed-at'
const DISMISS_DAYS = 7

function isDismissedRecently(): boolean {
  if (typeof window === 'undefined') return true
  const dismissedAt = localStorage.getItem(DISMISSED_KEY)
  if (!dismissedAt) return false
  const elapsed = Date.now() - parseInt(dismissedAt, 10)
  return elapsed < DISMISS_DAYS * 24 * 60 * 60 * 1000
}

export function InstallPrompt() {
  const router = useRouter()
  const { canInstall, install, isInstalled } = usePwaInstall()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // 已安裝或 standalone 模式不顯示
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true

    if (isStandalone || isInstalled) {
      setVisible(false)
      return
    }

    // 7 天內取消過不顯示
    if (isDismissedRecently()) {
      setVisible(false)
      return
    }

    // 延遲 1.5 秒顯示，避免干擾首次載入
    const timer = setTimeout(() => setVisible(true), 1500)
    return () => clearTimeout(timer)
  }, [isInstalled])

  const handleInstall = async () => {
    if (canInstall) {
      // 支援 beforeinstallprompt 的瀏覽器直接安裝
      const result = await install()
      if (result) {
        setVisible(false)
        return
      }
    }
    // 其他情況導向教學頁
    setVisible(false)
    router.push('/store/install')
  }

  const handleDismiss = () => {
    setVisible(false)
    localStorage.setItem(DISMISSED_KEY, Date.now().toString())
  }

  if (!visible) return null

  return (
    <div
      className={cn(
        'fixed bottom-[72px] md:bottom-4 left-0 right-0 z-40 mx-4 md:mx-auto md:max-w-md',
        'animate-in slide-in-from-bottom-4 fade-in duration-300'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 rounded-theme border bg-surface px-4 py-3',
          'shadow-neo-sm'
        )}
      >
        <div className="w-10 h-10 rounded-theme-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Download className="h-5 w-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">
            安裝到主畫面
          </p>
          <p className="text-xs text-text-secondary">
            像 APP 一樣快速開啟
          </p>
        </div>

        <button
          onClick={handleInstall}
          className={cn(
            'shrink-0 rounded-theme-sm border-theme bg-primary px-3 py-1.5',
            'text-sm font-bold text-text-inverse shadow-neo-sm',
            'transition-all hover:-translate-y-0.5 hover:shadow-theme-hover',
            'active:scale-[0.98] min-h-[36px]'
          )}
        >
          {canInstall ? '安裝' : '查看'}
        </button>

        <button
          onClick={handleDismiss}
          className="shrink-0 p-1.5 text-muted hover:text-foreground transition-colors"
          aria-label="關閉安裝提示"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
