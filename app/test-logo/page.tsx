/**
 * Logo 元件測試頁面
 * 用於診斷 Logo 顯示問題
 */

import { Logo } from '@/components/ui/logo'
import { DebugLogo } from './debug-logo'
import { SimpleImageTest } from './simple-test'

export default function TestLogoPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-black mb-8">Logo 元件測試</h1>

      {/* 簡單圖片測試 */}
      <div className="mb-8">
        <h2 className="text-2xl font-black mb-4">簡單圖片測試（直接 &lt;img&gt; 標籤）</h2>
        <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
          <SimpleImageTest />
        </div>
      </div>

      {/* 原始 Logo 元件測試 */}
      <div className="mb-8">
        <h2 className="text-2xl font-black mb-4">原始 Logo 元件</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
            <h3 className="text-lg font-black mb-4">variant=&quot;full&quot;</h3>
            <Logo variant="full" href="#" />
          </div>
          <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
            <h3 className="text-lg font-black mb-4">variant=&quot;icon&quot;</h3>
            <Logo variant="icon" href="#" />
          </div>
        </div>
      </div>

      {/* 除錯版 Logo 元件 */}
      <div className="mb-8">
        <h2 className="text-2xl font-black mb-4">除錯版 Logo 元件（含詳細資訊）</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
            <h3 className="text-lg font-black mb-4">variant=&quot;full&quot;</h3>
            <DebugLogo variant="full" />
          </div>
          <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
            <h3 className="text-lg font-black mb-4">variant=&quot;icon&quot;</h3>
            <DebugLogo variant="icon" />
          </div>
        </div>
      </div>

      {/* 說明 */}
      <div className="rounded-none border-3 border-blue-500 bg-blue-50 p-6 shadow-neo">
        <h2 className="text-xl font-black mb-4 text-blue-800">說明</h2>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li>如果看到橘色圖示，表示 Logo 元件正常運作</li>
          <li>如果看不到圖片，請打開瀏覽器 Console（F12）查看錯誤訊息</li>
          <li>檢查 Network 標籤，看是否有載入 /logo.svg 或 /logo-icon.svg</li>
          <li>檢查是否有呼叫 /api/public-settings API</li>
          <li>除錯版會顯示完整的 API 回應與載入狀態</li>
        </ul>
      </div>
    </div>
  )
}
