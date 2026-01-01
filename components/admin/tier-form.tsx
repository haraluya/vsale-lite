'use client'

import { useActionState } from 'react'
import { createTier, updateTier } from '@/lib/actions/tiers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tier } from '@/types'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

type TierFormProps = {
  tier?: Tier
  mode: 'create' | 'edit'
}

export function TierForm({ tier, mode }: TierFormProps) {
  const router = useRouter()
  const isEdit = mode === 'edit'

  const action = isEdit && tier ? updateTier.bind(null, tier.id) : createTier
  const [state, formAction, pending] = useActionState(action, null)

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
        {state?.errors?.name && (
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
        {state?.errors?.rank && (
          <p className="mt-2 text-sm text-red-500">{state.errors.rank[0]}</p>
        )}
      </div>

      {state?.message && !state.success && (
        <div className="rounded-none border-3 border-red-500 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-500">{state.message}</p>
        </div>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={pending}>
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
