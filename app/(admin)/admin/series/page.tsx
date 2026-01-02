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
import { Plus, Edit, Trash2 } from 'lucide-react'
import { getSeries } from '@/lib/actions/series'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

export default async function SeriesPage() {
  const seriesResult = await getSeries()
  const series = seriesResult.success ? seriesResult.data : []

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">系列管理</h1>
          <p className="mt-2 text-gray-600">管理商品系列、分類與圖片</p>
        </div>

        <Link href="/admin/series/new">
          <Button>
            <Plus className="mr-2 h-5 w-5" />
            新增系列
          </Button>
        </Link>
      </div>

      {/* Series List */}
      {!series || series.length === 0 ? (
        <div className="rounded-none border-3 border-black bg-white p-12 text-center shadow-neo">
          <p className="text-lg text-gray-500">尚未建立任何系列</p>
          <Link href="/admin/series/new" className="mt-4 inline-block">
            <Button>
              <Plus className="mr-2 h-5 w-5" />
              建立第一個系列
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {series.map((s) => (
            <div
              key={s.id}
              className="rounded-none border-3 border-black bg-white shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              {/* 系列圖片 */}
              <div className="relative aspect-square border-b-3 border-black bg-gray-100">
                {s.image_url ? (
                  <Image
                    src={s.image_url}
                    alt={s.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-6xl">
                    📦
                  </div>
                )}

                {/* 狀態標籤 */}
                <div className="absolute right-2 top-2">
                  <span
                    className={`rounded-none border-2 border-black px-2 py-1 text-xs font-bold ${
                      s.status === 'active'
                        ? 'bg-green-300 text-green-800'
                        : 'bg-gray-300 text-gray-800'
                    }`}
                  >
                    {s.status === 'active' ? '啟用' : '停用'}
                  </span>
                </div>
              </div>

              {/* 系列資訊 */}
              <div className="p-4">
                <h3 className="mb-2 text-lg font-bold">{s.name}</h3>
                {s.description && (
                  <p className="line-clamp-2 text-sm text-gray-600">{s.description}</p>
                )}

                <div className="mt-3 text-sm text-gray-500">
                  排序順序: {s.sort_order}
                </div>

                {/* 操作按鈕 */}
                <div className="mt-4 flex gap-2">
                  <Link href={`/admin/series/${s.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Edit className="mr-2 h-4 w-4" />
                      編輯
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
