/**
 * New Announcement Page (新增廣告頁)
 * Feature: 007-system-enhancement (US4)
 */

import { AnnouncementForm } from '@/components/admin/announcements/AnnouncementForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewAnnouncementPage() {
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
          <h1 className="text-3xl font-bold">新增廣告</h1>
          <p className="mt-1 text-gray-600">建立新的輪播廣告</p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
        <AnnouncementForm />
      </div>
    </div>
  )
}
