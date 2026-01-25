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
import { SecondaryNav } from '@/components/shop/secondary-nav'
import { getUnusedCouponCount } from '@/lib/actions/shop'

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

  // 並行查詢用戶資料與優惠券數量
  const [{ data: profile }, couponCountResult] = await Promise.all([
    supabase
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
      .single(),
    getUnusedCouponCount(user.id),
  ])

  if (!profile) {
    redirect('/login')
  }

  const unusedCouponCount = couponCountResult.success ? (couponCountResult.data ?? 0) : 0

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
      {/* 固定導覽列 */}
      <Navbar user={currentUser} />

      {/* 主要內容區域 - 添加頂部間距避免被導覽列遮擋 */}
      <div className="pt-[84px] md:pt-[100px]">
        {/* 次導覽列 */}
        <SecondaryNav
          userPhone={currentUser.phone || currentUser.email || ''}
          userName={userName}
          tierName={tierName}
          unusedCouponCount={unusedCouponCount}
        />

        {/* 主要內容 */}
        <main>{children}</main>
      </div>
    </div>
  )
}
