/**
 * SegmentControl Component
 * Feature: 016-home-page-blocks (US1 - 首頁區塊編輯器)
 *
 * 兩按鈕切換：首頁 ↔ 商品
 * - 使用 usePathname() 判斷當前路由
 * - 點擊使用 router.push() 切換路由
 * - Neo-Brutalism 設計
 * - 觸控目標 >= 44px x 44px (WCAG 2.1 AA)
 */

'use client'

import { usePathname, useRouter } from 'next/navigation'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export function SegmentControl() {
  const pathname = usePathname()
  const router = useRouter()

  const isHomePage = pathname === '/store/home'
  const isProductsPage = pathname.startsWith('/store/products')

  return (
    <div className="flex gap-2">
      {/* 首頁按鈕 */}
      <button
        type="button"
        onClick={() => router.push('/store/home')}
        className={cn(
          // 基礎樣式
          'rounded-none font-bold transition-all',
          'px-6 py-2.5 min-h-[44px]', // 確保觸控目標 >= 44px
          designTokens.typography.body.base,

          // Neo-Brutalism
          designTokens.neoBrutalism.border.full,
          'border-black',
          designTokens.neoBrutalism.shadow.full,

          // 啟用狀態
          isHomePage
            ? 'bg-green-400 translate-x-[2px] translate-y-[2px] shadow-none'
            : 'bg-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
        )}
      >
        首頁
      </button>

      {/* 商品按鈕 */}
      <button
        type="button"
        onClick={() => router.push('/store/products')}
        className={cn(
          // 基礎樣式
          'rounded-none font-bold transition-all',
          'px-6 py-2.5 min-h-[44px]', // 確保觸控目標 >= 44px
          designTokens.typography.body.base,

          // Neo-Brutalism
          designTokens.neoBrutalism.border.full,
          'border-black',
          designTokens.neoBrutalism.shadow.full,

          // 啟用狀態
          isProductsPage
            ? 'bg-green-400 translate-x-[2px] translate-y-[2px] shadow-none'
            : 'bg-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
        )}
      >
        商品
      </button>
    </div>
  )
}
