/**
 * StoreLayoutClient Component
 * Client wrapper 管理 sidebar 開關狀態
 */

'use client'

import { useState } from 'react'
import { Navbar } from '@/components/shop/navbar'
import { StoreSidebar } from '@/components/shop/store-sidebar'
import { BottomNav } from '@/components/shop/bottom-nav'
import { InstallPrompt } from '@/components/shop/install-prompt'

interface StoreLayoutClientProps {
  userName: string
  userPhone: string
  tierName: string
  unusedCouponCount: number
  categories: { id: string; name: string }[]
  children: React.ReactNode
}

export function StoreLayoutClient({
  userName,
  userPhone,
  tierName,
  unusedCouponCount,
  categories,
  children,
}: StoreLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      {/* 導覽列 */}
      <Navbar
        onMenuOpen={() => setSidebarOpen(true)}
        userName={userName}
        tierName={tierName}
      />

      {/* 主要內容 */}
      <div className="pt-[60px] md:pt-[72px]">
        <main className="pt-6 md:pt-8 pb-20 md:pb-0">{children}</main>
      </div>

      {/* 側邊欄 */}
      <StoreSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={userName}
        userPhone={userPhone}
        tierName={tierName}
        unusedCouponCount={unusedCouponCount}
        categories={categories}
      />

      {/* 底部導覽列（僅手機版） */}
      <BottomNav />

      {/* PWA 安裝提示 */}
      <InstallPrompt />
    </>
  )
}
