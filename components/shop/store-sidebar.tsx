/**
 * StoreSidebar Component
 * 前台側邊欄 — 右側滑入抽屜
 * 支援滑動手勢收合（方向鎖定，避免上下滾動誤觸）
 */

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  X,
  Home,
  Package,
  Gift,
  ClipboardList,
  Ticket,
  ShoppingCart,
  LogOut,
  Download,
  ChevronRight,
  User,
} from 'lucide-react'
import { logout } from '@/lib/actions/auth'
import { useConfirm, useAlert } from '@/lib/contexts/dialog-context'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'

interface StoreSidebarProps {
  open: boolean
  onClose: () => void
  userName: string
  userPhone: string
  tierName: string
  unusedCouponCount: number
  categories: { id: string; name: string }[]
}

const navItems = [
  { href: '/store', label: '首頁', icon: Home, exact: true },
  { href: '/store/products', label: '所有商品', icon: Package },
  { href: '/store/promotions', label: '優惠活動', icon: Gift },
  { href: '/store/orders', label: '我的訂單', icon: ClipboardList },
  { href: '/store/coupons', label: '優惠券', icon: Ticket },
  { href: '/store/cart', label: '購物車', icon: ShoppingCart },
]

// 方向鎖定閾值（px）— 判斷滑動方向前的最小移動距離
const DIRECTION_LOCK_THRESHOLD = 10
// 觸發關閉的最小水平滑動距離（px）
const SWIPE_CLOSE_THRESHOLD = 80
// 觸發關閉的最小速度（px/ms）
const VELOCITY_THRESHOLD = 0.3

export function StoreSidebar({
  open,
  onClose,
  userName,
  userPhone,
  tierName,
  unusedCouponCount,
  categories,
}: StoreSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const confirm = useConfirm()
  const alert = useAlert()
  const isStandalone = typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true)

  const panelRef = useRef<HTMLDivElement>(null)
  const touchState = useRef<{
    startX: number
    startY: number
    startTime: number
    currentX: number
    direction: 'horizontal' | 'vertical' | null
    isDragging: boolean
  } | null>(null)

  // 鎖定 body 滾動
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // 重置面板位置
  const resetPanelPosition = useCallback(() => {
    if (panelRef.current) {
      panelRef.current.style.transform = ''
      panelRef.current.style.transition = ''
    }
  }, [])

  // 滑動手勢處理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      currentX: touch.clientX,
      direction: null,
      isDragging: false,
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchState.current || !panelRef.current) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - touchState.current.startX
    const deltaY = touch.clientY - touchState.current.startY

    // 方向鎖定：首次移動超過閾值時決定方向
    if (!touchState.current.direction) {
      if (Math.abs(deltaX) < DIRECTION_LOCK_THRESHOLD && Math.abs(deltaY) < DIRECTION_LOCK_THRESHOLD) {
        return
      }
      touchState.current.direction = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical'
    }

    // 如果鎖定為垂直方向，完全不干預（讓內容正常滾動）
    if (touchState.current.direction === 'vertical') {
      return
    }

    // 水平方向：只允許向右滑（關閉方向）
    if (deltaX > 0) {
      e.preventDefault()
      touchState.current.isDragging = true
      touchState.current.currentX = touch.clientX
      panelRef.current.style.transition = 'none'
      panelRef.current.style.transform = `translateX(${deltaX}px)`
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!touchState.current || !panelRef.current) return

    const { startX, startTime, currentX, isDragging, direction } = touchState.current

    if (!isDragging || direction !== 'horizontal') {
      touchState.current = null
      return
    }

    const deltaX = currentX - startX
    const elapsed = Date.now() - startTime
    const velocity = deltaX / elapsed

    if (deltaX > SWIPE_CLOSE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      panelRef.current.style.transition = 'transform 200ms ease-out'
      panelRef.current.style.transform = 'translateX(100%)'
      setTimeout(() => {
        resetPanelPosition()
        onClose()
      }, 200)
    } else {
      panelRef.current.style.transition = 'transform 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      panelRef.current.style.transform = 'translateX(0)'
      setTimeout(resetPanelPosition, 250)
    }

    touchState.current = null
  }, [onClose, resetPanelPosition])

  const handleNavClick = (href: string) => {
    router.push(href)
    onClose()
  }

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/store/products?category=${categoryId}`)
    onClose()
  }

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: '確認登出',
      description: '確定要登出嗎？',
      variant: 'default',
    })
    if (!confirmed) return

    try {
      await logout()
    } catch (error) {
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        return
      }
      await alert({
        title: '登出失敗',
        message: '登出失敗，請稍後再試',
        variant: 'error',
      })
    }
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* 遮罩 */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 面板 — 手機 60vw / 桌面 320px */}
      <aside
        ref={panelRef}
        className={cn(
          'fixed top-0 right-0 h-full z-50',
          'w-[62vw] md:w-80',
          'bg-surface border-l',
          'transform transition-transform duration-300 ease-out',
          'flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ paddingTop: 'var(--safe-area-top)' }}
        aria-label="側邊選單"
        role="dialog"
        aria-modal="true"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* ── 頂部：用戶資訊卡片 ── */}
        <div className="px-4 pt-4 pb-3">
          {/* 關閉按鈕 */}
          <div className="flex justify-end -mr-1 mb-2">
            <button
              onClick={onClose}
              className={cn(
                'flex items-center justify-center rounded-full',
                'min-h-[36px] min-w-[36px]',
                'bg-muted/15 hover:bg-muted/30 transition-colors'
              )}
              aria-label="關閉選單"
            >
              <X className="h-4 w-4 text-text-secondary" />
            </button>
          </div>

          {/* 用戶卡片 */}
          <button
            onClick={() => handleNavClick('/store/account')}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-theme',
              'bg-primary/5 border border-primary/15',
              'transition-colors hover:bg-primary/10',
              'text-left'
            )}
          >
            {/* 頭像 */}
            <div className={cn(
              'flex-shrink-0 w-10 h-10 rounded-full',
              'bg-primary/15 flex items-center justify-center'
            )}>
              <User className="h-5 w-5 text-primary" />
            </div>
            {/* 資訊 */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[15px] truncate leading-tight">{userName}</p>
              <p className="text-xs text-text-secondary mt-0.5 leading-tight">{tierName}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-text-secondary flex-shrink-0" />
          </button>

          {/* 優惠券提示 */}
          {unusedCouponCount > 0 && (
            <button
              onClick={() => handleNavClick('/store/coupons')}
              className={cn(
                'w-full flex items-center gap-2 mt-2 px-3 py-2 rounded-theme-sm',
                'bg-warning/10 border border-warning/20',
                'transition-colors hover:bg-warning/15'
              )}
            >
              <Ticket className="h-4 w-4 text-warning-border flex-shrink-0" />
              <span className="text-[13px] font-semibold text-warning-border">
                {unusedCouponCount} 張優惠券可使用
              </span>
            </button>
          )}
        </div>

        {/* ── 導覽群組 ── */}
        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-1">
          <p className="px-2 pt-2 pb-1.5 text-[11px] font-semibold text-text-secondary/60 tracking-widest">
            功能選單
          </p>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href, item.exact)
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    'group flex items-center gap-3 w-full px-3 py-2.5 rounded-theme-sm',
                    'transition-all duration-150 min-h-[46px]',
                    active
                      ? 'bg-primary text-text-inverse shadow-neo-sm'
                      : 'text-foreground hover:bg-muted/12 active:bg-muted/20'
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-theme-sm flex-shrink-0',
                    'transition-colors duration-150',
                    active
                      ? 'bg-white/20'
                      : 'bg-muted/10 group-hover:bg-muted/18'
                  )}>
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <span className="text-[15px] font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>

          {/* ── 分類群組 ── */}
          {categories.length > 0 && (
            <div className="mt-4 pt-3 border-t">
              <p className="px-2 pb-1.5 text-[11px] font-semibold text-text-secondary/60 tracking-widest">
                商品分類
              </p>
              <div className="space-y-0.5">
                <button
                  onClick={() => handleNavClick('/store/products')}
                  className={cn(
                    'flex items-center w-full px-3 py-2 rounded-theme-sm',
                    'transition-all duration-150 min-h-[42px]',
                    pathname === '/store/products' && !new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').has('category')
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-foreground hover:bg-muted/12 active:bg-muted/20'
                  )}
                >
                  <span className="text-[14px]">全部商品</span>
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={cn(
                      'flex items-center w-full px-3 py-2 rounded-theme-sm',
                      'transition-all duration-150 min-h-[42px]',
                      'text-foreground hover:bg-muted/12 active:bg-muted/20'
                    )}
                  >
                    <span className="text-[14px]">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* ── 底部工具列 ── */}
        <div className="border-t px-3 py-3 space-y-2" style={{ paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 12px)' }}>
          {/* 安裝 APP */}
          {!isStandalone && (
            <button
              onClick={() => handleNavClick('/store/install')}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2.5 rounded-theme-sm',
                'bg-primary text-text-inverse text-[14px] font-semibold',
                'border-theme shadow-neo-sm',
                'transition-all duration-200',
                'hover:-translate-y-0.5 hover:shadow-theme-hover',
                'active:scale-[0.98] min-h-[44px]'
              )}
            >
              <Download className="h-4 w-4" />
              安裝 APP
            </button>
          )}

          {/* 深色模式 + 登出 */}
          <div className="flex items-center gap-2">
            <ThemeToggle className="min-h-[40px] min-w-[40px]" />
            <button
              onClick={handleLogout}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-theme-sm',
                'text-[13px] font-medium text-text-secondary',
                'border border-transparent hover:border-muted/30 hover:bg-muted/10',
                'transition-all duration-150 min-h-[40px]'
              )}
            >
              <LogOut className="h-3.5 w-3.5" />
              登出
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
