'use client'

import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md rounded-none border-2 border-black bg-surface p-8 shadow-neo-sm md:border-3 md:shadow-neo">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-none border-2 border-black bg-warning-bg md:border-3">
            <WifiOff className="h-10 w-10 text-foreground" />
          </div>

          <h1 className="mb-2 text-2xl font-bold text-foreground">
            您目前處於離線狀態
          </h1>

          <p className="mb-8 text-muted-foreground">
            請檢查您的網路連線後再試一次。部分已快取的內容仍可瀏覽。
          </p>

          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-none border-2 border-black bg-primary px-6 py-3 font-bold text-primary-foreground shadow-neo-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none md:border-3 md:shadow-neo"
          >
            <RefreshCw className="h-5 w-5" />
            重新連線
          </button>
        </div>
      </div>
    </div>
  )
}
