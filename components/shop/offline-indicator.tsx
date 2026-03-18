'use client'

import { WifiOff } from 'lucide-react'
import { useNetworkStatus } from '@/lib/hooks/use-network-status'

export function OfflineIndicator() {
  const isOnline = useNetworkStatus()

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 border-b-2 border-black bg-warning-bg px-4 py-2 text-sm font-bold text-foreground md:border-b-3">
      <WifiOff className="h-4 w-4" />
      <span>您目前處於離線狀態，部分功能可能無法使用</span>
    </div>
  )
}
