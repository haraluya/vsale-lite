'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ErrorInline } from '@/components/ui/error'
import { LoadingSpinner } from '@/components/ui/loading'
import type { ActionResult, AdminProfile } from '@/types'

interface MemberFormProps {
  admin?: AdminProfile // 編輯模式傳入現有資料
  onSubmit: (prevState: ActionResult | null, formData: FormData) => Promise<ActionResult>
  submitLabel?: string
}

export function MemberForm({
  admin,
  onSubmit,
  submitLabel = '儲存',
}: MemberFormProps) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    onSubmit,
    null
  )

  const isEditMode = !!admin

  return (
    <form action={formAction} className="space-y-6">
      {/* 帳號（僅新增模式顯示） */}
      {!isEditMode && (
        <div>
          <Label htmlFor="username">帳號 *</Label>
          <Input
            id="username"
            name="username"
            type="text"
            placeholder="3-20 字元，小寫字母+數字+底線"
            required
            className="mt-2"
          />
          {state && 'errors' in state && state.errors?.username && (
            <p className="mt-2 text-sm text-red-500">{state.errors.username[0]}</p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            帳號格式：3-20 字元，僅允許小寫字母、數字、底線
          </p>
        </div>
      )}

      {/* 密碼（僅新增模式顯示） */}
      {!isEditMode && (
        <div>
          <Label htmlFor="password">密碼 *</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="至少 6 字元"
            required
            className="mt-2"
          />
          {state && 'errors' in state && state.errors?.password && (
            <p className="mt-2 text-sm text-red-500">{state.errors.password[0]}</p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            密碼須至少 6 字元
          </p>
        </div>
      )}

      {/* 暱稱 */}
      <div>
        <Label htmlFor="display_name">暱稱（選填）</Label>
        <Input
          id="display_name"
          name="display_name"
          type="text"
          placeholder="如「小愛」、「小寶」"
          defaultValue={admin?.display_name || ''}
          className="mt-2"
        />
        {state && 'errors' in state && state.errors?.display_name && (
          <p className="mt-2 text-sm text-red-500">{state.errors.display_name[0]}</p>
        )}
        <p className="mt-2 text-xs text-gray-500">
          暱稱會顯示於訂單留言、操作日誌等客戶互動場景
        </p>
      </div>

      {/* 錯誤訊息 */}
      {state?.message && !state.success && (
        <ErrorInline message={state.message} />
      )}

      {/* 成功訊息 */}
      {state?.message && state.success && (
        <div className="rounded-theme-sm border-theme border-green-600 bg-green-50 p-4">
          <p className="text-sm font-bold text-green-800">{state.message}</p>
        </div>
      )}

      {/* 提交按鈕 */}
      <Button type="submit" disabled={pending} className="w-full">
        {pending && <LoadingSpinner className="mr-2" />}
        {pending ? '處理中...' : submitLabel}
      </Button>
    </form>
  )
}
