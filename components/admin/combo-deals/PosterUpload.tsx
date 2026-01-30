'use client'

/**
 * 組合優惠海報上傳元件
 * Feature: 021-combo-deals (T026-T028)
 * 支援預覽、Supabase Storage 上傳
 */

import { useState } from 'react'
import { Upload, Loader2, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useAlert } from '@/lib/contexts/dialog-context'
import { createClient } from '@/lib/supabase/client'
import { designTokens } from '@/lib/design-tokens'

interface PosterUploadProps {
  currentUrl?: string
  onUploadComplete: (url: string) => void
  disabled?: boolean
}

export function PosterUpload({ currentUrl, onUploadComplete, disabled = false }: PosterUploadProps) {
  const alert = useAlert()
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  /**
   * 處理檔案選擇 - 選擇後自動上傳
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 重置 input
    e.target.value = ''

    // 1. 驗證檔案類型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      await alert({
        title: '檔案格式錯誤',
        message: '僅支援 JPG、PNG、WebP 格式',
        variant: 'error',
      })
      return
    }

    // 2. 驗證檔案大小（3MB）
    const maxSize = 3 * 1024 * 1024
    if (file.size > maxSize) {
      await alert({
        title: '檔案過大',
        message: '檔案大小不可超過 3MB',
        variant: 'error',
      })
      return
    }

    // 3. 建立預覽並自動上傳
    const reader = new FileReader()
    reader.onloadend = async () => {
      setPreviewUrl(reader.result as string)
      // 自動上傳
      await uploadFile(file)
    }
    reader.readAsDataURL(file)
  }

  /**
   * 從 URL 中提取檔案路徑
   */
  const extractFilePathFromUrl = (url: string): string | null => {
    try {
      // URL 格式: https://[project-id].supabase.co/storage/v1/object/public/combo-deals/[file-path]
      const match = url.match(/\/combo-deals\/(.+)$/)
      return match ? `combo-deals/${match[1]}` : null
    } catch (error) {
      console.error('提取檔案路徑失敗:', error)
      return null
    }
  }

  /**
   * 刪除舊圖片
   */
  const deleteOldImage = async (imageUrl: string) => {
    const filePath = extractFilePathFromUrl(imageUrl)
    if (!filePath) return

    try {
      const supabase = createClient()
      await supabase.storage.from('combo-deals').remove([filePath])
      console.log('已刪除舊圖片:', filePath)
    } catch (error) {
      console.error('刪除舊圖片失敗:', error)
      // 不影響上傳流程，只記錄錯誤
    }
  }

  /**
   * 上傳檔案到 Supabase Storage
   */
  const uploadFile = async (file: File) => {
    setUploading(true)

    try {
      const supabase = createClient()

      // 1. 如果有舊圖片，先刪除
      if (currentUrl) {
        await deleteOldImage(currentUrl)
      }

      // 2. 產生唯一檔名
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `combo-deals/${fileName}`

      // 3. 上傳至 Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('combo-deals')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('上傳失敗:', uploadError)
        throw new Error(uploadError.message)
      }

      // 4. 取得公開 URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('combo-deals').getPublicUrl(uploadData.path)

      // 5. 回傳 URL
      onUploadComplete(publicUrl)

      // 6. 清空預覽
      setPreviewUrl(null)

      await alert({
        title: '上傳成功',
        message: '海報圖片已上傳',
        variant: 'success',
      })
    } catch (error) {
      console.error('上傳失敗:', error)
      // 清空預覽
      setPreviewUrl(null)
      await alert({
        title: '上傳失敗',
        message: error instanceof Error ? error.message : '上傳失敗，請重試',
        variant: 'error',
      })
    } finally {
      setUploading(false)
    }
  }

  /**
   * 手動刪除圖片
   */
  const handleDeleteImage = async () => {
    if (!currentUrl) return

    try {
      setUploading(true)
      await deleteOldImage(currentUrl)
      onUploadComplete('')
      await alert({
        title: '刪除成功',
        message: '海報圖片已刪除',
        variant: 'success',
      })
    } catch (error) {
      console.error('刪除失敗:', error)
      await alert({
        title: '刪除失敗',
        message: error instanceof Error ? error.message : '刪除失敗，請重試',
        variant: 'error',
      })
    } finally {
      setUploading(false)
    }
  }


  return (
    <div className={`rounded-none border-2 md:border-3 border-black bg-white p-4 shadow-neo`}>
      <h3 className={`${designTokens.typography.h3} mb-4`}>
        組合優惠海報 <span className="text-red-600">*</span>
        {uploading && <span className="ml-2 text-xs text-blue-600">(上傳中...)</span>}
      </h3>

      {/* 預覽區域 */}
      {(currentUrl || previewUrl) && (
        <div className="mb-4">
          <div className="rounded-none border-2 border-gray-300 bg-gray-50 p-2 overflow-hidden">
            <div className="relative w-full aspect-[16/9]">
              <Image
                src={previewUrl || currentUrl || ''}
                alt="組合優惠海報預覽"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          </div>
          {uploading && (
            <p className="mt-2 text-sm text-blue-600 font-bold flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              上傳中，請稍候...
            </p>
          )}
        </div>
      )}

      {/* 上傳與刪除按鈕 */}
      <div className="flex gap-2">
        <label className="flex-1">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={disabled || uploading}
            onClick={(e) => {
              e.preventDefault()
              const input = e.currentTarget.previousElementSibling as HTMLInputElement
              input?.click()
            }}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                上傳中...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {currentUrl ? '更換圖片' : '選擇圖片'}
              </>
            )}
          </Button>
        </label>

        {/* 刪除按鈕 - 僅在有圖片時顯示 */}
        {currentUrl && !uploading && (
          <Button
            type="button"
            variant="outline"
            onClick={handleDeleteImage}
            disabled={disabled}
            className="border-red-500 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        建議尺寸：16:9 比例（例如 1920×1080 像素） | 支援格式：JPG, PNG, WebP | 最大 3MB
      </p>
    </div>
  )
}
