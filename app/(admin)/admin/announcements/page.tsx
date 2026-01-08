/**
 * Announcements Management Page (廣告管理列表頁)
 * Feature: 007-system-enhancement (US4 - 廣告輪播系統)
 *
 * 後台廣告管理頁面
 * - 列表顯示所有廣告
 * - CRUD 操作（新增、編輯、刪除）
 * - 顯示啟用狀態與排序
 */

import { getAllAnnouncements } from '@/lib/actions/announcements'
import { AnnouncementListClient } from '@/components/admin/announcements/AnnouncementListClient'
import Link from 'next/link'
import { Plus } from 'lucide-react'

// 強制動態渲染，避免預渲染時 workUnitAsyncStorage 未初始化錯誤
export const dynamic = 'force-dynamic'

export default async function AnnouncementsPage() {
  const result = await getAllAnnouncements()
  const announcements = result.success ? (result.data || []) : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">廣告管理</h1>
          <p className="mt-2 text-gray-600">管理前台首頁輪播廣告</p>
        </div>
        <Link
          href="/admin/announcements/new"
          className="inline-flex items-center gap-2 rounded-none border-3 border-black bg-green-400 px-6 py-3 font-bold shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          <Plus className="h-5 w-5" />
          新增廣告
        </Link>
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="rounded-none border-3 border-black bg-white p-12 text-center shadow-neo">
          <p className="text-lg text-gray-500">目前沒有任何廣告</p>
          <Link
            href="/admin/announcements/new"
            className="mt-4 inline-flex items-center gap-2 rounded-none border-2 border-black bg-green-400 px-4 py-2 font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            <Plus className="h-4 w-4" />
            新增第一個廣告
          </Link>
        </div>
      ) : (
        <AnnouncementListClient announcements={announcements} />
      )}
    </div>
  )
}
