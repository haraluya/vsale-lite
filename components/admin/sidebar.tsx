'use client'

/**
 * 後台側邊欄元件
 * Feature: 006-ux-enhancement (US5)
 *
 * 視覺分類導航
 * - 功能模組分組（分隔線與標題）
 * - 當前頁面高亮顯示
 * - Neo-Brutalism 設計風格
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Tag,
  FolderTree,
  Package,
  Layers,
  DollarSign,
  ShoppingBag,
  Megaphone,
  UserCog,
  type LucideIcon
} from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { LogoutButton } from '@/components/admin/logout-button'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

type NavSection = {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: '總覽',
    items: [
      { label: '儀表板', href: '/admin/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: '客戶管理',
    items: [
      { label: '會員等級', href: '/admin/tiers', icon: Tag },
      { label: '客戶管理', href: '/admin/clients', icon: Users },
    ],
  },
  {
    title: '商品管理',
    items: [
      { label: '分類管理', href: '/admin/categories', icon: FolderTree },
      { label: '系列管理', href: '/admin/series', icon: Layers },
      { label: '商品管理', href: '/admin/products', icon: Package },
      { label: '價格管理', href: '/admin/pricing', icon: DollarSign },
    ],
  },
  {
    title: '訂單與廣告',
    items: [
      { label: '訂單管理', href: '/admin/orders', icon: ShoppingBag },
      { label: '廣告管理', href: '/admin/announcements', icon: Megaphone },
    ],
  },
  {
    title: '系統設定',
    items: [
      { label: '成員管理', href: '/admin/system/members', icon: UserCog },
    ],
  },
  {
    title: '帳戶',
    items: [],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:w-16 lg:w-64 border-r-2 md:border-r-3 border-black bg-white p-3 md:p-4 lg:p-6 flex-col min-h-screen">
      {/* Logo - 平板顯示 icon / 桌面顯示 full */}
      <div className="mb-6 md:mb-8">
        <div className="md:flex md:justify-center lg:block">
          <Logo
            variant="icon"
            href="/admin/dashboard"
            className="hidden md:block lg:hidden"
          />
          <Logo
            variant="full"
            href="/admin/dashboard"
            className="hidden lg:block"
          />
        </div>
        <p className="hidden lg:block text-sm text-gray-600 mt-2">管理後台</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-3 md:space-y-4 lg:space-y-6">
        {navSections.map((section, sectionIndex) => (
          <div key={section.title}>
            {/* 分隔線（除了第一個區塊） */}
            {sectionIndex > 0 && (
              <div className="mb-3 md:mb-4 border-t-2 border-gray-300" />
            )}

            {/* 區塊標題 - 桌面版顯示 */}
            <h3 className="hidden lg:block mb-2 px-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              {section.title}
            </h3>

            {/* 導航項目 */}
            <div className="space-y-1 md:space-y-2">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={cn(
                      'flex items-center rounded-none border-2 font-bold transition-all',
                      // 平板版: 正方形圖示按鈕 (w-12 h-12)
                      'md:w-12 md:h-12 md:justify-center md:p-0',
                      // 桌面版: 完整按鈕
                      'lg:w-auto lg:h-auto lg:justify-start lg:gap-3 lg:px-4 lg:py-2.5',
                      isActive
                        ? 'border-black bg-brand-primary text-white shadow-none translate-x-[2px] translate-y-[2px]'
                        : 'border-black bg-white text-black shadow-neo-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="hidden lg:inline text-sm">{item.label}</span>
                  </Link>
                )
              })}

              {/* 登出按鈕 - 放在帳戶區塊內 */}
              {section.title === '帳戶' && (
                <LogoutButton />
              )}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
