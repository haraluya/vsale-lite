'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Package, ShoppingCart, ClipboardList, User } from 'lucide-react'
import { useCartStore } from '@/stores/cart'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/store', label: '首頁', icon: Home, exact: true },
  { href: '/store/products', label: '商品', icon: Package },
  { href: '/store/cart', label: '購物車', icon: ShoppingCart, showBadge: true },
  { href: '/store/orders', label: '訂單', icon: ClipboardList },
  { href: '/store/account', label: '我的', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  const cartItemsCount = useCartStore(state => {
    const normalItemsCount = state.items.reduce(
      (total, item) => total + item.quantity,
      0
    )
    const comboDealItemsCount = state.comboDeals.reduce(
      (sum, deal) =>
        sum + deal.selected_products.reduce((s, p) => s + p.quantity, 0),
      0
    )
    return normalItemsCount + comboDealItemsCount
  })

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 md:hidden',
        'bg-surface border-t-2',
        'shadow-[0_-2px_0_0_var(--color-border)]'
      )}
      style={{ paddingBottom: 'var(--safe-area-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 relative',
                'min-w-[44px] min-h-[44px] px-2',
                'transition-colors',
                isActive
                  ? 'text-primary font-bold'
                  : 'text-muted'
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.showBadge && cartItemsCount > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-text-inverse text-[10px] font-bold border">
                    {cartItemsCount > 99 ? '99+' : cartItemsCount}
                  </span>
                )}
              </div>
              <span className="text-[10px]">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
