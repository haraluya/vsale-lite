'use client'

/**
 * Product Form Component
 * Feature: 002-product-management
 * Updated: Feature 003-series-and-pricing (US6 - 商品編號自動產生)
 */

import { useActionState, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, X } from 'lucide-react'
import { createProduct, updateProduct } from '@/lib/actions/products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorInline } from '@/components/ui/error-inline'
import { ImageUpload } from '@/components/ui/image-upload'
import { Loading } from '@/components/ui/loading'
import type { Product, Series } from '@/types'

interface ProductFormProps {
  product?: Product
  series: Series[]  // 🔄 Feature 003: 改為系列列表 (取代 categories)
  mode: 'create' | 'edit'
}

export function ProductForm({ product, series, mode }: ProductFormProps) {
  const router = useRouter()

  // 使用受控元件來保留使用者輸入
  const [formData, setFormData] = useState({
    name: product?.name || '',
    series_id: product?.series_id || '',
    description: product?.description || '',
    retail_price: product?.retail_price?.toString() || '',  // 🆕 Feature 003 Enhancement: 零售價格必填
    stock: product?.stock?.toString() || '0',
    stock_status: product?.stock_status || 'sufficient',  // 🆕 Feature 003: 庫存狀態
    unit: product?.unit || '件',
    status: product?.status || 'active',
  })

  // 🆕 批次新增商品名稱功能 (僅建立模式)
  const [productNames, setProductNames] = useState<string[]>([''])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // 批次建立商品的處理函數
  const handleBatchCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    const formDataObj = new FormData(e.currentTarget)

    // 過濾掉空的商品名稱
    const validNames = productNames.filter(n => n.trim())

    if (validNames.length === 0) {
      setSubmitError('請至少輸入一個商品名稱')
      setIsSubmitting(false)
      return
    }

    try {
      // 循環建立每個商品
      for (const name of validNames) {
        const formData = new FormData()
        formData.set('name', name)
        formData.set('series_id', formDataObj.get('series_id') || '')
        formData.set('description', formDataObj.get('description') || '')
        formData.set('retail_price', formDataObj.get('retail_price') || '0')
        formData.set('stock', formDataObj.get('stock') || '0')
        formData.set('stock_status', formDataObj.get('stock_status') || 'sufficient')
        formData.set('unit', formDataObj.get('unit') || '件')
        formData.set('status', formDataObj.get('status') || 'active')

        const result = await createProduct(null, formData)
        if (!result.success) {
          throw new Error(`建立商品「${name}」失敗: ${result.message}`)
        }
      }

      setSubmitSuccess(true)
      router.push('/admin/products')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '批次建立失敗')
    } finally {
      setIsSubmitting(false)
    }
  }

  const action = mode === 'create'
    ? createProduct
    : (prev: any, formData: FormData) => updateProduct(product!.id, prev, formData)

  const [state, formAction, isPending] = useActionState<any>(action as any, null)

  // 🆕 監聽成功狀態,自動導向商品列表
  useEffect(() => {
    if (state?.success && mode === 'create') {
      router.push('/admin/products')
    } else if (state?.success && mode === 'edit') {
      router.push('/admin/products')
    }
  }, [state?.success, mode, router])

  const handleCancel = () => {
    router.back()
  }

  return (
    <div className="mx-auto max-w-2xl rounded-none border-3 border-black bg-white p-8 shadow-neo">
      <form
        action={mode === 'edit' || productNames.length === 1 ? formAction : undefined}
        onSubmit={mode === 'create' && productNames.length > 1 ? handleBatchCreate : undefined}
        className="space-y-6"
      >
        {/* 商品編號 (僅編輯模式顯示 - US6) */}
        {mode === 'edit' && (
          <div>
            <label htmlFor="code" className="mb-2 block font-bold">
              商品編號
            </label>
            <Input
              id="code"
              name="code"
              defaultValue={product?.code}
              disabled
              className="cursor-not-allowed bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-600">
              商品編號由系統自動產生，建立後不可修改
            </p>
          </div>
        )}

        {/* 商品名稱 (建立模式支援批次新增) */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="name" className="font-bold">
              商品名稱 <span className="text-red-600">*</span>
            </label>
            {mode === 'create' && (
              <button
                type="button"
                onClick={() => setProductNames([...productNames, ''])}
                className="flex items-center gap-1 rounded-none border-2 border-black bg-green-300 px-3 py-1 text-sm font-bold shadow-neo-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
              >
                <span className="text-lg">+</span> 批次新增
              </button>
            )}
          </div>

          {mode === 'edit' ? (
            <>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如: 可口可樂 350ml"
              />
              <ErrorInline message={state?.errors?.name?.[0]} />
            </>
          ) : (
            <div className="space-y-2">
              {productNames.map((name, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    id={index === 0 ? 'name' : `name_${index}`}
                    name="name"
                    value={name}
                    onChange={(e) => {
                      const newNames = [...productNames]
                      newNames[index] = e.target.value
                      setProductNames(newNames)
                      if (index === 0) {
                        setFormData({ ...formData, name: e.target.value })
                      }
                    }}
                    placeholder={`商品名稱 ${index + 1}`}
                    className="flex-1"
                  />
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newNames = productNames.filter((_, i) => i !== index)
                        setProductNames(newNames)
                      }}
                      className="rounded-none border-2 border-black bg-red-300 px-3 font-bold shadow-neo-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <ErrorInline message={state?.errors?.name?.[0]} />
              {productNames.length > 1 && (
                <p className="text-sm text-gray-600">
                  💡 將建立 {productNames.filter(n => n.trim()).length} 個商品,其他欄位(系列、價格、庫存等)相同
                </p>
              )}
            </div>
          )}
        </div>

        {/* 商品系列 */}
        <div>
          <label htmlFor="series_id" className="mb-2 block font-bold">
            商品系列 <span className="text-red-600">*</span>
          </label>
          <select
            id="series_id"
            name="series_id"
            value={formData.series_id}
            onChange={(e) => setFormData({ ...formData, series_id: e.target.value })}
            className="w-full rounded-none border-3 border-black px-4 py-2 font-bold shadow-neo-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">請選擇系列</option>
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <ErrorInline message={state?.errors?.series_id?.[0]} />
        </div>

        {/* 商品描述 */}
        <div>
          <label htmlFor="description" className="mb-2 block font-bold">
            商品描述 <span className="text-gray-500">(選填)</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="輸入商品描述..."
            rows={4}
            className="w-full rounded-none border-3 border-black px-4 py-2 font-bold shadow-neo-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <ErrorInline message={state?.errors?.description?.[0]} />
        </div>

        {/* 零售價格 (必填) */}
        <div>
          <label htmlFor="retail_price" className="mb-2 block font-bold">
            零售價格 <span className="text-red-600">*</span>
          </label>
          <Input
            id="retail_price"
            name="retail_price"
            type="number"
            min="0"
            step="1"
            value={formData.retail_price}
            onChange={(e) => setFormData({ ...formData, retail_price: e.target.value })}
            placeholder="0"
          />
          <p className="mt-1 text-xs text-gray-600">
            零售價格是商品的基準價格,用於顯示折扣力度與自動建立零售等級價格
          </p>
          <ErrorInline message={state?.errors?.retail_price?.[0]} />
        </div>

        {/* 庫存數量、狀態與單位 */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="stock" className="mb-2 block font-bold">
              庫存數量 <span className="text-red-600">*</span>
            </label>
            <Input
              id="stock"
              name="stock"
              type="number"
              step="1"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              placeholder="0"
            />
            <p className="mt-1 text-xs text-gray-600">可輸入負數 (欠貨/預購)</p>
            <ErrorInline message={state?.errors?.stock?.[0]} />
          </div>

          <div>
            <label htmlFor="stock_status" className="mb-2 block font-bold">
              庫存狀態
            </label>
            <select
              id="stock_status"
              name="stock_status"
              value={formData.stock_status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  stock_status: e.target.value as 'sufficient' | 'low' | 'out_of_stock',
                })
              }
              className="w-full rounded-none border-3 border-black px-4 py-2 font-bold shadow-neo-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="sufficient">充足</option>
              <option value="low">緊張</option>
              <option value="out_of_stock">缺貨</option>
            </select>
            <ErrorInline message={state?.errors?.stock_status?.[0]} />
          </div>

          <div>
            <label htmlFor="unit" className="mb-2 block font-bold">
              單位 <span className="text-red-600">*</span>
            </label>
            <Input
              id="unit"
              name="unit"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="件"
            />
            <ErrorInline message={state?.errors?.unit?.[0]} />
          </div>
        </div>

        {/* 狀態 (僅編輯時顯示) */}
        {mode === 'edit' && (
          <div>
            <label htmlFor="status" className="mb-2 block font-bold">
              狀態
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
              className="w-full rounded-none border-3 border-black px-4 py-2 font-bold shadow-neo-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="active">啟用</option>
              <option value="inactive">停用</option>
            </select>
            <p className="mt-1 text-xs text-gray-600">停用的商品不會顯示在前台</p>
            <ErrorInline message={state?.errors?.status?.[0]} />
          </div>
        )}

        {/* 商品圖片 (僅編輯時顯示) */}
        {mode === 'edit' && product && (
          <div>
            <label className="mb-2 block font-bold">商品圖片</label>
            <ImageUpload
              productId={product.id}
              currentImageUrl={product.image_url}
              onUploadSuccess={() => {
                router.refresh()
              }}
              onDeleteSuccess={() => {
                router.refresh()
              }}
            />
          </div>
        )}

        {/* 錯誤訊息 */}
        {(state?.message && !state.success) || submitError ? (
          <div className="rounded-none border-3 border-red-600 bg-red-50 p-4">
            <p className="font-bold text-red-800">{submitError || state?.message}</p>
          </div>
        ) : null}

        {/* 成功訊息 */}
        {(state?.success || submitSuccess) && (
          <div className="rounded-none border-3 border-green-600 bg-green-50 p-4">
            <p className="font-bold text-green-800">
              {submitSuccess ? '商品批次建立成功!' : state?.message}
            </p>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="flex gap-4">
          <Button type="submit" className="flex-1" disabled={isPending || isSubmitting}>
            {isPending || isSubmitting ? (
              <>
                <Loading size="sm" className="mr-2" />
                {isSubmitting ? '批次建立中...' : mode === 'create' ? '建立中...' : '儲存中...'}
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                {mode === 'create'
                  ? productNames.length > 1
                    ? `批次建立 ${productNames.filter(n => n.trim()).length} 個商品`
                    : '建立商品'
                  : '儲存變更'}
              </>
            )}
          </Button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="flex-1 rounded-none border-3 border-black bg-gray-100 px-6 py-3 font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="mr-2 inline-block h-5 w-5" />
            取消
          </button>
        </div>
      </form>
    </div>
  )
}
