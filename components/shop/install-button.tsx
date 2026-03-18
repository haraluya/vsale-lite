'use client'

import { Download } from 'lucide-react'
import { usePwaInstall } from '@/lib/hooks/use-pwa-install'

export function InstallButton() {
  const { canInstall, install } = usePwaInstall()

  if (!canInstall) return null

  return (
    <button
      onClick={install}
      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-semibold transition-all md:hidden"
      style={{
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-text-inverse)',
        border: `var(--theme-border-width, 2px) solid var(--color-primary)`,
        borderRadius: 'var(--theme-radius-sm, 0px)',
        boxShadow: 'var(--shadow-neo-sm)',
      }}
    >
      <Download className="h-4 w-4" />
      安裝到手機
    </button>
  )
}
