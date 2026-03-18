/**
 * 我的帳戶頁面
 *
 * Server Component，獲取用戶資料並顯示帳戶資訊
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUnusedCouponCount } from '@/lib/actions/shop'
import { User, ShoppingBag, Ticket, Tag, ChevronRight } from 'lucide-react'
import { AccountThemeToggle, LogoutButton } from './account-client'

/**
 * 帳戶頁面內容
 */
async function AccountPageContent() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: profile }, couponCountResult] = await Promise.all([
    supabase
      .from('profiles')
      .select(`
        id,
        phone,
        display_name,
        tier_id,
        tiers (
          name
        )
      `)
      .eq('id', user.id)
      .single(),
    getUnusedCouponCount(user.id),
  ])

  if (!profile) return null

  const displayName = profile.display_name || profile.phone || '未設定'
  const tierName = (profile.tiers as any)?.name || '未設定'
  const unusedCouponCount = couponCountResult.success ? (couponCountResult.data ?? 0) : 0

  const quickLinks = [
    {
      href: '/store/promotions',
      icon: Tag,
      label: '優惠活動',
      color: 'bg-purple-400',
      badge: null,
    },
    {
      href: '/store/coupons',
      icon: Ticket,
      label: '優惠券',
      color: 'bg-orange-400',
      badge: unusedCouponCount > 0 ? unusedCouponCount : null,
    },
    {
      href: '/store/orders',
      icon: ShoppingBag,
      label: '我的訂單',
      color: 'bg-blue-400',
      badge: null,
    },
  ]

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-green-400 border-theme shadow-neo-sm">
          <User className="w-6 h-6 md:w-8 md:h-8" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black">我的帳戶</h1>
          <p className="text-sm md:text-base text-muted-foreground">管理您的帳戶資訊</p>
        </div>
      </div>

      {/* 使用者資訊卡片 */}
      <div className="border-theme bg-surface shadow-neo-sm p-4 md:p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm md:text-base text-muted-foreground">顯示名稱</span>
            <span className="text-sm md:text-base font-bold">{displayName}</span>
          </div>
          <div className="border-t border-border" />
          <div className="flex items-center justify-between">
            <span className="text-sm md:text-base text-muted-foreground">手機號碼</span>
            <span className="text-sm md:text-base font-bold">{profile.phone || '未設定'}</span>
          </div>
          <div className="border-t border-border" />
          <div className="flex items-center justify-between">
            <span className="text-sm md:text-base text-muted-foreground">會員等級</span>
            <span className="text-sm md:text-base font-bold px-3 py-1 bg-yellow-300 border">
              {tierName}
            </span>
          </div>
        </div>
      </div>

      {/* 功能快捷入口 */}
      <div className="space-y-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-between border-theme bg-surface shadow-neo-sm p-4 md:p-5 font-bold transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 ${link.color} border`}>
                <link.icon className="w-5 h-5" />
              </div>
              <span className="text-sm md:text-base">{link.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {link.badge !== null && (
                <span className="px-2 py-0.5 text-xs font-bold bg-red-400 border text-black">
                  {link.badge}
                </span>
              )}
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>

      {/* 主題切換 */}
      <AccountThemeToggle />

      {/* 登出按鈕 */}
      <LogoutButton />
    </div>
  )
}

/**
 * 我的帳戶頁面（Export）
 */
export default function AccountPage() {
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
      <Suspense
        fallback={
          <div className="text-center py-12">
            <div className="text-muted-foreground">載入中...</div>
          </div>
        }
      >
        <AccountPageContent />
      </Suspense>
    </div>
  )
}

/**
 * 頁面 Metadata
 */
export const metadata = {
  title: '我的帳戶 | Vsale',
  description: '管理您的帳戶資訊與設定',
}
