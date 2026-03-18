/**
 * Combo Deal Filters Component
 * Feature: 021-combo-deals
 * Task: T042 [US6] 實作篩選器（狀態、等級）
 * Created: 2026-01-30
 */

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tier } from '@/types'

interface ComboDealFiltersProps {
  currentStatus?: 'active' | 'inactive' | 'ended'
  currentTierId?: string
}

export function ComboDealFilters({
  currentStatus,
  currentTierId,
}: ComboDealFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tiers, setTiers] = useState<Tier[]>([])

  // 載入等級列表
  useEffect(() => {
    async function loadTiers() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tiers')
        .select('*')
        .order('level', { ascending: true })

      if (!error && data) {
        setTiers(data)
      }
    }
    loadTiers()
  }, [])

  // 處理篩選變更
  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    // 重置到第一頁
    params.delete('page')

    router.push(`/admin/combo-deals?${params.toString()}`)
  }

  // 清除所有篩選
  const handleClearFilters = () => {
    router.push('/admin/combo-deals')
  }

  const hasActiveFilters = currentStatus || currentTierId

  return (
    <div className="rounded-theme-sm border-theme bg-white p-4 shadow-neo-sm">
      <div className="flex flex-wrap items-center gap-4">
        {/* 狀態篩選 */}
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-semibold">
            狀態:
          </label>
          <select
            id="status-filter"
            value={currentStatus || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="rounded-theme-sm border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">全部</option>
            <option value="active">啟用中</option>
            <option value="inactive">已停用</option>
            <option value="ended">已結束</option>
          </select>
        </div>

        {/* 等級篩選 */}
        <div className="flex items-center gap-2">
          <label htmlFor="tier-filter" className="text-sm font-semibold">
            顯示等級:
          </label>
          <select
            id="tier-filter"
            value={currentTierId || ''}
            onChange={(e) => handleFilterChange('tier_id', e.target.value)}
            className="rounded-theme-sm border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">全部</option>
            {tiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.name}
              </option>
            ))}
          </select>
        </div>

        {/* 清除篩選按鈕 */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="rounded-theme-sm border border-gray-400 bg-white px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            清除篩選
          </button>
        )}
      </div>

      {/* 篩選狀態提示 */}
      {hasActiveFilters && (
        <div className="mt-3 text-sm text-gray-600">
          {currentStatus && (
            <span className="mr-2">
              狀態:{' '}
              <strong>
                {currentStatus === 'active'
                  ? '啟用中'
                  : currentStatus === 'inactive'
                    ? '已停用'
                    : '已結束'}
              </strong>
            </span>
          )}
          {currentTierId && (
            <span>
              等級:{' '}
              <strong>
                {tiers.find((t) => t.id === currentTierId)?.name || '未知'}
              </strong>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
