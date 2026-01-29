'use client'

import { useState, useEffect } from 'react'
import { X, Upload, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { designTokens } from '@/lib/design-tokens'
import { uploadBlockImage } from '@/lib/actions/home-blocks'
import { deleteBlockImages } from '@/lib/utils/block-image-cleanup'
import { getActiveSeries } from '@/lib/actions/shop'
import { getComboDealsList } from '@/lib/actions/combo-deals' // 🆕 Feature 021: 組合優惠列表
import type { Series, ImageCarouselConfig } from '@/types'
import { useAlert } from '@/lib/contexts/dialog-context'

interface ImageUploadMultipleProps {
  blockId: string | null // 新建時為 null
  images: ImageCarouselConfig['images']
  onChange: (images: ImageCarouselConfig['images']) => void
}

/**
 * 多圖片上傳元件
 * 支援最多 5 張圖片，每張圖片可選擇性設定系列連結
 */
export function ImageUploadMultiple({ blockId, images = [], onChange }: ImageUploadMultipleProps) {
  const alert = useAlert()
  const [uploading, setUploading] = useState<number | null>(null) // 正在上傳的圖片索引
  const [series, setSeries] = useState<Series[]>([])
  const [comboDeals, setComboDeals] = useState<Array<{ id: string; name: string }>>([]) // 🆕 Feature 021: 組合優惠列表
  const [loadingData, setLoadingData] = useState(true) // 修改：統一載入狀態

  // 載入系列列表與組合優惠列表
  useEffect(() => {
    async function fetchData() {
      const [seriesResult, comboDealsResult] = await Promise.all([
        getActiveSeries(),
        getComboDealsList({ status: 'active' }), // 🆕 Feature 021: 載入組合優惠
      ])

      if (seriesResult.success && seriesResult.data) {
        setSeries(seriesResult.data)
      }

      if (comboDealsResult.success && comboDealsResult.data) {
        setComboDeals(comboDealsResult.data.items.map(cd => ({ id: cd.id, name: cd.name })))
      }

      setLoadingData(false)
    }
    fetchData()
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

    // 讀取圖片尺寸
    const dimensions = await getImageDimensions(file)

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

    // 更新圖片列表（包含尺寸資訊）
    const newImages = [...images]
    newImages[index] = {
      url: result.data!.url,
      series_id: null,
      combo_deal_id: null, // 🆕 Feature 021: 預設無組合優惠連結
      width: dimensions.width,
      height: dimensions.height,
    }
    onChange(newImages)
  }

  // 取得圖片尺寸
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ width: img.width, height: img.height })
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('無法讀取圖片尺寸'))
      }

      img.src = url
    })
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
    // 設定系列時清除組合優惠連結（互斥）
    newImages[index] = { ...newImages[index], series_id: seriesId || null, combo_deal_id: null }
    onChange(newImages)
  }

  // 🆕 Feature 021: 處理組合優惠連結設定
  const handleComboDealChange = (index: number, comboDealId: string | null) => {
    const newImages = [...images]
    // 設定組合優惠時清除系列連結（互斥）
    newImages[index] = { ...newImages[index], combo_deal_id: comboDealId || null, series_id: null }
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
            <div className="relative w-32 shrink-0">
              <div className="relative w-full aspect-square">
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
              {/* 圖片尺寸資訊 */}
              {(image as any).width && (image as any).height && (
                <div className="mt-1 text-xs text-gray-600 text-center">
                  {(image as any).width} × {(image as any).height} px
                </div>
              )}
            </div>

            {/* 連結設定（系列或組合優惠） */}
            <div className="flex-1 space-y-3">
              {/* 系列連結 */}
              <div>
                <label className="block text-xs font-medium mb-1">
                  點擊圖片跳轉到系列（可選）
                </label>
                {loadingData ? (
                  <div className="text-xs text-gray-500">載入中...</div>
                ) : (
                  <select
                    value={image.series_id || ''}
                    onChange={(e) => handleSeriesChange(index, e.target.value || null)}
                    disabled={!!(image as any).combo_deal_id} // 🆕 已設定組合優惠時禁用
                    className={`
                      w-full rounded-none bg-white text-sm
                      ${designTokens.neoBrutalism.border.mobile}
                      border-black px-3 py-2
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      disabled:opacity-50 disabled:cursor-not-allowed
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

              {/* 🆕 Feature 021: 組合優惠連結 */}
              <div>
                <label className="block text-xs font-medium mb-1">
                  或跳轉到組合優惠（可選）
                </label>
                {loadingData ? (
                  <div className="text-xs text-gray-500">載入中...</div>
                ) : (
                  <select
                    value={(image as any).combo_deal_id || ''}
                    onChange={(e) => handleComboDealChange(index, e.target.value || null)}
                    disabled={!!image.series_id} // 已設定系列時禁用
                    className={`
                      w-full rounded-none bg-white text-sm
                      ${designTokens.neoBrutalism.border.mobile}
                      border-black px-3 py-2
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <option value="">不設定組合優惠連結</option>
                    {comboDeals.map((combo) => (
                      <option key={combo.id} value={combo.id}>
                        {combo.name}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  💡 系列連結與組合優惠連結僅能擇一設定
                </p>
              </div>
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

      <div className="space-y-1">
        <p className="text-xs text-gray-600">
          <strong>建議尺寸：</strong>1280 × 720 像素（16:9 比例）
        </p>
        <p className="text-xs text-gray-600">
          支援 JPG、PNG、WebP 格式，單張圖片最大 5MB，最多上傳 5 張圖片
        </p>
        <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 border border-amber-300 rounded">
          <strong>設計提示：</strong>重要內容請放在中央 80% 區域，邊緣可能被裁切
        </p>
      </div>
    </div>
  )
}
