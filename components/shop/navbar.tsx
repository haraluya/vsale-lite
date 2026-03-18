/**
 * Navbar Component
 * 前台導航列 — 精簡版
 * - 手機版：Logo + 漢堡選單（購物車在底部導覽列）
 * - 桌面版：Logo + 歡迎詞 + 購物車 + 漢堡選單
 */

'use client'

import Link from 'next/link'
import { ShoppingCart, Menu } from 'lucide-react'
import { useCartStore } from '@/stores/cart'
import { Logo } from '@/components/ui/logo'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface NavbarProps {
  onMenuOpen: () => void
  userName: string
  tierName: string
}

export function Navbar({ onMenuOpen, userName, tierName }: NavbarProps) {
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
        'fixed top-0 left-0 right-0 z-40 bg-surface w-full',
        'border-b shadow-neo-sm'
      )}
      style={{ paddingTop: 'var(--safe-area-top)' }}
    >
      <div className={cn(
        designTokens.container.default,
        'px-3 md:px-4',
        'w-full mx-auto'
      )}>
        <div className="flex h-[52px] md:h-[60px] items-center justify-between gap-2">
          {/* Logo */}
          <div className="flex items-center">
            <Logo variant="full" href="/store" className="hidden sm:block" />
            <Logo variant="icon" href="/store" className="block sm:hidden" />
          </div>

          {/* 右側按鈕群組 */}
          <div className="flex items-center gap-1.5 md:gap-2">
            {/* 桌面版歡迎詞 */}
            <span className="hidden md:inline text-sm text-text-secondary mr-2">
              {userName} 您好！<span className="text-foreground font-medium">{tierName}</span>
            </span>

            {/* 購物車（僅桌面版，手機版有底部導覽列） */}
            <Link
              href="/store/cart"
              className={cn(
                'relative hidden md:flex items-center justify-center',
                'min-h-[44px] min-w-[44px] rounded-theme-sm',
                'transition-all duration-200',
                'hover:bg-muted/20 active:scale-[0.95]'
              )}
              aria-label={`購物車${cartItemsCount > 0 ? `，${cartItemsCount} 件商品` : ''}`}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemsCount > 0 && (
                <span className="absolute top-1 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-error font-semibold text-text-inverse border text-[10px]">
                  {cartItemsCount > 99 ? '99+' : cartItemsCount}
                </span>
              )}
            </Link>

            {/* 漢堡選單 */}
            <button
              onClick={onMenuOpen}
              className={cn(
                'flex items-center justify-center',
                'min-h-[44px] min-w-[44px] rounded-theme-sm',
                'transition-all duration-200',
                'hover:bg-muted/20 active:scale-[0.95]'
              )}
              aria-label="開啟選單"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
