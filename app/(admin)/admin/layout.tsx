/**
 * Admin Layout
 * Feature: 001-user-tier-management (US8)
 * Updated: Feature 006-ux-enhancement (US5 - 側邊欄視覺分類)
 *
 * 管理後台共用布局
 * - 側邊欄導航（視覺分類，含底部登出按鈕）
 */

import { Sidebar } from '@/components/admin/sidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar (含登出按鈕) */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
