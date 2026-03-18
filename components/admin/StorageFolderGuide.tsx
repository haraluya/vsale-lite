'use client'

/**
 * Supabase Storage 圖片資料夾結構指引
 * 顯示所有 Bucket 的資料夾結構，方便手動上傳圖片
 */

export function StorageFolderGuide() {
  return (
    <div className="rounded-theme-sm border bg-amber-50 p-6 shadow-neo-sm md:border md:shadow-neo">
      <h3 className="mb-4 text-xl font-bold">📁 Supabase Storage 圖片資料夾結構</h3>

      <div className="space-y-6">
        {/* 商品圖片 */}
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-lg font-bold">
            <span className="text-2xl">🛍️</span>
            <span>商品圖片</span>
          </h4>
          <p className="mb-2 text-sm text-text-secondary">
            Bucket: <code className="rounded bg-surface px-2 py-1 font-mono text-xs">products</code>
          </p>
          <pre className="overflow-x-auto rounded-theme-sm border bg-surface p-4 text-sm">
{`products/
├── {product_id_1}/
│   └── main.{ext}      (商品主圖，ext: jpg/png/webp)
├── {product_id_2}/
│   └── main.{ext}
└── ...`}
          </pre>
        </div>

        {/* 系統圖片 */}
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-lg font-bold">
            <span className="text-2xl">🎨</span>
            <span>系統圖片</span>
          </h4>
          <p className="mb-2 text-sm text-text-secondary">
            Bucket: <code className="rounded bg-surface px-2 py-1 font-mono text-xs">public</code>
          </p>
          <pre className="overflow-x-auto rounded-theme-sm border bg-surface p-4 text-sm">
{`public/
├── logo.{ext}          (完整版 Logo 200×60)
├── logo-icon.{ext}     (圖示版 Logo 60×60)
└── favicon.{ext}       (Favicon 60×60)`}
          </pre>
        </div>

        {/* 公告圖片 */}
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-lg font-bold">
            <span className="text-2xl">📢</span>
            <span>公告圖片</span>
          </h4>
          <p className="mb-2 text-sm text-text-secondary">
            Bucket: <code className="rounded bg-surface px-2 py-1 font-mono text-xs">announcements</code>
          </p>
          <pre className="overflow-x-auto rounded-theme-sm border bg-surface p-4 text-sm">
{`announcements/
├── {announcement_id_1}.{ext}
├── {announcement_id_2}.{ext}
└── ...`}
          </pre>
        </div>
      </div>

      {/* 手動上傳指引 */}
      <div className="mt-6 rounded-theme-sm border border-blue-600 bg-info-bg p-4">
        <h4 className="mb-2 font-bold text-blue-900">💡 手動上傳指引</h4>
        <ol className="list-inside list-decimal space-y-1 text-sm text-blue-900">
          <li>前往 Supabase Dashboard → Storage</li>
          <li>選擇對應的 Bucket（products / public / announcements）</li>
          <li>上傳圖片到正確的資料夾路徑</li>
          <li>確認圖片 URL 與資料庫記錄一致</li>
        </ol>
      </div>
    </div>
  )
}
