/**
 * Combo Deal Detail Page (組合優惠詳情頁)
 * Feature: 021-combo-deals (Phase 6 - User Story 3 & 4)
 * Feature: 021-combo-deals (Phase 7 - T062 - 編輯組合功能)
 *
 * 客戶查看組合優惠詳情並選購商品
 * - 支援編輯購物車中的組合優惠（透過 URL 參數 edit=true & cart_item_id）
 */

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getComboDealDetailForClient } from '@/lib/actions/combo-deals'
import { ProductSelectorClient } from '@/components/shop/combo-deals/ProductSelectorClient'
import { CountdownTimer } from '@/components/shop/combo-deals/CountdownTimer'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'

// 動態渲染（需要使用者認證）
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }> // Next.js 15: params 必須是 Promise
  searchParams: Promise<{ edit?: string; cart_item_id?: string }> // Next.js 15: searchParams 必須是 Promise
}

export default async function ComboDealDetailPage({
  params,
  searchParams,
}: PageProps) {
  // Next.js 15: await params 和 searchParams
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 取得組合優惠詳情
  const result = await getComboDealDetailForClient(resolvedParams.id)

  if (!result.success || !result.data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-none border-3 border-red-600 bg-red-50 p-6 text-center">
          <p className="text-lg font-semibold text-red-800">載入失敗</p>
          <p className="mt-2 text-sm text-red-600">
            {result.message || '組合優惠不存在或您無權訪問'}
          </p>
        </div>
      </div>
    )
  }

  const comboDeal = result.data

  // 🆕 Phase 7: 檢查是否為編輯模式
  const editMode = resolvedSearchParams.edit === 'true'
  const cartItemId = resolvedSearchParams.cart_item_id || null

  // 組合模式文字
  const modeText = comboDeal.combo_mode === 'each' ? '各選組合' : '任選組合'

  // 折扣標籤
  const discountLabel =
    comboDeal.discount_type === 'fixed'
      ? `省 $${comboDeal.discount_value}`
      : `${Math.round(comboDeal.discount_value / 10)} 折`

  return (
    <div className={cn(
      "min-h-screen bg-background",
      designTokens.spacing.page.padding
    )}>
      <div className={cn(
        designTokens.container.default,
        designTokens.spacing.page.gap
      )}>
        {/* 🆕 Phase 7: 編輯模式標示 */}
        {editMode && (
          <div className="mb-4 rounded-none border-2 md:border-3 border-blue-600 bg-blue-50 p-4 shadow-neo-sm">
            <p className="text-sm md:text-base font-bold text-blue-800">
              ✏️ 編輯模式：您正在編輯購物車中的組合優惠
            </p>
          </div>
        )}

        {/* 海報與基本資訊 */}
        <div className="mb-6 md:mb-8">
          {/* 海報圖片 (16:9) */}
          <div className="relative w-full aspect-[16/9] rounded-none border-2 md:border-3 border-black shadow-neo-sm md:shadow-neo overflow-hidden mb-4">
            <Image
              src={comboDeal.poster_url}
              alt={comboDeal.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              className="object-cover"
              priority
            />

            {/* 折扣標籤（絕對定位在海報右上角） */}
            <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 border-2 md:border-3 border-black shadow-neo">
              <span className="text-base md:text-xl font-black">
                {discountLabel}
              </span>
            </div>
          </div>

          {/* 組合優惠名稱與資訊 */}
          <div className="rounded-none border-2 md:border-3 border-black bg-white p-4 md:p-6 shadow-neo-sm md:shadow-neo">
            <h1 className="text-2xl md:text-3xl font-black text-foreground mb-3">
              {comboDeal.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="inline-block px-3 py-1 bg-yellow-100 border-2 border-yellow-600 text-yellow-800 text-sm md:text-base font-bold">
                {modeText}
              </span>
              <span className="text-sm md:text-base text-gray-600">
                包含 {comboDeal.series.length} 個系列
              </span>
            </div>

            {/* 活動倒數計時器 */}
            <div className="pt-4 border-t-2 border-gray-200">
              <CountdownTimer endDate={comboDeal.end_date} />
            </div>
          </div>
        </div>

        {/* 商品選擇器 */}
        {/* 🆕 Phase 7: 改用 Client Component 以支援從購物車載入初始選擇 */}
        <ProductSelectorClient
          comboDeal={comboDeal}
          editMode={editMode}
          cartItemId={cartItemId}
        />
      </div>
    </div>
  )
}
