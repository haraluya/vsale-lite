'use client'

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
  Ticket,
  Gift,
  Megaphone,
  UserCog,
  FileText,
  Settings,
  type LucideIcon
} from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { LogoutButton } from '@/components/admin/logout-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'

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
    title: '訂單與行銷',
    items: [
      { label: '訂單管理', href: '/admin/orders', icon: ShoppingBag },
      { label: '優惠券管理', href: '/admin/coupons', icon: Ticket },
      { label: '組合優惠', href: '/admin/combo-deals', icon: Gift },
      { label: '廣告管理', href: '/admin/announcements', icon: Megaphone },
    ],
  },
  {
    title: '系統設定',
    items: [
      { label: '成員管理', href: '/admin/system/members', icon: UserCog },
      { label: '操作日誌', href: '/admin/system/audit-logs', icon: FileText },
      { label: '系統設定', href: '/admin/system/settings', icon: Settings },
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
    <aside className="hidden md:flex md:w-16 lg:w-64 border-r-2 md:border-r-3 bg-surface flex-col fixed top-0 left-0 h-screen overflow-y-auto">
      {/* Logo */}
      <div className="mb-6 md:mb-8 p-3 md:p-4 lg:p-6">
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
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-3 md:space-y-4 lg:space-y-6 px-3 md:px-4 lg:px-6 pb-6">
        {navSections.map((section, sectionIndex) => (
          <div key={section.title}>
            {sectionIndex > 0 && (
              <div className="mb-3 md:mb-4 border-t-2 border-surface-secondary" />
            )}

            <h3 className="hidden lg:block mb-2 px-2 text-xs font-bold uppercase tracking-wider text-muted">
              {section.title}
            </h3>

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
                      'md:w-12 md:h-12 md:justify-center md:p-0',
                      'lg:w-auto lg:h-auto lg:justify-start lg:gap-3 lg:px-4 lg:py-2.5',
                      isActive
                        ? 'border-primary bg-primary text-text-inverse shadow-none translate-x-[2px] translate-y-[2px]'
                        : 'bg-surface shadow-neo-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="hidden lg:inline text-sm">{item.label}</span>
                  </Link>
                )
              })}

              {section.title === '帳戶' && (
                <div className="space-y-2">
                  <div className="flex justify-center lg:justify-start">
                    <ThemeToggle />
                  </div>
                  <LogoutButton />
                </div>
              )}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
