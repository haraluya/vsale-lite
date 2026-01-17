/**
 * Shop Layout (前台布局)
 * Feature: 003-series-and-pricing (US3)
 * Feature: 016-home-page-blocks (US1 - 歡迎訊息與切換控制)
 *
 * 前台共用布局
 * - 包含導航列 (Navbar)
 * - 顯示用戶資訊與登出按鈕
 * - 歡迎訊息與會員等級顯示
 * - SegmentControl 切換控制
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/shop/navbar'
import { SegmentControl } from '@/components/shop/home-blocks/SegmentControl'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

// ISR 快取策略：5 分鐘
// 移除 force-dynamic，啟用快取以提升效能
// export const dynamic = 'force-dynamic'  // 已移除
export const revalidate = 300 // 5 分鐘快取

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 檢查登入狀態
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 查詢用戶資料（含 display_name）
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id,
      phone,
      email,
      role,
      tier_id,
      display_name,
      created_at,
      tiers (
        name
      )
    `)
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  const currentUser = {
    id: profile.id,
    phone: profile.phone,
    email: profile.email,
    tier_id: profile.tier_id,
    tier_name: (profile.tiers as any)?.name || null,
    role: profile.role as 'client' | 'admin',
    created_at: profile.created_at,
  }

  const userName = profile.display_name || profile.phone
  const tierName = (profile.tiers as any)?.name || '未設定'

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={currentUser} />

      {/* 歡迎訊息與 SegmentControl */}
      <div className={cn(
        designTokens.spacing.page.padding,
        designTokens.container.default
      )}>
        <div className={cn(
          'rounded-none bg-white',
          designTokens.neoBrutalism.border.full,
          'border-black',
          designTokens.neoBrutalism.shadow.full,
          designTokens.spacing.card.padding,
          designTokens.spacing.section.marginBottom
        )}>
          {/* 歡迎訊息 */}
          <div className="mb-4">
            <p className={cn(
              designTokens.typography.body.base,
              'text-gray-600'
            )}>
              {userName} 您好！
            </p>
            <p className={cn(
              designTokens.typography.caption,
              'mt-1 text-gray-500'
            )}>
              會員等級: <span className="font-bold">{tierName}</span>
            </p>
          </div>

          {/* SegmentControl */}
          <SegmentControl />
        </div>
      </div>

      <main>{children}</main>
    </div>
  )
}
