'use client'

import { useState, useEffect } from 'react'
import { X, Upload, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { designTokens } from '@/lib/design-tokens'
import { uploadBlockImage } from '@/lib/actions/home-blocks'
import { deleteBlockImages } from '@/lib/utils/block-image-cleanup'
import { getActiveSeries } from '@/lib/actions/shop'
import type { Series } from '@/types'
import { useAlert } from '@/lib/contexts/dialog-context'

interface ImageUploadMultipleProps {
  blockId: string | null // 新建時為 null
  images: Array<{ url: string; series_id?: string | null }>
  onChange: (images: Array<{ url: string; series_id?: string | null }>) => void
}

/**
 * 多圖片上傳元件
 * 支援最多 5 張圖片，每張圖片可選擇性設定系列連結
 */
export function ImageUploadMultiple({ blockId, images, onChange }: ImageUploadMultipleProps) {
  const alert = useAlert()
  const [uploading, setUploading] = useState<number | null>(null) // 正在上傳的圖片索引
  const [series, setSeries] = useState<Series[]>([])
  const [loadingSeries, setLoadingSeries] = useState(true)

  // 載入系列列表
  useEffect(() => {
    async function fetchSeries() {
      const result = await getActiveSeries()
      if (result.success && result.data) {
        setSeries(result.data)
      }
      setLoadingSeries(false)
    }
    fetchSeries()
  }, [])

  // 處理圖片上傳
  const handleFileUpload = async (index: number, file: File) => {
    // 新建區塊時，blockId 為 null，需要先建立區塊
    if (!blockId) {
      await alert({
        title: '無法上傳圖片',
        message: '請先儲存區塊後再上傳圖片',
        variant: 'warning',
      })
      return
    }

    // 檔案驗證
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      await alert({
        title: '檔案格式錯誤',
        message: '僅支援 JPG、PNG、WebP 格式',
        variant: 'error',
      })
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      await alert({
        title: '檔案過大',
        message: '檔案大小不可超過 5MB',
        variant: 'error',
      })
      return
    }

    setUploading(index)

    // 上傳圖片
    const result = await uploadBlockImage(blockId, index, file)

    setUploading(null)

    if (!result.success) {
      await alert({
        title: '上傳失敗',
        message: result.message,
        variant: 'error',
      })
      return
    }

    // 更新圖片列表
    const newImages = [...images]
    newImages[index] = { url: result.data!.url, series_id: null }
    onChange(newImages)
  }

  // 處理圖片刪除
  const handleDelete = async (index: number) => {
    // 若區塊已建立，刪除 Storage 中的圖片
    if (blockId) {
      await deleteBlockImages(blockId, 'replace_image', { index })
    }

    const newImages = images.filter((_, i) => i !== index)
    onChange(newImages)
  }

  // 處理系列連結設定
  const handleSeriesChange = (index: number, seriesId: string | null) => {
    const newImages = [...images]
    newImages[index] = { ...newImages[index], series_id: seriesId || null }
    onChange(newImages)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className={`${designTokens.typography.label} text-foreground`}>
          圖片上傳 <span className="text-red-600">*</span>
        </label>
        <span className="text-xs text-gray-600">
          已上傳 {images.length} / 5 張
        </span>
      </div>

      {/* 已上傳的圖片列表 */}
      <div className="space-y-3">
        {images.map((image, index) => (
          <div
            key={index}
            className={`
              flex flex-col md:flex-row gap-3 p-3 rounded-none bg-white
              ${designTokens.neoBrutalism.border.full}
              ${designTokens.neoBrutalism.shadow.full}
              border-black
            `}
          >
            {/* 縮圖與刪除按鈕 */}
            <div className="relative w-32 h-32 shrink-0">
              <Image
                src={image.url}
                alt={`圖片 ${index + 1}`}
                fill
                className="object-cover border-2 border-black"
              />
              <button
                type="button"
                onClick={() => handleDelete(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 border-2 border-black"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black text-white text-xs text-center py-1">
                第 {index + 1} 張
              </div>
            </div>

            {/* 系列連結設定 */}
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1">
                點擊圖片跳轉到系列（可選）
              </label>
              {loadingSeries ? (
                <div className="text-xs text-gray-500">載入系列列表...</div>
              ) : (
                <select
                  value={image.series_id || ''}
                  onChange={(e) => handleSeriesChange(index, e.target.value || null)}
                  className={`
                    w-full rounded-none bg-white text-sm
                    ${designTokens.neoBrutalism.border.mobile}
                    border-black px-3 py-2
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                  `}
                >
                  <option value="">不設定連結（純展示）</option>
                  {series.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 上傳按鈕 */}
      {images.length < 5 && (
        <label
          className={`
            flex items-center justify-center gap-2 w-full py-3 rounded-none
            bg-blue-500 text-white font-medium cursor-pointer
            ${designTokens.neoBrutalism.border.full}
            ${designTokens.neoBrutalism.shadow.full}
            border-black
            hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
            transition-all
            ${uploading !== null || !blockId ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {uploading !== null ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>上傳中...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>上傳圖片</span>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading !== null || !blockId}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                handleFileUpload(images.length, file)
              }
              e.target.value = '' // 清空 input
            }}
          />
        </label>
      )}

      {!blockId && (
        <p className="text-xs text-amber-600 bg-amber-50 p-2 border-2 border-amber-600">
          請先儲存區塊後再上傳圖片
        </p>
      )}

      <p className="text-xs text-gray-600">
        支援 JPG、PNG、WebP 格式，單張圖片最大 5MB，最多上傳 5 張圖片
      </p>
    </div>
  )
}
