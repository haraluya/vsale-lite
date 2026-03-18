'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { designTokens } from '@/lib/design-tokens'

/**
 * Tab 切換器
 * 切換「商品頁廣告」和「首頁廣告」兩個功能區域
 */
export function TabSwitcher() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = searchParams?.get('tab') || 'home'

  const handleTabChange = (tab: 'products' | 'home') => {
    router.push(`/admin/announcements?tab=${tab}`)
  }

  return (
    <div className="flex gap-4 mb-6">
      <button
        onClick={() => handleTabChange('home')}
        className={`
          flex-1 py-3 px-6 rounded-theme-sm font-medium
          ${designTokens.cleanCommerce.border.full}
          ${designTokens.cleanCommerce.shadow.full}
         
          transition-all
          ${
            currentTab === 'home'
              ? 'bg-green-400 -translate-y-0.5 shadow-theme-hover'
              : 'bg-white hover:translate-x-[1px] hover:translate-y-[1px]'
          }
        `}
      >
        首頁廣告
      </button>

      <button
        onClick={() => handleTabChange('products')}
        className={`
          flex-1 py-3 px-6 rounded-theme-sm font-medium
          ${designTokens.cleanCommerce.border.full}
          ${designTokens.cleanCommerce.shadow.full}
         
          transition-all
          ${
            currentTab === 'products'
              ? 'bg-green-400 -translate-y-0.5 shadow-theme-hover'
              : 'bg-white hover:translate-x-[1px] hover:translate-y-[1px]'
          }
        `}
      >
        商品頁廣告
      </button>
    </div>
  )
}
