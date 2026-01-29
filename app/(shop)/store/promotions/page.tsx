/**
 * Promotions Page (優惠活動分類頁)
 * Feature: 021-combo-deals (Phase 5 - User Story 2)
 *
 * 客戶瀏覽所有符合其等級的有效組合優惠
 */

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveComboDealsByTier } from '@/lib/actions/combo-deals'
import { ComboDealCard } from '@/components/shop/combo-deals/ComboDealCard'
import { Loader2 } from 'lucide-react'

// 動態渲染（需要使用者認證）
export const dynamic = 'force-dynamic'

export default async function PromotionsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 取得符合等級的有效組合優惠
  const result = await getActiveComboDealsByTier()

  if (!result.success) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-none border-3 border-red-600 bg-red-50 p-6 text-center">
          <p className="text-lg font-semibold text-red-800">載入失敗</p>
          <p className="mt-2 text-sm text-red-600">{result.message}</p>
        </div>
      </div>
    )
  }

  const comboDeals = result.data || []

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* 頁面標題 */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-foreground mb-2">
            📦 優惠活動
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            限時組合優惠，買越多省越多
          </p>
        </div>

        {/* 組合優惠列表 */}
        {comboDeals.length === 0 ? (
          <div className="rounded-none border-2 md:border-3 border-black bg-yellow-50 p-8 text-center shadow-neo-sm md:shadow-neo">
            <p className="text-lg font-semibold text-gray-700">
              目前沒有適用於您等級的優惠活動
            </p>
            <p className="mt-2 text-sm text-gray-500">
              請稍後再來看看，或聯繫客服了解更多優惠資訊
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {comboDeals.map((deal) => (
              <ComboDealCard key={deal.id} deal={deal} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
