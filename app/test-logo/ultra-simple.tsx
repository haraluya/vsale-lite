/**
 * 超級簡單的圖片測試
 * 完全不使用 React state 或 hooks
 */

export function UltraSimpleTest() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-black">超級簡單測試（無 hooks）</h3>

      <div className="space-y-4">
        {/* 測試 1: 純 HTML img 標籤 */}
        <div className="rounded-none border-2 border-gray-300 bg-white p-4">
          <p className="mb-2 text-sm font-bold">測試 1: 純 HTML 圖片（/logo.svg）</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Logo" width="200" height="60" />
        </div>

        {/* 測試 2: 純 HTML img 標籤 */}
        <div className="rounded-none border-2 border-gray-300 bg-white p-4">
          <p className="mb-2 text-sm font-bold">測試 2: 純 HTML 圖片（/logo-icon.svg）</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="Logo Icon" width="60" height="60" />
        </div>

        {/* 測試 3: 使用 style 屬性 */}
        <div className="rounded-none border-2 border-gray-300 bg-white p-4">
          <p className="mb-2 text-sm font-bold">測試 3: 使用 style 屬性</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="Logo"
            style={{ width: '200px', height: '60px', display: 'block' }}
          />
        </div>

        {/* 測試 4: 使用背景圖 */}
        <div className="rounded-none border-2 border-gray-300 bg-white p-4">
          <p className="mb-2 text-sm font-bold">測試 4: 使用背景圖</p>
          <div
            style={{
              width: '200px',
              height: '60px',
              backgroundImage: 'url(/logo.svg)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              border: '1px solid #ccc',
            }}
          />
        </div>
      </div>

      <div className="rounded-none border-2 border-red-500 bg-red-50 p-4">
        <p className="text-sm font-bold text-red-800">如果所有測試都看不到圖片</p>
        <ul className="mt-2 list-disc pl-6 text-xs text-red-700">
          <li>直接訪問: http://localhost:3000/logo.svg</li>
          <li>檢查檔案是否存在: public/logo.svg</li>
          <li>重新啟動開發伺服器: pnpm dev</li>
          <li>檢查 Network 標籤的請求狀態</li>
        </ul>
      </div>
    </div>
  )
}
