'use client'

/**
 * 簡單圖片測試
 * 直接測試 <img> 標籤是否可以載入 public 資料夾的檔案
 */

export function SimpleImageTest() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-black">直接圖片測試</h3>

      <div className="space-y-4">
        {/* 測試 1: 使用絕對路徑 */}
        <div className="rounded-none border-2 border-gray-300 bg-white p-4">
          <p className="mb-2 text-sm font-bold">測試 1: /logo.svg</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="Logo Full"
            width={200}
            height={60}
            onError={(e) => {
              console.error('❌ 圖片載入失敗: /logo.svg')
              e.currentTarget.style.border = '2px solid red'
            }}
            onLoad={() => {
              console.log('✅ 圖片載入成功: /logo.svg')
            }}
          />
        </div>

        {/* 測試 2: 使用絕對路徑 */}
        <div className="rounded-none border-2 border-gray-300 bg-white p-4">
          <p className="mb-2 text-sm font-bold">測試 2: /logo-icon.svg</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-icon.svg"
            alt="Logo Icon"
            width={60}
            height={60}
            onError={(e) => {
              console.error('❌ 圖片載入失敗: /logo-icon.svg')
              e.currentTarget.style.border = '2px solid red'
            }}
            onLoad={() => {
              console.log('✅ 圖片載入成功: /logo-icon.svg')
            }}
          />
        </div>

        {/* 測試 3: 使用完整 URL */}
        <div className="rounded-none border-2 border-gray-300 bg-white p-4">
          <p className="mb-2 text-sm font-bold">測試 3: 完整 URL</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="http://localhost:3000/logo.svg"
            alt="Logo Full (完整 URL)"
            width={200}
            height={60}
            onError={(e) => {
              console.error('❌ 圖片載入失敗: http://localhost:3000/logo.svg')
              e.currentTarget.style.border = '2px solid red'
            }}
            onLoad={() => {
              console.log('✅ 圖片載入成功: http://localhost:3000/logo.svg')
            }}
          />
        </div>

        {/* 測試 4: 使用 basePath */}
        <div className="rounded-none border-2 border-gray-300 bg-white p-4">
          <p className="mb-2 text-sm font-bold">測試 4: 使用 Next.js Image</p>
          <p className="text-xs text-gray-500">
            如果此測試失敗，表示 Next.js 靜態檔案服務有問題
          </p>
        </div>
      </div>

      <div className="rounded-none border-2 border-yellow-500 bg-yellow-50 p-4">
        <p className="text-sm font-bold text-yellow-800">提示</p>
        <ul className="mt-2 list-disc pl-6 text-xs text-yellow-700">
          <li>如果所有圖片都顯示紅框，表示圖片無法載入</li>
          <li>檢查 Console 是否有錯誤訊息</li>
          <li>檢查 Network 標籤，看圖片請求的狀態</li>
          <li>直接訪問 http://localhost:3000/logo.svg 測試</li>
        </ul>
      </div>
    </div>
  )
}
