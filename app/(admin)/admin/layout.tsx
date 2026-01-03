/**
 * Admin Layout
 * Feature: 001-user-tier-management (US8)
 * Updated: Feature 006-ux-enhancement (US5 - 側邊欄視覺分類)
 *
 * 管理後台共用布局
 * - 側邊欄導航（視覺分類）
 * - 登出按鈕
 */

import { Sidebar } from '@/components/admin/sidebar'
import { LogoutButton } from '@/components/admin/logout-button'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header (with logout button) */}
        <header className="border-b-3 border-black bg-white p-4">
          <div className="flex justify-end">
            <LogoutButton />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
