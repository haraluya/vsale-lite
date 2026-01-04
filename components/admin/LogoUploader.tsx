'use client'

/**
 * Logo 上傳元件（簡化版）
 * Feature: 008-system-admin (T059)
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Trash2 } from 'lucide-react'

interface LogoUploaderProps {
  logoType: 'logo' | 'logo-icon' | 'favicon'
  currentUrl?: string
  onUpload: (file: File) => Promise<void>
  onDelete: () => Promise<void>
}

export function LogoUploader({
  logoType,
  currentUrl,
  onUpload,
  onDelete,
}: LogoUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      await onUpload(file)
      e.target.value = '' // 清空輸入框
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('確定要刪除此 Logo 嗎？')) return

    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  const logoTypeLabels = {
    logo: '完整版 Logo',
    'logo-icon': '圖示版 Logo',
    favicon: 'Favicon',
  }

  return (
    <div className="rounded-none border-3 border-black bg-white p-4 shadow-neo">
      <h3 className="text-lg font-black mb-4">{logoTypeLabels[logoType]}</h3>

      {/* 當前 Logo 預覽 */}
      {currentUrl && (
        <div className="mb-4">
          <div className="rounded-none border-2 border-gray-300 p-4 bg-gray-50">
            <img
              src={currentUrl}
              alt={logoTypeLabels[logoType]}
              className="max-h-20 object-contain"
            />
          </div>
        </div>
      )}

      {/* 上傳按鈕 */}
      <div className="flex gap-2">
        <label className="flex-1">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={handleFileChange}
            disabled={uploading || deleting}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={uploading || deleting}
            onClick={(e) => {
              e.preventDefault()
              e.currentTarget.previousElementSibling?.dispatchEvent(
                new MouseEvent('click')
              )
            }}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? '上傳中...' : '上傳 Logo'}
          </Button>
        </label>

        {/* 刪除按鈕 */}
        {currentUrl && (
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={uploading || deleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        支援格式：JPG, PNG, WebP, SVG | 最大 2MB
      </p>
    </div>
  )
}
