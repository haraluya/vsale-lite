'use client'

import { AuditActionType } from '@/types'
import { Button } from '@/components/ui/button'
import { Filter } from 'lucide-react'

interface AuditLogFiltersProps {
  currentFilters: {
    action_type?: AuditActionType
    date_from?: string
    date_to?: string
  }
}

export function AuditLogFilters({ currentFilters }: AuditLogFiltersProps) {
  return (
    <form className="rounded-none border-3 border-black bg-white p-4 shadow-neo space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5" />
        <h3 className="font-black text-lg">篩選條件</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 操作類型篩選 */}
        <div>
          <label className="block text-sm font-bold mb-2">操作類型</label>
          <select
            name="action_type"
            defaultValue={currentFilters.action_type || ''}
            className="w-full rounded-none border-2 border-black px-3 py-2 font-bold"
          >
            <option value="">全部</option>
            <option value="created">建立</option>
            <option value="updated">更新</option>
            <option value="deleted">刪除</option>
            <option value="stock_adjusted">庫存調整</option>
            <option value="comment_added">留言</option>
          </select>
        </div>

        {/* 起始日期 */}
        <div>
          <label className="block text-sm font-bold mb-2">起始日期</label>
          <input
            type="date"
            name="date_from"
            defaultValue={currentFilters.date_from}
            className="w-full rounded-none border-2 border-black px-3 py-2 font-bold"
          />
        </div>

        {/* 結束日期 */}
        <div>
          <label className="block text-sm font-bold mb-2">結束日期</label>
          <input
            type="date"
            name="date_to"
            defaultValue={currentFilters.date_to}
            className="w-full rounded-none border-2 border-black px-3 py-2 font-bold"
          />
        </div>
      </div>

      <Button type="submit" className="w-full">
        套用篩選
      </Button>
    </form>
  )
}
