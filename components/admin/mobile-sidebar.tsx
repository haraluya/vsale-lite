'use client'

/**
 * 手機版側邊欄內容
 * Feature: 005-responsive-ui
 *
 * 功能:
 * - 完整導航列表 (與桌面版相同)
 * - 點擊項目後自動關閉 Drawer
 * - Logo + 導航 + 登出按鈕
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
  FileText,
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
      { label: '操作日誌', href: '/admin/system/audit-logs', icon: FileText },
    ],
  },
]

interface MobileSidebarProps {
  onClose: () => void
}

export function MobileSidebar({ onClose }: MobileSidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full bg-white p-6">
      {/* Logo */}
      <div className="mb-6">
        <Logo variant="full" href="/admin/dashboard" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto">
        {navSections.map((section, sectionIndex) => (
          <div key={section.title}>
            {/* 分隔線（除了第一個區塊） */}
            {sectionIndex > 0 && (
              <div className="mb-4 border-t-2 border-gray-300" />
            )}

            {/* 區塊標題 */}
            <h3 className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              {section.title}
            </h3>

            {/* 導航項目 */}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-none border-2 px-4 py-2.5 font-bold transition-all',
                      isActive
                        ? 'border-black bg-brand-primary text-white shadow-none translate-x-[2px] translate-y-[2px]'
                        : 'border-black bg-white text-black shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout Button (底部) */}
      <div className="mt-6 pt-6 border-t-2 border-gray-300">
        <LogoutButton />
      </div>
    </div>
  )
}
