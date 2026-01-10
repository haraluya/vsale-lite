/**
 * SeriesForm Component
 * Feature: 003-series-and-pricing (US2)
 *
 * 系列表單元件 (管理員用)
 * - 建立/編輯系列資訊
 * - 選擇分類
 * - 上傳系列圖片
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createSeries, updateSeries, uploadSeriesImage } from '@/lib/actions/series'
import type { Series, Category } from '@/types'
import { Button } from '@/components/ui/button'
import { Upload, X } from 'lucide-react'
import { useAlert } from '@/lib/contexts/dialog-context'

interface SeriesFormProps {
  series?: Series
  categories: Category[]
  mode: 'create' | 'edit'
}

export function SeriesForm({ series, categories, mode }: SeriesFormProps) {
  const router = useRouter()
  const alert = useAlert()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(series?.image_url || null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 驗證檔案格式與大小
      const validFormats = ['image/jpeg', 'image/png', 'image/webp']
      const maxSize = 5 * 1024 * 1024 // 5MB

      if (!validFormats.includes(file.type)) {
        setError('圖片格式不支援（僅支援 JPG, PNG, WebP）')
        return
      }

      if (file.size > maxSize) {
        setError('圖片大小超過 5MB')
        return
      }

      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setError(null)
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    // 清空 file input
    const fileInput = document.getElementById('image') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 即時轉換為大寫
    e.target.value = e.target.value.toUpperCase()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)

    // 處理 category_id：將空字串轉換為 null（Zod Schema 期望 UUID 或 null）
    const rawCategoryId = formData.get('category_id') as string
    const categoryId = rawCategoryId && rawCategoryId.trim() !== '' ? rawCategoryId : null

    const data = {
      category_id: categoryId,
      code: (formData.get('code') as string).toUpperCase(),
      name: formData.get('name') as string,
      description: formData.get('description') as string || '',
      status: formData.get('status') as 'active' | 'inactive',
    }

    try {
      let result
      let seriesId: string

      if (mode === 'create') {
        result = await createSeries(data)
        if (!result.success) {
          // 顯示欄位級別錯誤
          if (result.errors) {
            setFieldErrors(result.errors)
          }
          setError(result.message || '建立系列失敗')
          return
        }
        if (!result.data) {
          setError('建立系列失敗：無法取得系列資料')
          return
        }
        seriesId = result.data.id
      } else {
        if (!series) {
          setError('系列資料不存在')
          return
        }
        result = await updateSeries(series.id, data)
        if (!result.success) {
          // 顯示欄位級別錯誤
          if (result.errors) {
            setFieldErrors(result.errors)
          }
          setError(result.message || '更新系列失敗')
          return
        }
        seriesId = series.id
      }

      // 如果有上傳圖片,則上傳
      if (imageFile && seriesId) {
        const uploadResult = await uploadSeriesImage(seriesId, imageFile)
        if (!uploadResult.success) {
          // 顯示錯誤對話框
          await alert({
            title: '圖片上傳失敗',
            message: uploadResult.message || '圖片上傳時發生錯誤，請重試',
            variant: 'error',
          })
          setLoading(false)
          return // 停止導向，讓用戶重試
        }
      }

      // 上傳成功，顯示成功訊息並導向列表頁
      await alert({
        title: mode === 'create' ? '建立成功' : '更新成功',
        message: imageFile ? '系列資料與圖片已儲存' : '系列資料已儲存',
        variant: 'success',
      })

      router.push('/admin/series')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 錯誤訊息 */}
      {error && (
        <div className="rounded-none border-2 border-red-600 bg-red-50 p-4">
          <p className="font-bold text-red-800">{error}</p>
        </div>
      )}

      {/* 基本資訊 */}
      <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
        <h2 className="mb-4 text-xl font-bold">基本資訊</h2>

        <div className="space-y-4">
          {/* 系列名稱 */}
          <div>
            <label htmlFor="name" className="mb-2 block font-bold">
              系列名稱 <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              defaultValue={series?.name}
              required
              className={`w-full rounded-none border-2 px-4 py-2 focus:outline-none focus:ring-2 ${
                fieldErrors.name
                  ? 'border-red-600 bg-red-50 focus:ring-red-500'
                  : 'border-black focus:ring-blue-500'
              }`}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-sm font-bold text-red-600">
                {fieldErrors.name[0]}
              </p>
            )}
          </div>

          {/* 系列代碼 */}
          <div>
            <label htmlFor="code" className="mb-2 block font-bold">
              系列代碼 <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="code"
              name="code"
              defaultValue={series?.code}
              onChange={handleCodeChange}
              required
              maxLength={10}
              pattern="^[A-Z]{3,10}$"
              placeholder="TEA"
              className={`w-full rounded-none border-2 px-4 py-2 uppercase focus:outline-none focus:ring-2 ${
                fieldErrors.code
                  ? 'border-red-600 bg-red-50 focus:ring-red-500'
                  : 'border-black focus:ring-blue-500'
              }`}
            />
            {fieldErrors.code ? (
              <p className="mt-1 text-sm font-bold text-red-600">
                {fieldErrors.code[0]}
              </p>
            ) : (
              <p className="mt-1 text-sm text-gray-500">
                3-10 個大寫英文字母,用於組成商品編號 (如: DRK-TEA-01)
              </p>
            )}
          </div>

          {/* 分類選擇 */}
          <div>
            <label htmlFor="category_id" className="mb-2 block font-bold">
              所屬分類
            </label>
            <select
              id="category_id"
              name="category_id"
              defaultValue={series?.category_id || ''}
              className="w-full rounded-none border-2 border-black px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">無分類</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* 描述 */}
          <div>
            <label htmlFor="description" className="mb-2 block font-bold">
              描述
            </label>
            <textarea
              id="description"
              name="description"
              defaultValue={series?.description || ''}
              rows={4}
              className="w-full rounded-none border-2 border-black px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 狀態 */}
          <div>
            <label htmlFor="status" className="mb-2 block font-bold">
              狀態 <span className="text-red-600">*</span>
            </label>
            <select
              id="status"
              name="status"
              defaultValue={series?.status || 'active'}
              required
              className="w-full rounded-none border-2 border-black px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">上架 (Active)</option>
              <option value="inactive">下架 (Inactive)</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">下架後,前台客戶將無法看到此系列</p>
          </div>
        </div>
      </div>

      {/* 系列圖片 */}
      <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
        <h2 className="mb-4 text-xl font-bold">系列圖片</h2>

        <div className="space-y-4">
          {/* 圖片預覽 */}
          {imagePreview && (
            <div className="relative rounded-none border-2 border-black p-4">
              <div className="relative h-64 w-full">
                <Image
                  src={imagePreview}
                  alt="系列圖片預覽"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 800px"
                  unoptimized={imagePreview.startsWith('blob:')}
                />
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute right-2 top-2 rounded-none border-2 border-black bg-red-500 p-2 font-bold text-white shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                title="移除圖片"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* 建議尺寸提示 */}
          <div className="rounded-none border-2 border-blue-500 bg-blue-50 p-3">
            <p className="text-sm font-bold text-blue-900">
              📐 建議尺寸：800 × 800 像素（正方形 1:1 比例）
            </p>
            <p className="mt-1 text-xs text-blue-700">
              正方形圖片最適合系列展示，確保在各種裝置上都能完整顯示
            </p>
          </div>

          {/* 上傳按鈕 */}
          <div>
            <label
              htmlFor="image"
              className="inline-flex cursor-pointer items-center gap-2 rounded-none border-2 border-black bg-yellow-300 px-4 py-2 font-bold shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              <Upload className="h-5 w-5" />
              {imagePreview ? '更換圖片' : '選擇圖片'}
            </label>
            <input
              type="file"
              id="image"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />
            <p className="mt-2 text-sm text-gray-500">
              支援 JPG, PNG, WebP 格式，大小不超過 5MB
            </p>
          </div>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? '處理中...' : mode === 'create' ? '建立系列' : '更新系列'}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          取消
        </Button>
      </div>
    </form>
  )
}
