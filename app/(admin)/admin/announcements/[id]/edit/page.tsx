/**
 * Edit Announcement Page (編輯廣告頁)
 * Feature: 007-system-enhancement (US4)
 */

import { getAllAnnouncements } from '@/lib/actions/announcements'
import { getSeries } from '@/lib/actions/series'
import { AnnouncementForm } from '@/components/admin/announcements/AnnouncementForm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface EditAnnouncementPageProps {
  params: Promise<{ id: string }>
}

export default async function EditAnnouncementPage({ params }: EditAnnouncementPageProps) {
  const { id } = await params

  // 查詢廣告資料
  const result = await getAllAnnouncements()
  const announcement = result.success
    ? result.data?.find((a) => a.id === id)
    : null

  if (!announcement) {
    notFound()
  }

  // 查詢所有系列（含分類資訊）
  const seriesResult = await getSeries()

  if (!seriesResult.success || !seriesResult.data) {
    notFound()
  }

  const series = seriesResult.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/announcements"
          className="rounded-none border-2 border-black bg-white p-2 shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">編輯廣告</h1>
          <p className="mt-1 text-gray-600">{announcement.title}</p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
        <AnnouncementForm announcement={announcement} series={series} />
      </div>
    </div>
  )
}
