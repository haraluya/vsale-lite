'use client'

import { useActionState } from 'react'
import { createTier, updateTier } from '@/lib/actions/tiers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ErrorInline } from '@/components/ui/error'
import { LoadingSpinner } from '@/components/ui/loading'
import { Tier, ActionResult } from '@/types'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

type TierFormProps = {
  tier?: Tier
  mode: 'create' | 'edit'
}

export function TierForm({ tier, mode }: TierFormProps) {
  const router = useRouter()
  const isEdit = mode === 'edit'

  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    isEdit && tier ? updateTier.bind(null, tier.id) : createTier,
    null
  )

  useEffect(() => {
    if (state?.success) {
      alert(state.message)
      router.push('/admin/tiers')
      router.refresh()
    }
  }, [state, router])

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <Label htmlFor="name">等級名稱 *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={tier?.name}
          placeholder="例: 零售、批發、經銷商"
          required
          className="mt-2"
        />
        {state && 'errors' in state && state.errors?.name && (
          <p className="mt-2 text-sm text-red-500">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <Label htmlFor="rank">排序數字 *</Label>
        <Input
          id="rank"
          name="rank"
          type="number"
          defaultValue={tier?.rank}
          placeholder="數字越小越優先顯示"
          required
          min="1"
          className="mt-2"
        />
        {state && 'errors' in state && state.errors?.rank && (
          <p className="mt-2 text-sm text-red-500">{state.errors.rank[0]}</p>
        )}
      </div>

      {state?.message && !state.success && (
        <ErrorInline message={state.message} />
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={pending}>
          {pending && <LoadingSpinner className="mr-2" />}
          {pending ? '儲存中...' : isEdit ? '更新等級' : '建立等級'}
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
