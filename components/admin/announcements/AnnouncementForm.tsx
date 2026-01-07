/**
 * AnnouncementForm Component
 * Feature: 007-system-enhancement (US4)
 *
 * 廣告表單元件（新增與編輯）
 * - 標題、連結、排序、啟用狀態
 * - 圖片上傳功能
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Upload } from 'lucide-react'
import { createAnnouncement, updateAnnouncement, uploadAnnouncementImage } from '@/lib/actions/announcements'
import type { Announcement } from '@/types'
import { toast } from 'sonner'

interface AnnouncementFormProps {
  announcement?: Announcement
}

export function AnnouncementForm({ announcement }: AnnouncementFormProps) {
  const router = useRouter()
  const isEdit = !!announcement

  const [formData, setFormData] = useState({
    title: announcement?.title || '',
    linkUrl: announcement?.link_url || '',
    isActive: announcement?.is_active ?? true,
  })

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(announcement?.image_url || null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 驗證檔案類型
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('僅支援 JPG、PNG、WebP 格式')
      return
    }

    // 驗證檔案大小
    if (file.size > 5 * 1024 * 1024) {
      toast.error('檔案大小不得超過 5MB')
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    try {
      if (isEdit) {
        // 編輯模式
        const result = await updateAnnouncement({
          announcementId: announcement.id,
          title: formData.title,
          linkUrl: formData.linkUrl || null,
          isActive: formData.isActive,
        })

        if (!result.success) {
          setErrors({})
          toast.error(result.message || '更新失敗')
          setIsSubmitting(false)
          return
        }

        // 如果有新圖片，上傳圖片
        if (imageFile) {
          const uploadResult = await uploadAnnouncementImage(announcement.id, imageFile)
          if (!uploadResult.success) {
            toast.error(uploadResult.message || '圖片上傳失敗')
          }
        }

        toast.success('廣告更新成功')
        router.push('/admin/announcements')
      } else {
        // 新增模式 - 必須有圖片
        if (!imageFile) {
          toast.error('請上傳廣告圖片')
          setIsSubmitting(false)
          return
        }

        // 先建立廣告記錄（使用暫時的 image_url）
        const result = await createAnnouncement({
          title: formData.title,
          imageUrl: 'https://placeholder.com/temp.jpg', // 暫時 URL
          linkUrl: formData.linkUrl || null,
          sortOrder: 0, // 預設排序為 0，後續可用拖曳調整
          isActive: formData.isActive,
        })

        if (!result.success || !result.data) {
          setErrors({})
          toast.error(result.message || '建立失敗')
          setIsSubmitting(false)
          return
        }

        // 上傳圖片
        const uploadResult = await uploadAnnouncementImage(result.data.id, imageFile)
        if (!uploadResult.success) {
          toast.error(uploadResult.message || '圖片上傳失敗')
          setIsSubmitting(false)
          return
        }

        toast.success('廣告建立成功')
        router.push('/admin/announcements')
      }
    } catch (error) {
      console.error('提交失敗:', error)
      toast.error('操作失敗，請稍後再試')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 標題 */}
      <div>
        <label className="mb-2 block font-bold">
          廣告標題 <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full rounded-none border-2 border-black px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="請輸入廣告標題（最多 100 字）"
          maxLength={100}
          required
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title[0]}</p>
        )}
      </div>

      {/* 連結 URL */}
      <div>
        <label className="mb-2 block font-bold">連結 URL（選填）</label>
        <input
          type="url"
          value={formData.linkUrl}
          onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
          className="w-full rounded-none border-2 border-black px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="https://example.com"
        />
        {errors.linkUrl && (
          <p className="mt-1 text-sm text-red-600">{errors.linkUrl[0]}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          點擊廣告時的跳轉連結，留空則不跳轉
        </p>
      </div>

      {/* 啟用狀態 */}
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="h-5 w-5 rounded-none border-2 border-black"
          />
          <span className="font-bold">啟用此廣告</span>
        </label>
        <p className="mt-1 text-sm text-gray-500">
          停用的廣告不會顯示在前台
        </p>
      </div>

      {/* 圖片上傳 */}
      <div>
        <label className="mb-2 block font-bold">
          廣告圖片 {!isEdit && <span className="text-red-600">*</span>}
        </label>
        <div className="mb-2 rounded-none border-2 border-blue-500 bg-blue-50 p-3">
          <p className="text-sm font-bold text-blue-900">
            📐 建議尺寸：1200 × 400 像素（16:9 或 3:1 比例）
          </p>
          <p className="mt-1 text-xs text-blue-700">
            適合桌面與行動裝置顯示的輪播廣告尺寸
          </p>
        </div>

        {imagePreview && (
          <div className="mb-4 relative aspect-video overflow-hidden rounded-none border-2 border-black bg-gray-100">
            <Image
              src={imagePreview}
              alt="Preview"
              fill
              className="object-cover"
            />
          </div>
        )}

        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-none border-2 border-black bg-blue-100 px-4 py-3 font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none">
          <Upload className="h-5 w-5" />
          {imagePreview ? '更換圖片' : '上傳圖片'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            className="hidden"
          />
        </label>
        <p className="mt-1 text-sm text-gray-500">
          支援 JPG、PNG、WebP 格式，檔案大小不得超過 5MB
        </p>
      </div>

      {/* 提交按鈕 */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-none border-3 border-black bg-green-400 px-6 py-3 font-bold shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? '處理中...' : isEdit ? '更新廣告' : '建立廣告'}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-none border-3 border-black bg-gray-200 px-6 py-3 font-bold shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          取消
        </button>
      </div>
    </form>
  )
}
