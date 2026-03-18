/**
 * New Announcement Page (新增廣告頁)
 * Feature: 007-system-enhancement (US4)
 */

import { AnnouncementForm } from '@/components/admin/announcements/AnnouncementForm'
import { getSeries } from '@/lib/actions/series'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  return generatePageMetadata('新增廣告', '建立新的輪播廣告')
}

export default async function NewAnnouncementPage() {
  // 查詢所有系列（含分類資訊）
  const seriesResult = await getSeries()

  if (!seriesResult.success || !seriesResult.data) {
    redirect('/admin/announcements')
  }

  const series = seriesResult.data
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/announcements"
          className="rounded-theme-sm border bg-surface p-2 shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">新增廣告</h1>
          <p className="mt-1 text-text-secondary">建立新的輪播廣告</p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-theme-sm border-theme bg-surface p-6 shadow-neo">
        <AnnouncementForm series={series} />
      </div>
    </div>
  )
}
