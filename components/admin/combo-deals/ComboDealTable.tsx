/**
 * Combo Deal Table Component
 * Feature: 021-combo-deals
 * Task: T041 [US6] 建立組合優惠表格元件
 * Task: T043 [US6] 實作分頁功能
 * Created: 2026-01-30
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Pencil, Trash2, Power, PowerOff, ChevronLeft, ChevronRight } from 'lucide-react'
import { deleteComboDeal, toggleComboDealStatus } from '@/lib/actions/combo-deals'
import { useConfirm } from '@/lib/contexts/dialog-context'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/format'
import { designTokens, getThemeClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface ComboDealItem {
  id: string
  name: string
  poster_url: string
  combo_mode: 'each' | 'mix_match'
  discount_type: 'fixed' | 'percentage'
  discount_value: number
  start_date: string
  end_date: string
  status: 'active' | 'inactive' | 'ended'
  display_order: number | null
  series_count: number
  tier_count: number
  created_at: string
}

interface ComboDealTableProps {
  items: ComboDealItem[]
  total: number
  page: number
  limit: number
}

export function ComboDealTable({
  items,
  total,
  page,
  limit,
}: ComboDealTableProps) {
  const router = useRouter()
  const confirm = useConfirm()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // 計算總頁數
  const totalPages = Math.ceil(total / limit)

  // 處理刪除
  const handleDelete = async (item: ComboDealItem) => {
    const confirmed = await confirm({
      title: '確認刪除',
      description: `確定要刪除組合優惠「${item.name}」嗎？此操作無法復原。`,
      variant: 'danger',
    })

    if (!confirmed) return

    setDeletingId(item.id)

    const result = await deleteComboDeal(item.id)

    setDeletingId(null)

    if (result.success) {
      router.refresh()
    } else {
      await confirm({
        title: '刪除失敗',
        description: result.message || '刪除組合優惠時發生錯誤',
        variant: 'error',
      })
    }
  }

  // 處理狀態切換
  const handleToggleStatus = async (item: ComboDealItem) => {
    const newStatus = item.status === 'active' ? '停用' : '啟用'

    const confirmed = await confirm({
      title: `確認${newStatus}`,
      description: `確定要${newStatus}組合優惠「${item.name}」嗎？`,
      variant: 'info',
    })

    if (!confirmed) return

    setTogglingId(item.id)

    const result = await toggleComboDealStatus(item.id)

    setTogglingId(null)

    if (result.success) {
      router.refresh()
    } else {
      await confirm({
        title: `${newStatus}失敗`,
        description: result.message || `${newStatus}組合優惠時發生錯誤`,
        variant: 'error',
      })
    }
  }

  // 格式化折扣顯示
  const formatDiscount = (type: string, value: number) => {
    if (type === 'fixed') {
      return `省 $${Math.floor(value)}`
    }
    const discount = value / 10
    // 如果是整數就不顯示小數點，否則保留一位小數
    return `${discount % 1 === 0 ? Math.floor(discount) : discount.toFixed(1)} 折`
  }

  // 格式化狀態徽章
  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800 border-green-300',
      inactive: 'bg-surface-secondary text-foreground border-border',
      ended: 'bg-red-100 text-red-800 border-red-300',
    }
    const labels = {
      active: '啟用中',
      inactive: '已停用',
      ended: '已結束',
    }
    return (
      <span
        className={`inline-block rounded-theme-sm border px-2 py-1 text-xs font-semibold ${badges[status as keyof typeof badges]}`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  // 處理分頁
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', newPage.toString())
    router.push(`/admin/combo-deals?${params.toString()}`)
  }

  return (
    <div>
      {/* Desktop Table */}
      <div className={cn("hidden lg:block card-neo overflow-hidden p-0")}>
        <table className="w-full">
          <thead className="border-b bg-surface-secondary">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold">海報</th>
              <th className="px-4 py-3 text-left text-sm font-bold">名稱</th>
              <th className="px-4 py-3 text-left text-sm font-bold">模式</th>
              <th className="px-4 py-3 text-left text-sm font-bold">折扣</th>
              <th className="px-4 py-3 text-left text-sm font-bold">活動期間</th>
              <th className="px-4 py-3 text-left text-sm font-bold">系列/等級</th>
              <th className="px-4 py-3 text-left text-sm font-bold">狀態</th>
              <th className="px-4 py-3 text-right text-sm font-bold">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-border hover:bg-surface-secondary"
              >
                <td className="px-4 py-3">
                  <Image
                    src={item.poster_url}
                    alt={item.name}
                    width={80}
                    height={45}
                    className="rounded-theme-sm border object-cover"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold">{item.name}</div>
                  <div className="text-xs text-muted">
                    排序: {item.display_order ?? '-'}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  {item.combo_mode === 'each' ? '各選模式' : '任選模式'}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-red-600">
                  {formatDiscount(item.discount_type, item.discount_value)}
                </td>
                <td className="px-4 py-3 text-xs text-text-secondary">
                  <div>{formatDate(item.start_date)}</div>
                  <div>至 {formatDate(item.end_date)}</div>
                </td>
                <td className="px-4 py-3 text-sm">
                  {item.series_count} 系列 / {item.tier_count} 等級
                </td>
                <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/combo-deals/${item.id}/edit`}>
                      <Button variant="outline" size="sm" title="編輯">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    {item.status !== 'ended' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(item)}
                        disabled={togglingId === item.id}
                        title={
                          item.status === 'active' ? '停用' : '啟用'
                        }
                      >
                        {item.status === 'active' ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(item)}
                      disabled={deletingId === item.id}
                      title="刪除"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3 md:space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "rounded-theme-sm bg-surface",
              getThemeClasses(),
              designTokens.spacing.card.padding
            )}
          >
            <div className="mb-3">
              <Image
                src={item.poster_url}
                alt={item.name}
                width={640}
                height={360}
                className="w-full rounded-theme-sm border object-cover aspect-[16/9]"
              />
            </div>
            <div className="mb-2 flex items-start justify-between">
              <h3 className="font-bold">{item.name}</h3>
              {getStatusBadge(item.status)}
            </div>
            <div className="mb-3 space-y-1 text-sm text-text-secondary">
              <div>模式: {item.combo_mode === 'each' ? '各選' : '任選'}</div>
              <div className="font-semibold text-red-600">
                {formatDiscount(item.discount_type, item.discount_value)}
              </div>
              <div>
                {formatDate(item.start_date)} - {formatDate(item.end_date)}
              </div>
              <div>
                {item.series_count} 系列 / {item.tier_count} 等級
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/combo-deals/${item.id}/edit`} className="flex-1">
                <Button variant="outline" className="w-full" size="sm">
                  <Pencil className="mr-2 h-4 w-4" />
                  編輯
                </Button>
              </Link>
              {item.status !== 'ended' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleStatus(item)}
                  disabled={togglingId === item.id}
                >
                  {item.status === 'active' ? (
                    <PowerOff className="h-4 w-4" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(item)}
                disabled={deletingId === item.id}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <div className={cn("text-text-secondary", designTokens.typography.caption)}>
            第 {page} / {totalPages} 頁
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              上一頁
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
            >
              下一頁
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
