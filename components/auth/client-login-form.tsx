'use client'

import { useActionState, useState } from 'react'
import { loginWithPhone } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ErrorInline } from '@/components/ui/error'
import { LoadingSpinner } from '@/components/ui/loading'
import type { ActionResult } from '@/types'

export function ClientLoginForm() {
  const [phone, setPhone] = useState('')
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    loginWithPhone,
    null
  )

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <Label htmlFor="phone">手機號碼 *</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="0912345678"
          required
          className="mt-2"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        {state && 'errors' in state && state.errors?.phone && (
          <p className="mt-2 text-sm text-red-500">{state.errors.phone[0]}</p>
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
        {pending ? '登入中...' : '登入'}
      </Button>
    </form>
  )
}
