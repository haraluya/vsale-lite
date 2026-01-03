'use client'

/**
 * Image Upload Component
 * Feature: 002-product-management (US4)
 *
 * 提供圖片上傳、預覽、刪除功能
 * 支援 JPG, PNG, WebP 格式,限制 5MB
 */

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2 } from 'lucide-react'
import { uploadProductImage, deleteProductImage } from '@/lib/actions/products'
import { Button } from '@/components/ui/button'

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
  const [imageUrl, setImageUrl] = useState<string | null>(currentImageUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setUploading(true)

    try {
      const result = await uploadProductImage(productId, file)

      if (result.success && result.data?.url) {
        setImageUrl(result.data.url)
        onUploadSuccess?.(result.data.url)
      } else {
        setError(result.message || '上傳失敗')
      }
    } catch (err) {
      setError('上傳失敗,請稍後再試')
      console.error('Image upload error:', err)
    } finally {
      setUploading(false)
      // 清除檔案輸入,允許重複上傳同檔案
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async () => {
    if (!confirm('確定要刪除此圖片嗎?')) return

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
          <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-none border-3 border-black shadow-neo">
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
                  上傳中...
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
              className="rounded-none border-3 border-black bg-red-100 px-6 py-3 font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={uploading ? undefined : triggerFileInput}
          className={`flex aspect-square w-full max-w-md cursor-pointer flex-col items-center justify-center rounded-none border-3 border-dashed border-black bg-gray-50 p-8 shadow-neo transition-colors hover:bg-gray-100 ${
            uploading ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
              <p className="mt-4 text-sm font-bold text-gray-600">上傳中...</p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-gray-400" />
              <p className="mt-4 text-sm font-bold text-gray-600">點擊上傳商品圖片</p>
              <p className="mt-2 text-xs text-gray-500">支援 JPG, PNG, WebP (最大 5MB)</p>
            </>
          )}
        </div>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <div className="rounded-none border-3 border-red-600 bg-red-50 p-4">
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
        • 檔案大小限制: 5MB
        <br />• 上傳新圖片將自動覆蓋舊圖片
      </p>
    </div>
  )
}
