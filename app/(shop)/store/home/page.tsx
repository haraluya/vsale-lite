/**
 * Home Page (前台首頁)
 * Feature: 016-home-page-blocks (Phase 11 - BlockRenderer 整合)
 *
 * 客戶端首頁
 * - 顯示首頁廣告區塊（圖片輪播、商品展示、文字區塊）
 * - 使用 BlockRenderer 渲染各種區塊類型
 * - 區塊依 sort_order 排序
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveHomeBlocks } from '@/lib/actions/home-blocks'
import { BlockRenderer } from '@/components/shop/home-blocks/BlockRenderer'
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

  // 載入啟用的首頁廣告區塊
  const blocksResult = await getActiveHomeBlocks()
  const blocks = blocksResult.success && blocksResult.data ? blocksResult.data : []

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full space-y-3 md:space-y-4">
        {/* 首頁廣告區塊 */}
        {blocks.length === 0 ? (
          <div className={cn(
            designTokens.container.default,
            designTokens.spacing.page.padding
          )}>
            <div className={cn(
              "rounded-none bg-white",
              designTokens.neoBrutalism.border.full,
              "border-black",
              designTokens.neoBrutalism.shadow.full,
              designTokens.spacing.card.padding,
            )}>
              <h2 className={designTokens.typography.h2}>首頁廣告區塊</h2>
              <p className="mt-2 text-gray-600">
                目前沒有啟用的首頁廣告區塊
              </p>
            </div>
          </div>
        ) : (
          blocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))
        )}
      </div>
    </div>
  )
}
