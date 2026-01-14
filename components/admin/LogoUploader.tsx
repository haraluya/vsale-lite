'use client'

/**
 * Logo 上傳元件（簡化版）
 * Feature: 008-system-admin (T059)
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Trash2, X, Check } from 'lucide-react'
import { useConfirm } from '@/lib/contexts/dialog-context'
import { toast } from 'sonner'

interface LogoUploaderProps {
  logoType: 'logo' | 'logo-icon' | 'favicon'
  currentUrl?: string
  uploadAction: (formData: FormData) => Promise<void>
  deleteAction: (formData: FormData) => Promise<void>
}

export function LogoUploader({
  logoType,
  currentUrl,
  uploadAction,
  deleteAction,
}: LogoUploaderProps) {
  const confirm = useConfirm()
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 驗證檔案大小（2MB）
    if (file.size > 2 * 1024 * 1024) {
      toast.error('檔案大小不可超過 2MB')
      e.target.value = ''
      return
    }

    // 驗證檔案類型
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      toast.error('僅支援 JPG, PNG, WebP, SVG 格式')
      e.target.value = ''
      return
    }

    // 建立預覽
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
      setPreviewFile(file)
    }
    reader.readAsDataURL(file)

    // 清空 input
    e.target.value = ''
  }

  const handleCancelPreview = () => {
    setPreviewFile(null)
    setPreviewUrl(null)
  }

  const handleConfirmUpload = async () => {
    if (!previewFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('logoType', logoType)
      formData.append('file', previewFile)
      await uploadAction(formData)

      // 清空預覽
      setPreviewFile(null)
      setPreviewUrl(null)
    } catch (error) {
      console.error('上傳失敗:', error)
      toast.error('上傳失敗，請重試')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: '確認刪除',
      description: '確定要刪除此 Logo 嗎？',
      variant: 'danger',
      confirmText: '刪除',
      cancelText: '取消',
    })

    if (!confirmed) return

    setDeleting(true)
    try {
      const formData = new FormData()
      formData.append('logoType', logoType)
      await deleteAction(formData)
    } finally {
      setDeleting(false)
    }
  }

  const logoTypeLabels = {
    logo: '網站 Logo',
    'logo-icon': '圖示版 Logo',
    favicon: 'Favicon',
  }

  const logoRecommendedSizes = {
    logo: '200 × 60 像素',
    'logo-icon': '60 × 60 像素',
    favicon: '60 × 60 像素',
  }

  // 如果有預覽檔案，顯示藍色邊框
  const borderColor = previewFile ? 'border-blue-500' : 'border-black'

  return (
    <div className={`rounded-none border-2 md:border-3 ${borderColor} bg-white p-4 shadow-neo`}>
      <h3 className="text-lg font-black mb-4">
        {logoTypeLabels[logoType]}
        {previewFile && <span className="ml-2 text-xs text-blue-600">(待確認)</span>}
      </h3>

      {/* 當前 Logo 或預覽 */}
      {(currentUrl || previewUrl) && (
        <div className="mb-4">
          <div className="rounded-none border-2 border-gray-300 p-4 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl || currentUrl || ''}
              alt={logoTypeLabels[logoType]}
              className="max-h-20 object-contain mx-auto"
            />
          </div>
          {previewUrl && (
            <p className="mt-2 text-sm text-blue-600 font-bold">
              ⬆️ 預覽新圖片（點擊「確認上傳」以儲存）
            </p>
          )}
        </div>
      )}

      {/* 上傳按鈕與操作 */}
      {!previewFile ? (
        <div className="flex gap-2">
          <label className="flex-1">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={handleFileSelect}
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
                e.currentTarget.previousElementSibling?.dispatchEvent(new MouseEvent('click'))
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? '上傳中...' : '選擇圖片'}
            </Button>
          </label>

          {/* 刪除按鈕 */}
          {currentUrl && (
            <Button type="button" variant="danger" onClick={handleDelete} disabled={uploading || deleting}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleCancelPreview}
            disabled={uploading}
          >
            <X className="mr-2 h-4 w-4" />
            取消
          </Button>
          <Button type="button" className="flex-1" onClick={handleConfirmUpload} disabled={uploading}>
            <Check className="mr-2 h-4 w-4" />
            {uploading ? '上傳中...' : '確認上傳'}
          </Button>
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500">
        建議尺寸：{logoRecommendedSizes[logoType]} | 支援格式：JPG, PNG, WebP, SVG | 最大 2MB
      </p>
    </div>
  )
}
