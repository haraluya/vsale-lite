/**
 * Admin Layout
 * Feature: 001-user-tier-management (US8)
 * Updated: Feature 006-ux-enhancement (US5 - 側邊欄視覺分類)
 * Updated: Feature 005-responsive-ui (響應式導航)
 *
 * 管理後台共用布局
 * - 響應式導航 (手機版 Drawer / 平板版收縮 / 桌面版展開)
 * - 手機版漢堡菜單 (MobileNav)
 * - 平板/桌面版側邊欄 (Sidebar)
 */

import { Sidebar } from '@/components/admin/sidebar'
import { MobileNav } from '@/components/admin/mobile-nav'

// 強制動態渲染，避免預渲染時 workUnitAsyncStorage 未初始化錯誤
export const dynamic = 'force-dynamic'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - 平板/桌面版 (固定在左側) */}
      <Sidebar />

      {/* Main Content - 為固定的 Sidebar 留出空間 */}
      <main className="md:ml-16 lg:ml-64 p-4 md:p-6 lg:p-8">
        {/* Mobile Nav - 手機版漢堡菜單 */}
        <div className="mb-4 md:hidden">
          <MobileNav />
        </div>

        {/* Page Content */}
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
