'use client'

import { Tier } from '@/types'
import { ClientFilter } from './client-filter'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

type ClientFilterWrapperProps = {
  tiers: Tier[]
  initialSearch: string
  initialTierIds: string[]
  totalCount: number
}

/**
 * 客戶篩選包裝元件
 * Feature 006 - US6: 處理 URL 參數與路由導航
 */
export function ClientFilterWrapper({
  tiers,
  initialSearch,
  initialTierIds,
  totalCount,
}: ClientFilterWrapperProps) {
  const router = useRouter()

  // 處理篩選變更
  const handleFilterChange = useCallback(
    (filters: { search: string; tier_ids: string[] }) => {
      const params = new URLSearchParams()

      // 搜尋關鍵字
      if (filters.search) {
        params.set('search', filters.search)
      }

      // 等級篩選 (多選,逗號分隔)
      if (filters.tier_ids.length > 0) {
        params.set('tier_ids', filters.tier_ids.join(','))
      }

      // 導航到新 URL (重置到第一頁)
      const queryString = params.toString()
      router.push(`/admin/clients${queryString ? `?${queryString}` : ''}`)
    },
    [router]
  )

  return (
    <ClientFilter
      tiers={tiers}
      initialSearch={initialSearch}
      initialTierIds={initialTierIds}
      onFilterChange={handleFilterChange}
      totalCount={totalCount}
    />
  )
}
