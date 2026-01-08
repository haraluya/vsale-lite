/**
 * Shop Layout (前台布局)
 * Feature: 003-series-and-pricing (US3)
 *
 * 前台共用布局
 * - 包含導航列 (Navbar)
 * - 顯示用戶資訊與登出按鈕
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/shop/navbar'

// 強制動態渲染，避免預渲染時 workUnitAsyncStorage 未初始化錯誤
export const dynamic = 'force-dynamic'

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

  // 查詢用戶資料
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id,
      phone,
      email,
      role,
      tier_id,
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={currentUser} />
      <main>{children}</main>
    </div>
  )
}
