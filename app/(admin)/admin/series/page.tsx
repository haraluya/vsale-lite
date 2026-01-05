/**
 * Series Management Page (系列管理頁面)
 * Feature: 003-series-and-pricing (US2)
 *
 * 管理員系列列表頁面
 * - 顯示所有系列
 * - 支援新增/編輯/刪除系列
 * - 顯示系列圖片與狀態
 */

import Link from 'next/link'
import { Plus, Edit } from 'lucide-react'
import { getSeries } from '@/lib/actions/series'
import { Button } from '@/components/ui/button'
import { SeriesDeleteButton } from '@/components/admin/series-delete-button'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { designTokens, getPageContainerClasses, getNeoBrutalismClasses } from '@/lib/design-tokens'

export default async function SeriesPage() {
  const seriesResult = await getSeries()
  const series = seriesResult.success ? seriesResult.data : []

  return (
    <div className={getPageContainerClasses('default')}>
      {/* Header */}
      <div className="flex flex-col gap-3 md:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={designTokens.typography.h1}>系列管理</h1>
          <p className={cn(designTokens.typography.body.base, "mt-1 md:mt-2 text-gray-600")}>管理商品系列、分類與圖片</p>
        </div>

        <div className="flex gap-3">
          <Link href="/admin/series/new">
            <Button>
              <Plus className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              新增系列
            </Button>
          </Link>
        </div>
      </div>

      {/* Series List */}
      {!series || series.length === 0 ? (
        <div className={cn(
          "rounded-none bg-white text-center",
          getNeoBrutalismClasses(),
          "p-8 md:p-12"
        )}>
          <p className={cn(designTokens.typography.body.large, "text-gray-500")}>尚未建立任何系列</p>
          <Link href="/admin/series/new" className="mt-4 inline-block">
            <Button>
              <Plus className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              建立第一個系列
            </Button>
          </Link>
        </div>
      ) : (
        <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3", designTokens.spacing.grid.gap)}>
          {series.map((s) => (
            <div
              key={s.id}
              className={cn(
                "rounded-none bg-white transition-all",
                getNeoBrutalismClasses({ hover: true })
              )}
            >
              {/* 系列圖片 */}
              <div className="relative aspect-square border-b-2 md:border-b-3 border-black bg-gray-100">
                {s.image_url ? (
                  <Image
                    src={s.image_url}
                    alt={s.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl md:text-6xl">
                    📦
                  </div>
                )}

                {/* 狀態標籤 */}
                <div className="absolute right-2 top-2">
                  <span
                    className={cn(
                      "rounded-none border-2 border-black font-bold",
                      designTokens.typography.caption,
                      "px-2 py-1",
                      s.status === 'active'
                        ? 'bg-green-300 text-green-800'
                        : 'bg-gray-300 text-gray-800'
                    )}
                  >
                    {s.status === 'active' ? '啟用' : '停用'}
                  </span>
                </div>
              </div>

              {/* 系列資訊 */}
              <div className={designTokens.spacing.card.padding}>
                <h3 className={cn(designTokens.typography.h3, "mb-2")}>{s.name}</h3>
                {s.description && (
                  <p className={cn(designTokens.typography.caption, "line-clamp-2 text-gray-600")}>{s.description}</p>
                )}

                {/* 操作按鈕 */}
                <div className="mt-3 md:mt-4 flex gap-2">
                  <Link href={`/admin/series/${s.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Edit className="mr-2 h-4 w-4" />
                      編輯
                    </Button>
                  </Link>
                  <div className="flex-1">
                    <SeriesDeleteButton seriesId={s.id} seriesName={s.name} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
