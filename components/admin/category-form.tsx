'use client'

import { useActionState, useState, useEffect } from 'react'
import { createCategory, updateCategory } from '@/lib/actions/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ErrorInline } from '@/components/ui/error'
import { LoadingSpinner } from '@/components/ui/loading'
import { FormSection } from '@/components/ui/form-section'
import { Category, ActionResult } from '@/types'
import { useRouter } from 'next/navigation'
import { useAlert } from '@/lib/contexts/dialog-context'

type CategoryFormProps = {
  category?: Category
  mode: 'create' | 'edit'
}

export function CategoryForm({ category, mode }: CategoryFormProps) {
  const router = useRouter()
  const alert = useAlert()
  const isEdit = mode === 'edit'

  // 使用受控元件來保留使用者輸入
  const [formData, setFormData] = useState({
    name: category?.name || '',
    code: category?.code || '',
    description: category?.description || '',
  })

  const action = isEdit && category
    ? (prev: any, formData: FormData) => updateCategory(category.id, prev, formData)
    : createCategory

  const [state, formAction, pending] = useActionState<any>(action as any, null)

  useEffect(() => {
    const handleSuccess = async () => {
      if (state?.success) {
        await alert({
          title: '操作成功',
          message: state.message || '分類操作成功',
          variant: 'success'
        })
        router.push('/admin/categories')
        router.refresh()
      }
    }
    handleSuccess()
  }, [state, router, alert])

  return (
    <form action={formAction} className="space-y-4">
      {/* 紫色基本資訊區塊 */}
      <FormSection variant="primary" title="分類資訊">
        <div className="mb-4">
          <Label htmlFor="name">分類名稱 *</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="例: 飲料、零食、日用品"
            required
            className="mt-2"
          />
          {state && 'errors' in state && state.errors?.name && (
            <p className="mt-2 text-sm text-error">{state.errors.name[0]}</p>
          )}
        </div>

        <div className="mb-4">
          <Label htmlFor="code">分類代碼 *</Label>
          <Input
            id="code"
            name="code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="例: DRK (3-10個大寫英文字母)"
            required
            pattern="[A-Z]{3,10}"
            maxLength={10}
            className="mt-2"
          />
          <p className="mt-1 text-sm text-muted">提示: 商品編號會使用此代碼 (如 DRK-0001)</p>
          {state && 'errors' in state && state.errors?.code && (
            <p className="mt-2 text-sm text-error">{state.errors.code[0]}</p>
          )}
        </div>

        <div>
          <Label htmlFor="description">分類描述</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="選填:描述此分類的商品類型"
            rows={3}
            className="mt-2"
          />
          {state && 'errors' in state && state.errors?.description && (
            <p className="mt-2 text-sm text-error">{state.errors.description[0]}</p>
          )}
        </div>
      </FormSection>

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
