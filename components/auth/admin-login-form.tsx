'use client'

import { useActionState, useState } from 'react'
import { loginWithUsername } from '@/lib/actions/admins'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ErrorInline } from '@/components/ui/error'
import { LoadingSpinner } from '@/components/ui/loading'
import type { ActionResult } from '@/types'

export function AdminLoginForm() {
  const [username, setUsername] = useState('')
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (_prevState: ActionResult | null, formData: FormData) => {
      const username = formData.get('username') as string
      const password = formData.get('password') as string
      return await loginWithUsername({ username, password })
    },
    null
  )

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <Label htmlFor="username">帳號 *</Label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          placeholder="請輸入管理員帳號"
          required
          className="mt-2"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        {state && 'errors' in state && state.errors?.username && (
          <p className="mt-2 text-sm text-red-500">{state.errors.username[0]}</p>
        )}
      </div>

      <div>
        <Label htmlFor="password">密碼 *</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="請輸入密碼"
          required
          className="mt-2"
        />
        {state && 'errors' in state && state.errors?.password && (
          <p className="mt-2 text-sm text-red-500">{state.errors.password[0]}</p>
        )}
      </div>

      {state?.message && !state.success && (
        <ErrorInline message={state.message} />
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending && <LoadingSpinner className="mr-2" />}
        {pending ? '登入中...' : '登入後台'}
      </Button>
    </form>
  )
}
