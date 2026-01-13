/**
 * Home Page (前台首頁)
 * Feature: 016-home-page-blocks (US1 - 前台路由與導覽切換)
 *
 * 客戶端首頁
 * - 顯示首頁廣告區塊（圖片輪播、商品展示、文字區塊）
 * - 將在 Phase 4-6 實作各種區塊類型
 * - 將在 Phase 11 實作 BlockRenderer
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className={cn(
      "min-h-screen bg-background",
      designTokens.spacing.page.padding
    )}>
      <div className={cn(
        designTokens.container.default,
        designTokens.spacing.page.gap
      )}>
        {/* 首頁廣告區塊將在 Phase 4-6 實作 */}
        <div className={cn(
          "rounded-none bg-white",
          designTokens.neoBrutalism.border.full,
          "border-black",
          designTokens.neoBrutalism.shadow.full,
          designTokens.spacing.card.padding,
        )}>
          <h2 className={designTokens.typography.h2}>首頁廣告區塊</h2>
          <p className="mt-2 text-gray-600">
            此區域將在 Phase 4-6 實作圖片輪播、商品展示、文字區塊
          </p>
        </div>
      </div>
    </div>
  )
}
