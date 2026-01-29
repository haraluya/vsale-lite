'use client'

/**
 * Image Upload Component
 * Feature: 002-product-management (US4)
 *
 * 提供圖片上傳、預覽、刪除功能
 * 支援 JPG, PNG, WebP 格式,限制 3MB
 */

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2 } from 'lucide-react'
import { deleteProductImage, updateProductImageUrl } from '@/lib/actions/products'
import { uploadProductImageDirect } from '@/lib/supabase/client-upload'
import { compressProductImage, shouldCompress } from '@/lib/utils/image-compression'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/lib/contexts/dialog-context'

/**
 * 為 Promise 添加超時保護（保留用於刪除功能）
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('操作超時，請檢查網路連線後重試')), timeoutMs)
    ),
  ])
}

/**
 * 格式化上傳狀態文字
 */
function getUploadStatusText(
  isCompressing: boolean,
  isUploading: boolean,
  progress: number
): string {
  if (isCompressing) return '壓縮中...'
  if (isUploading) {
    if (progress < 10) return '準備上傳...'
    if (progress < 90) return `上傳中... ${Math.round(progress)}%`
    return '更新資料庫...'
  }
  return '上傳中...'
}

interface ImageUploadProps {
  productId: string
  currentImageUrl?: string | null
  onUploadSuccess?: (url: string) => void
  onDeleteSuccess?: () => void
}

export function ImageUpload({
  productId,
  currentImageUrl,
  onUploadSuccess,
  onDeleteSuccess,
}: ImageUploadProps) {
  const confirm = useConfirm()
  const [imageUrl, setImageUrl] = useState<string | null>(currentImageUrl || null)
  const [uploading, setUploading] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setUploading(true)
    setProgress(0)

    try {
      let fileToUpload = file

      // 1. 壓縮圖片（如果需要）
      if (shouldCompress(file)) {
        setIsCompressing(true)
        console.log('🗜️ 圖片大小超過 1MB，開始壓縮...')
        fileToUpload = await compressProductImage(file)
        setIsCompressing(false)
        setProgress(5)
      }

      // 2. 直接上傳至 Supabase Storage
      console.log('📤 開始直接上傳至 Supabase Storage...')
      const uploadResult = await uploadProductImageDirect(
        productId,
        fileToUpload,
        (uploadProgress) => {
          // 進度：5-90%
          setProgress(5 + uploadProgress * 0.85)
        }
      )

      if (!uploadResult.success || !uploadResult.url) {
        setError(uploadResult.error || '上傳失敗')
        return
      }

      setProgress(90)

      // 3. 呼叫 Server Action 更新資料庫
      console.log('💾 更新資料庫 image_url...')
      const updateResult = await updateProductImageUrl(productId, uploadResult.url)

      if (!updateResult.success) {
        setError(updateResult.message || '更新資料庫失敗')
        return
      }

      setProgress(100)
      setImageUrl(uploadResult.url)
      onUploadSuccess?.(uploadResult.url)
      console.log('✅ 圖片上傳完成!')
    } catch (err) {
      setError('上傳失敗，請稍後再試')
      console.error('Image upload error:', err)
    } finally {
      setUploading(false)
      setIsCompressing(false)
      setProgress(0)
      // 清除檔案輸入，允許重複上傳同檔案
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: '刪除圖片',
      description: '確定要刪除此圖片嗎？',
      variant: 'danger'
    })

    if (!confirmed) return

    setError(null)
    setUploading(true)

    try {
      const result = await deleteProductImage(productId)

      if (result.success) {
        setImageUrl(null)
        onDeleteSuccess?.()
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError('刪除失敗,請稍後再試')
      console.error('Image delete error:', err)
    } finally {
      setUploading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      {/* 隱藏的檔案輸入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {/* 圖片預覽或上傳區域 */}
      {imageUrl ? (
        <div className="relative">
          <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-none border-2 md:border-3 border-black shadow-neo">
            <Image
              src={imageUrl}
              alt="商品圖片"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>

          {/* 操作按鈕 */}
          <div className="mt-4 flex gap-3">
            <Button
              type="button"
              onClick={triggerFileInput}
              disabled={uploading}
              variant="outline"
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {getUploadStatusText(isCompressing, uploading, progress)}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  替換圖片
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={uploading}
              className="rounded-none border-2 md:border-3 border-black bg-red-100 px-6 py-3 font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={uploading ? undefined : triggerFileInput}
          className={`flex aspect-square w-full max-w-md cursor-pointer flex-col items-center justify-center rounded-none border-2 md:border-3 border-dashed border-black bg-gray-50 p-8 shadow-neo transition-colors hover:bg-gray-100 ${
            uploading ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
              <p className="mt-4 text-sm font-bold text-gray-600">
                {getUploadStatusText(isCompressing, uploading, progress)}
              </p>
              {progress > 0 && !isCompressing && (
                <div className="mt-4 w-full max-w-xs">
                  {/* Neo-Brutalism 進度條 */}
                  <div className="h-6 w-full rounded-none border-2 border-black bg-white shadow-neo-sm overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-center text-xs text-gray-500">
                    {Math.round(progress)}%
                  </p>
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">大檔案可能需要 30-60 秒，請耐心等候</p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-gray-400" />
              <p className="mt-4 text-sm font-bold text-gray-600">點擊上傳商品圖片</p>
              <p className="mt-2 text-xs text-gray-500">支援 JPG, PNG, WebP (最大 3MB)</p>
            </>
          )}
        </div>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <div className="rounded-none border-2 md:border-3 border-red-600 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-800">{error}</p>
        </div>
      )}

      {/* 建議尺寸提示 */}
      <div className="rounded-none border-2 border-blue-500 bg-blue-50 p-3">
        <p className="text-sm font-bold text-blue-900">
          📐 建議尺寸：800 × 800 像素（正方形 1:1 比例）
        </p>
        <p className="mt-1 text-xs text-blue-700">
          正方形圖片最適合商品展示，確保在各種裝置上都能完整顯示
        </p>
      </div>

      {/* 提示訊息 */}
      <p className="text-xs text-gray-600">
        • 支援格式: JPG, PNG, WebP
        <br />
        • 檔案大小限制: 3MB
        <br />• 上傳新圖片將自動覆蓋舊圖片
      </p>
    </div>
  )
}
