'use client'

/**
 * Product Thumbnail Component
 * 商品縮圖元件 - 可快速上傳商品圖片
 */

import { useState, useRef } from 'react'
import { Upload, Image as ImageIcon, X } from 'lucide-react'
import Image from 'next/image'
import { uploadProductImage } from '@/lib/actions/products'
import { cn } from '@/lib/utils'
import { useAlert } from '@/lib/contexts/dialog-context'

interface ProductThumbnailProps {
  productId: string
  imageUrl: string | null
  productName: string
  onUploadSuccess?: () => void
}

export function ProductThumbnail({
  productId,
  imageUrl,
  productName,
  onUploadSuccess
}: ProductThumbnailProps) {
  const [uploading, setUploading] = useState(false)
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(imageUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const alert = useAlert()

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const result = await uploadProductImage(productId, file)

      if (result.success && result.data) {
        setCurrentImageUrl(result.data.url)
        await alert({
          title: '上傳成功',
          message: result.message || '圖片已成功上傳',
          variant: 'success'
        })
        onUploadSuccess?.()
      } else {
        await alert({
          title: '上傳失敗',
          message: result.message || '圖片上傳失敗',
          variant: 'error'
        })
      }
    } catch (error) {
      await alert({
        title: '上傳失敗',
        message: '圖片上傳失敗',
        variant: 'error'
      })
    } finally {
      setUploading(false)
      // 清空 input，允許重複上傳同一檔案
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        className={cn(
          "relative w-12 h-12 rounded-none border-2 md:border-3 border-black overflow-hidden",
          "transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] md:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
          "hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] md:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] md:disabled:hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
          currentImageUrl ? "bg-gray-100" : "bg-blue-50"
        )}
        title={uploading ? "上傳中..." : "點擊上傳商品圖片"}
      >
        {currentImageUrl ? (
          <Image
            src={currentImageUrl}
            alt={productName}
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            {uploading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
            ) : (
              <ImageIcon className="h-5 w-5 text-gray-400" />
            )}
          </div>
        )}
      </button>

      {/* 隱藏的檔案輸入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 上傳圖示覆蓋層 */}
      {!uploading && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full border border-black bg-blue-400 flex items-center justify-center">
          <Upload className="h-2.5 w-2.5 text-white" />
        </div>
      )}
    </div>
  )
}
