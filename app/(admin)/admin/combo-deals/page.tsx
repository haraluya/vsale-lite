/**
 * Combo Deals List Page (Admin)
 * Feature: 021-combo-deals
 * Task: T040 [US6] 建立組合優惠列表頁
 * Created: 2026-01-30
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getComboDealsList } from '@/lib/actions/combo-deals'
import { ComboDealTable } from '@/components/admin/combo-deals/ComboDealTable'
import { ComboDealFilters } from '@/components/admin/combo-deals/ComboDealFilters'
import { Button } from '@/components/ui/button'

type SearchParams = Promise<{
  status?: 'active' | 'inactive' | 'ended'
  tier_id?: string
  page?: string
}>

export default async function ComboDealsPage(props: {
  searchParams: SearchParams
}) {
  const searchParams = await props.searchParams
  // 1. 解析查詢參數
  const filters = {
    status: searchParams.status,
    tier_id: searchParams.tier_id,
    page: parseInt(searchParams.page || '1', 10),
    limit: 20,
  }

  // 2. 載入組合優惠列表
  const result = await getComboDealsList(filters)

  if (!result.success) {
    return (
      <div className="p-6">
        <div className="rounded-theme-sm border border-red-500 bg-error-bg p-4">
          <p className="text-foreground">載入組合優惠列表失敗：{result.message}</p>
        </div>
      </div>
    )
  }

  const { items, total, page, limit } = result.data!

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">組合優惠管理</h1>
          <p className="mt-1 text-text-secondary">
            管理跨系列的商品組合促銷活動
          </p>
        </div>
        <Link href="/admin/combo-deals/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            建立組合優惠
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Suspense
        fallback={
          <div className="rounded-theme-sm border bg-surface p-4">
            載入篩選器...
          </div>
        }
      >
        <ComboDealFilters
          currentStatus={filters.status}
          currentTierId={filters.tier_id}
        />
      </Suspense>

      {/* Table */}
      <div className="rounded-theme-sm border-theme bg-surface shadow-neo-sm">
        {items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-text-secondary">
              {filters.status || filters.tier_id
                ? '沒有符合篩選條件的組合優惠'
                : '尚未建立任何組合優惠'}
            </p>
            {!filters.status && !filters.tier_id && (
              <Link href="/admin/combo-deals/new" className="mt-4 inline-block">
                <Button>建立第一個組合優惠</Button>
              </Link>
            )}
          </div>
        ) : (
          <ComboDealTable items={items} total={total} page={page} limit={limit} />
        )}
      </div>

      {/* Stats */}
      <div className="rounded-theme-sm border bg-surface-secondary p-4">
        <p className="text-sm text-text-secondary">
          顯示第 {(page - 1) * limit + 1} - {Math.min(page * limit, total)} 筆，共{' '}
          {total} 筆組合優惠
        </p>
      </div>
    </div>
  )
}
