/**
 * Shop Layout (前台布局)
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/shop/navbar'
import { SecondaryNav } from '@/components/shop/secondary-nav'
import { BottomNav } from '@/components/shop/bottom-nav'
import { getUnusedCouponCount } from '@/lib/actions/shop'

export const revalidate = 300

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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

      {/* 主要內容區域 */}
      <div className="pt-[84px] md:pt-[100px]">
        {/* 次導覽列 */}
        <SecondaryNav
          userPhone={currentUser.phone || currentUser.email || ''}
          userName={userName}
          tierName={tierName}
          unusedCouponCount={unusedCouponCount}
        />

        {/* 主要內容 - 手機版底部留空給底部導覽列 */}
        <main className="pt-6 md:pt-8 pb-20 md:pb-0">{children}</main>
      </div>

      {/* 底部導覽列（僅手機版） */}
      <BottomNav />
    </div>
  )
}
