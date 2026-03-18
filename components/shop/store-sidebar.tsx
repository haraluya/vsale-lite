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
} from 'lucide-react'
import { logout } from '@/lib/actions/auth'
import { useConfirm, useAlert } from '@/lib/contexts/dialog-context'
import { usePwaInstall } from '@/lib/hooks/use-pwa-install'
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
  { href: '/store/products', label: '商品', icon: Package },
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
  const { canInstall, install } = usePwaInstall()

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
        return // 尚未超過閾值，不做任何事
      }
      // 判斷主要方向
      touchState.current.direction = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical'
    }

    // 如果鎖定為垂直方向，完全不干預（讓內容正常滾動）
    if (touchState.current.direction === 'vertical') {
      return
    }

    // 水平方向：只允許向右滑（關閉方向）
    if (deltaX > 0) {
      e.preventDefault() // 阻止瀏覽器預設行為
      touchState.current.isDragging = true
      touchState.current.currentX = touch.clientX

      // 直接設定 transform，不經過 state 以獲得最流暢的動畫
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
    const velocity = deltaX / elapsed // px/ms

    // 判斷是否觸發關閉：距離超過閾值 或 速度夠快
    if (deltaX > SWIPE_CLOSE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      // 滑出動畫
      panelRef.current.style.transition = 'transform 200ms ease-out'
      panelRef.current.style.transform = 'translateX(100%)'
      // 動畫結束後關閉
      setTimeout(() => {
        resetPanelPosition()
        onClose()
      }, 200)
    } else {
      // 回彈動畫
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
          'fixed inset-0 bg-black/50 z-50 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 面板 */}
      <aside
        ref={panelRef}
        className={cn(
          'fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-surface border-l z-50',
          'transform transition-transform duration-300 ease-out',
          'flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-label="側邊選單"
        role="dialog"
        aria-modal="true"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 頂部：用戶資訊 + 關閉按鈕 */}
        <div className="p-4 border-b">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-base truncate">{userName} 您好！</p>
              <p className="text-sm text-text-secondary mt-0.5">{userPhone}</p>
              <p className="text-sm text-text-secondary mt-0.5">
                會員等級: <span className="font-semibold text-foreground">{tierName}</span>
              </p>
              {unusedCouponCount > 0 && (
                <button
                  onClick={() => handleNavClick('/store/coupons')}
                  className="flex items-center gap-1 text-sm text-warning-border font-medium mt-1"
                >
                  <Ticket className="h-3.5 w-3.5" />
                  優惠券 ({unusedCouponCount})
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 -mt-1"
              aria-label="關閉選單"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 導覽群組 */}
        <nav className="flex-1 overflow-y-auto py-2 overscroll-contain">
          <div className="px-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href, item.exact)
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2.5 rounded-theme-sm text-sm font-medium',
                    'transition-colors duration-150 min-h-[44px]',
                    active
                      ? 'bg-primary text-text-inverse'
                      : 'text-foreground hover:bg-muted/20'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {item.label}
                </button>
              )
            })}
          </div>

          {/* 分類群組 */}
          {categories.length > 0 && (
            <div className="mt-3 pt-3 border-t px-2">
              <p className="px-3 py-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                分類導覽
              </p>
              <button
                onClick={() => handleNavClick('/store/products')}
                className={cn(
                  'flex items-center w-full px-3 py-2 rounded-theme-sm text-sm',
                  'transition-colors duration-150 min-h-[40px]',
                  pathname === '/store/products' && !new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').has('category')
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-muted/20'
                )}
              >
                全部
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={cn(
                    'flex items-center w-full px-3 py-2 rounded-theme-sm text-sm',
                    'transition-colors duration-150 min-h-[40px]',
                    'text-foreground hover:bg-muted/20'
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* 底部固定：安裝 APP + 深色模式 + 登出 */}
        <div className="border-t p-3 flex items-center gap-2">
          {canInstall && (
            <button
              onClick={install}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-theme-sm',
                'bg-primary text-text-inverse min-h-[40px]',
                'transition-all duration-200'
              )}
            >
              <Download className="h-4 w-4" />
              安裝APP
            </button>
          )}
          <ThemeToggle className="min-h-[40px] min-w-[40px]" />
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-theme-sm ml-auto',
              'border-theme min-h-[40px]',
              'text-foreground hover:bg-muted/20 transition-colors duration-150'
            )}
          >
            <LogOut className="h-4 w-4" />
            登出
          </button>
        </div>
      </aside>
    </>
  )
}
