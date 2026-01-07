'use client'

import { useActionState, useEffect } from 'react'
import { updateClientPassword } from '@/lib/actions/clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ErrorInline } from '@/components/ui/error'
import { LoadingSpinner } from '@/components/ui/loading'
import { ActionResult } from '@/types'
import { useRouter } from 'next/navigation'
import { useAlert } from '@/lib/contexts/dialog-context'

type UpdatePasswordFormProps = {
  clientId: string
  clientName: string
}

export function UpdatePasswordForm({ clientId, clientName }: UpdatePasswordFormProps) {
  const router = useRouter()
  const alert = useAlert()

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updateClientPassword.bind(null, clientId),
    null
  )

  useEffect(() => {
    if (state?.success) {
      alert({
        title: '更新成功',
        message: state.message || '密碼已更新',
        variant: 'success'
      }).then(() => {
        router.push('/admin/clients')
        router.refresh()
      })
    }
  }, [state, router, alert])

  return (
    <form action={formAction} className="space-y-6">
      <div className="bg-yellow-50 border-3 border-yellow-500 p-4 rounded-none">
        <p className="text-sm font-medium text-yellow-800">
          ⚠️ 正在為「{clientName}」修改密碼
        </p>
      </div>

      <div>
        <Label htmlFor="newPassword">新密碼 *</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          placeholder="至少 6 個字元"
          required
          className="mt-2"
          autoComplete="new-password"
        />
        {state && 'errors' in state && state.errors?.newPassword && (
          <p className="mt-2 text-sm text-red-500">{state.errors.newPassword[0]}</p>
        )}
      </div>

      <div>
        <Label htmlFor="confirmPassword">確認新密碼 *</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="再次輸入新密碼"
          required
          className="mt-2"
          autoComplete="new-password"
        />
        {state && 'errors' in state && state.errors?.confirmPassword && (
          <p className="mt-2 text-sm text-red-500">{state.errors.confirmPassword[0]}</p>
        )}
      </div>

      {state?.message && !state.success && (
        <ErrorInline message={state.message} />
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={pending}>
          {pending && <LoadingSpinner className="mr-2" />}
          {pending ? '更新中...' : '更新密碼'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          取消
        </Button>
      </div>
    </form>
  )
}
