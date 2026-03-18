'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Filter, ChevronDown, ChevronUp } from 'lucide-react'

interface AuditLogFiltersProps {
  currentFilters: {
    action_type?: string | string[] // 接收可能的陣列
    date_from?: string
    date_to?: string
  }
}

export function AuditLogFilters({ currentFilters }: AuditLogFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 清理 currentFilters 防止顯示陣列
  const cleanAction = Array.isArray(currentFilters.action_type)
    ? currentFilters.action_type[0]
    : currentFilters.action_type

  return (
    <form className="rounded-theme-sm border-theme bg-surface shadow-neo">
      {/* 標題區（手機可點擊展開） */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 md:cursor-default"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <h3 className="font-black text-lg">篩選條件</h3>
        </div>
        <div className="md:hidden">
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </button>

      {/* 篩選表單（手機版可摺疊，桌面版永遠顯示） */}
      <div className={`${isExpanded ? 'block' : 'hidden'} md:block border-t p-4 space-y-4`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 操作類型篩選 */}
          <div>
            <label className="block text-sm font-bold mb-2">操作類型</label>
            <select
              name="action_type"
              defaultValue={cleanAction || ''} // 使用清理後的值
              className="w-full rounded-theme-sm border px-3 py-2 font-bold text-sm"
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
              className="w-full rounded-theme-sm border px-3 py-2 font-bold text-sm"
            />
          </div>

          {/* 結束日期 */}
          <div>
            <label className="block text-sm font-bold mb-2">結束日期</label>
            <input
              type="date"
              name="date_to"
              defaultValue={currentFilters.date_to}
              className="w-full rounded-theme-sm border px-3 py-2 font-bold text-sm"
            />
          </div>
        </div>

        <Button type="submit" className="w-full">
          套用篩選
        </Button>
      </div>
    </form>
  )
}
