'use client'

import { useActionState } from 'react'
import { createCategory, updateCategory } from '@/lib/actions/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ErrorInline } from '@/components/ui/error'
import { LoadingSpinner } from '@/components/ui/loading'
import { Category, ActionResult } from '@/types'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

type CategoryFormProps = {
  category?: Category
  mode: 'create' | 'edit'
}

export function CategoryForm({ category, mode }: CategoryFormProps) {
  const router = useRouter()
  const isEdit = mode === 'edit'

  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    isEdit && category ? updateCategory.bind(null, category.id) : createCategory,
    null
  )

  useEffect(() => {
    if (state?.success) {
      alert(state.message)
      router.push('/admin/categories')
      router.refresh()
    }
  }, [state, router])

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <Label htmlFor="name">分類名稱 *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={category?.name}
          placeholder="例: 飲料、零食、日用品"
          required
          className="mt-2"
        />
        {state && 'errors' in state && state.errors?.name && (
          <p className="mt-2 text-sm text-red-500">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">分類描述</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={category?.description || ''}
          placeholder="選填:描述此分類的商品類型"
          rows={3}
          className="mt-2"
        />
        {state && 'errors' in state && state.errors?.description && (
          <p className="mt-2 text-sm text-red-500">{state.errors.description[0]}</p>
        )}
      </div>

      <div>
        <Label htmlFor="sort_order">排序數字 *</Label>
        <Input
          id="sort_order"
          name="sort_order"
          type="number"
          defaultValue={category?.sort_order ?? 0}
          placeholder="數字越小越優先顯示"
          required
          min="0"
          className="mt-2"
        />
        <p className="mt-1 text-sm text-gray-500">提示:數字越小的分類會優先顯示在前面</p>
        {state && 'errors' in state && state.errors?.sort_order && (
          <p className="mt-2 text-sm text-red-500">{state.errors.sort_order[0]}</p>
        )}
      </div>

      {state?.message && !state.success && (
        <ErrorInline message={state.message} />
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={pending}>
          {pending && <LoadingSpinner className="mr-2" />}
          {pending ? '儲存中...' : isEdit ? '更新分類' : '建立分類'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          取消
        </Button>
      </div>
    </form>
  )
}
