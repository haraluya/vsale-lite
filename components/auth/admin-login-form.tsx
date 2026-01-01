'use client'

import { useActionState } from 'react'
import { loginWithEmail } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ActionResult } from '@/types'

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    loginWithEmail,
    null
  )

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="admin@example.com"
          required
          className="mt-2"
        />
        {state && 'errors' in state && state.errors?.email && (
          <p className="mt-2 text-sm text-red-500">{state.errors.email[0]}</p>
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
        <div className="rounded-none border-3 border-red-500 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-500">{state.message}</p>
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? '登入中...' : '登入後台'}
      </Button>
    </form>
  )
}
