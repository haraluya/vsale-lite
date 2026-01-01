'use client'

/**
 * Product Form Component
 * Feature: 002-product-management
 */

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, X } from 'lucide-react'
import { createProduct, updateProduct } from '@/lib/actions/products'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorInline } from '@/components/ui/error-inline'
import type { Product, Category } from '@/types'

interface ProductFormProps {
  product?: Product
  categories: Category[]
  mode: 'create' | 'edit'
}

export function ProductForm({ product, categories, mode }: ProductFormProps) {
  const router = useRouter()

  const action = mode === 'create'
    ? createProduct
    : (prev: any, formData: FormData) => updateProduct(product!.id, prev, formData)

  const [state, formAction] = useActionState<any>(action as any, null)

  const handleCancel = () => {
    router.back()
  }

  return (
    <div className="mx-auto max-w-2xl rounded-none border-3 border-black bg-white p-8 shadow-neo">
      <form action={formAction} className="space-y-6">
        {/* 商品編號 */}
        <div>
          <label htmlFor="code" className="mb-2 block font-bold">
            商品編號 <span className="text-red-600">*</span>
          </label>
          <Input
            id="code"
            name="code"
            defaultValue={product?.code}
            placeholder="例如: DRINK-001"
            disabled={mode === 'edit'} // 編輯時禁用
            className={mode === 'edit' ? 'cursor-not-allowed bg-gray-100' : ''}
          />
          <p className="mt-1 text-xs text-gray-600">
            {mode === 'edit'
              ? '商品編號建立後不可修改'
              : '僅可包含英數字、連字號、底線 (例如: A001, DRINK-001)'}
          </p>
          <ErrorInline message={state?.errors?.code?.[0]} />
        </div>

        {/* 商品名稱 */}
        <div>
          <label htmlFor="name" className="mb-2 block font-bold">
            商品名稱 <span className="text-red-600">*</span>
          </label>
          <Input
            id="name"
            name="name"
            defaultValue={product?.name}
            placeholder="例如: 可口可樂 350ml"
          />
          <ErrorInline message={state?.errors?.name?.[0]} />
        </div>

        {/* 商品分類 */}
        <div>
          <label htmlFor="category_id" className="mb-2 block font-bold">
            商品分類 <span className="text-red-600">*</span>
          </label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={product?.category_id}
            className="w-full rounded-none border-3 border-black px-4 py-2 font-bold shadow-neo-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">請選擇分類</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <ErrorInline message={state?.errors?.category_id?.[0]} />
        </div>

        {/* 商品描述 */}
        <div>
          <label htmlFor="description" className="mb-2 block font-bold">
            商品描述 <span className="text-gray-500">(選填)</span>
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={product?.description || ''}
            placeholder="輸入商品描述..."
            rows={4}
            className="w-full rounded-none border-3 border-black px-4 py-2 font-bold shadow-neo-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <ErrorInline message={state?.errors?.description?.[0]} />
        </div>

        {/* 庫存與單位 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="stock" className="mb-2 block font-bold">
              庫存數量 <span className="text-red-600">*</span>
            </label>
            <Input
              id="stock"
              name="stock"
              type="number"
              defaultValue={product?.stock ?? 0}
              placeholder="0"
            />
            <p className="mt-1 text-xs text-gray-600">可輸入負數 (欠貨/預購)</p>
            <ErrorInline message={state?.errors?.stock?.[0]} />
          </div>

          <div>
            <label htmlFor="unit" className="mb-2 block font-bold">
              單位 <span className="text-red-600">*</span>
            </label>
            <Input id="unit" name="unit" defaultValue={product?.unit || '件'} placeholder="件" />
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
              defaultValue={product?.status}
              className="w-full rounded-none border-3 border-black px-4 py-2 font-bold shadow-neo-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="active">啟用</option>
              <option value="inactive">停用</option>
            </select>
            <p className="mt-1 text-xs text-gray-600">停用的商品不會顯示在前台</p>
            <ErrorInline message={state?.errors?.status?.[0]} />
          </div>
        )}

        {/* 錯誤訊息 */}
        {state?.message && !state.success && (
          <div className="rounded-none border-3 border-red-600 bg-red-50 p-4">
            <p className="font-bold text-red-800">{state.message}</p>
          </div>
        )}

        {/* 成功訊息 */}
        {state?.success && (
          <div className="rounded-none border-3 border-green-600 bg-green-50 p-4">
            <p className="font-bold text-green-800">{state.message}</p>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="flex gap-4">
          <Button type="submit" className="flex-1">
            <Save className="mr-2 h-5 w-5" />
            {mode === 'create' ? '建立商品' : '儲存變更'}
          </Button>

          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 rounded-none border-3 border-black bg-gray-100 px-6 py-3 font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo-sm"
          >
            <X className="mr-2 inline-block h-5 w-5" />
            取消
          </button>
        </div>
      </form>
    </div>
  )
}
