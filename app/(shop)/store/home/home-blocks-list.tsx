/**
 * Home Blocks List (Server Component)
 * ⭐ 優化：用於 Streaming SSR 的獨立 Server Component
 *
 * 負責查詢並渲染首頁所有區塊（輪播圖 + 商品展示）
 * - 使用批次查詢優化減少 N+1 問題
 * - 可被 Suspense 包裹實現漸進式渲染
 */

import { getHomeBlocksWithProducts } from '@/lib/actions/home-blocks'
import { getCurrentUser } from '@/lib/actions/shop'
import { BlockRenderer } from '@/components/shop/home-blocks/BlockRenderer'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export async function HomeBlocksList() {
  // ⭐ 批次查詢區塊與商品資料
  const blocksResult = await getHomeBlocksWithProducts()
  const blocks = blocksResult.success && blocksResult.data ? blocksResult.data : []

  // 取得當前使用者等級（用於 ProductDisplay）
  const userResult = await getCurrentUser()
  const tierName = userResult.success ? userResult.data?.tier_name || '訪客' : '訪客'

  // 將 tierName 注入到每個區塊
  const blocksWithTierName = blocks.map(block => ({
    ...block,
    tierName,
  }))

  // 無區塊時顯示提示
  if (blocksWithTierName.length === 0) {
    return (
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
    )
  }

  // 渲染所有區塊
  return (
    <>
      {blocksWithTierName.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </>
  )
}
