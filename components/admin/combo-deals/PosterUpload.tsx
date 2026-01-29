'use client'

/**
 * 組合優惠海報上傳元件
 * Feature: 021-combo-deals (T026-T028)
 * 支援 16:9 比例驗證、預覽、Supabase Storage 上傳
 */

import { useState } from 'react'
import { Upload, X, Check, Loader2 } from 'lucide-react'
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

/**
 * T027: 圖片比例驗證函式
 *
 * 驗證圖片是否符合 16:9 比例（容差 ±5%）
 *
 * @param file 圖片檔案
 * @returns 驗證結果與圖片尺寸
 */
async function validateImageAspectRatio(file: File): Promise<{
  valid: boolean
  width: number
  height: number
  aspectRatio: number
  message?: string
}> {
  return new Promise((resolve) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const width = img.width
      const height = img.height
      const aspectRatio = width / height
      const targetRatio = 16 / 9 // 1.7778
      const tolerance = 0.05 // 5% 容差

      const valid = Math.abs(aspectRatio - targetRatio) / targetRatio <= tolerance

      resolve({
        valid,
        width,
        height,
        aspectRatio,
        message: valid
          ? undefined
          : `圖片比例為 ${aspectRatio.toFixed(2)} (${width}×${height}px)，必須為 16:9 (1.78)`,
      })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({
        valid: false,
        width: 0,
        height: 0,
        aspectRatio: 0,
        message: '無法讀取圖片尺寸',
      })
    }

    img.src = url
  })
}

export function PosterUpload({ currentUrl, onUploadComplete, disabled = false }: PosterUploadProps) {
  const alert = useAlert()
  const [uploading, setUploading] = useState(false)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  /**
   * 處理檔案選擇
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

    // 3. 驗證圖片比例（16:9）
    const validation = await validateImageAspectRatio(file)

    if (!validation.valid) {
      await alert({
        title: '圖片比例不符',
        message: validation.message || '圖片比例必須為 16:9',
        variant: 'error',
      })
      return
    }

    // 4. 建立預覽
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
      setPreviewFile(file)
    }
    reader.readAsDataURL(file)
  }

  /**
   * 取消預覽
   */
  const handleCancelPreview = () => {
    setPreviewFile(null)
    setPreviewUrl(null)
  }

  /**
   * T028: 整合 Supabase Storage 上傳
   *
   * 上傳海報圖片至 Supabase Storage (combo-deals bucket)
   */
  const handleConfirmUpload = async () => {
    if (!previewFile) return

    setUploading(true)

    try {
      // 1. 初始化 Supabase Client
      const supabase = createClient()

      // 2. 產生唯一檔名
      const fileExt = previewFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `combo-deals/${fileName}`

      // 3. 上傳至 Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('combo-deals')
        .upload(filePath, previewFile, {
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
      setPreviewFile(null)
      setPreviewUrl(null)

      await alert({
        title: '上傳成功',
        message: '海報圖片已上傳',
        variant: 'success',
      })
    } catch (error) {
      console.error('上傳失敗:', error)
      await alert({
        title: '上傳失敗',
        message: error instanceof Error ? error.message : '上傳失敗，請重試',
        variant: 'error',
      })
    } finally {
      setUploading(false)
    }
  }

  // 決定邊框顏色
  const borderColor = previewFile ? 'border-blue-500' : 'border-black'

  return (
    <div className={`rounded-none border-2 md:border-3 ${borderColor} bg-white p-4 shadow-neo`}>
      <h3 className={`${designTokens.typography.h3} mb-4`}>
        組合優惠海報 <span className="text-red-600">*</span>
        {previewFile && <span className="ml-2 text-xs text-blue-600">(待確認)</span>}
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
          {previewUrl && (
            <p className="mt-2 text-sm text-blue-600 font-bold">
              ⬆️ 預覽新圖片（點擊「確認上傳」以儲存）
            </p>
          )}
        </div>
      )}

      {/* 上傳按鈕與操作 */}
      {!previewFile ? (
        <label className="block">
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
            <Upload className="mr-2 h-4 w-4" />
            選擇圖片
          </Button>
        </label>
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
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                上傳中...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                確認上傳
              </>
            )}
          </Button>
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500">
        必須為 16:9 比例（容差 ±5%） | 支援格式：JPG, PNG, WebP | 最大 3MB
      </p>
    </div>
  )
}
