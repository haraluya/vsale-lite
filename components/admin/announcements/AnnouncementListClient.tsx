/**
 * AnnouncementListClient Component
 * Feature: 007-system-enhancement (US4)
 *
 * 廣告列表客戶端元件
 * - 顯示廣告列表
 * - 刪除功能
 * - 狀態切換
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Edit, Trash2, ExternalLink } from 'lucide-react'
import { deleteAnnouncement, updateAnnouncement } from '@/lib/actions/announcements'
import type { Announcement } from '@/types'
import { useConfirm } from '@/lib/contexts/dialog-context'
import { toast } from 'sonner'

interface AnnouncementListClientProps {
  announcements: Announcement[]
}

export function AnnouncementListClient({ announcements: initialAnnouncements }: AnnouncementListClientProps) {
  const confirm = useConfirm()
  const [announcements, setAnnouncements] = useState(initialAnnouncements)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await confirm({
      title: '確認刪除',
      description: `確定要刪除廣告「${title}」嗎？此操作無法復原。`,
      variant: 'danger',
      confirmText: '刪除',
      cancelText: '取消',
    })

    if (!confirmed) {
      return
    }

    setDeletingId(id)
    const result = await deleteAnnouncement(id)

    if (result.success) {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id))
      toast.success('廣告已刪除')
    } else {
      toast.error(result.message || '刪除失敗')
    }

    setDeletingId(null)
  }

  const handleToggleActive = async (announcement: Announcement) => {
    const result = await updateAnnouncement({
      announcementId: announcement.id,
      isActive: !announcement.is_active,
    })

    if (result.success) {
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === announcement.id ? { ...a, is_active: !a.is_active } : a
        )
      )
      toast.success(announcement.is_active ? '廣告已停用' : '廣告已啟用')
    } else {
      toast.error(result.message || '更新失敗')
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {announcements.map((announcement) => (
        <div
          key={announcement.id}
          className="rounded-none border-3 border-black bg-white p-4 shadow-neo"
        >
          {/* 圖片預覽 */}
          <div className="relative mb-4 aspect-video overflow-hidden rounded-none border-2 border-black bg-gray-100">
            {announcement.image_url ? (
              <Image
                src={announcement.image_url}
                alt={announcement.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl text-gray-300">
                📷
              </div>
            )}

            {/* 狀態標籤 */}
            <div className="absolute left-2 top-2">
              <button
                onClick={() => handleToggleActive(announcement)}
                className={`rounded-none border-2 border-black px-2 py-1 text-xs font-bold ${
                  announcement.is_active
                    ? 'bg-green-400 text-black'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {announcement.is_active ? '啟用' : '停用'}
              </button>
            </div>

          </div>

          {/* 廣告資訊 */}
          <div className="space-y-2">
            <h3 className="line-clamp-1 text-lg font-bold">{announcement.title}</h3>

            {announcement.link_url && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <ExternalLink className="h-3 w-3" />
                <span className="line-clamp-1">{announcement.link_url}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Link
                href={`/admin/announcements/${announcement.id}/edit`}
                className="flex flex-1 items-center justify-center gap-2 rounded-none border-2 border-black bg-blue-400 px-3 py-2 text-sm font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
              >
                <Edit className="h-4 w-4" />
                編輯
              </Link>

              <button
                onClick={() => handleDelete(announcement.id, announcement.title)}
                disabled={deletingId === announcement.id}
                className="flex flex-1 items-center justify-center gap-2 rounded-none border-2 border-black bg-red-400 px-3 py-2 text-sm font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {deletingId === announcement.id ? '刪除中...' : '刪除'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
