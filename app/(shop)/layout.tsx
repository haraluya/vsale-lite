/**
 * Shop Layout (前台布局)
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StoreLayoutClient } from '@/components/shop/store-layout-client'
import { OfflineIndicator } from '@/components/shop/offline-indicator'
import { getUnusedCouponCount } from '@/lib/actions/shop'
import { getActiveCategories } from '@/lib/actions/products'

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

  const [{ data: profile }, couponCountResult, categoriesResult] = await Promise.all([
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
    getActiveCategories(),
  ])

  if (!profile) {
    redirect('/login')
  }

  const unusedCouponCount = couponCountResult.success ? (couponCountResult.data ?? 0) : 0
  const categories = categoriesResult.success ? (categoriesResult.data ?? []) : []

  const userName = profile.display_name || profile.phone || ''
  const tierName = (profile.tiers as any)?.name || '未設定'
  const userPhone = profile.phone || profile.email || ''

  return (
    <div className="min-h-screen bg-background">
      {/* 離線狀態指示器 */}
      <OfflineIndicator />

      {/* Client Layout（Navbar + Sidebar + BottomNav + InstallPrompt） */}
      <StoreLayoutClient
        userName={userName}
        userPhone={userPhone}
        tierName={tierName}
        unusedCouponCount={unusedCouponCount}
        categories={categories}
      >
        {children}
      </StoreLayoutClient>
    </div>
  )
}
