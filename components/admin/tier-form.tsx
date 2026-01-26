'use client'

import { useActionState, useState } from 'react'
import { createTier, updateTier } from '@/lib/actions/tiers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ErrorInline } from '@/components/ui/error'
import { LoadingSpinner } from '@/components/ui/loading'
import { FormSection } from '@/components/ui/form-section'
import { Tier, ActionResult } from '@/types'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAlert } from '@/lib/contexts/dialog-context'

type TierFormProps = {
  tier?: Tier
  mode: 'create' | 'edit'
}

export function TierForm({ tier, mode }: TierFormProps) {
  const router = useRouter()
  const alert = useAlert()
  const isEdit = mode === 'edit'

  // Feature 011: 運費設定狀態
  const [chargeShipping, setChargeShipping] = useState(
    tier?.shipping_fee ? tier.shipping_fee > 0 : false
  )

  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    isEdit && tier ? updateTier.bind(null, tier.id) : createTier,
    null
  )

  useEffect(() => {
    if (state?.success) {
      alert({
        title: '操作成功',
        message: state.message || '會員等級已儲存',
        variant: 'success'
      }).then(() => {
        router.push('/admin/tiers')
        router.refresh()
      })
    }
  }, [state, router, alert])

  return (
    <form action={formAction} className="space-y-4">
      {/* 紫色基本資訊區塊 */}
      <FormSection variant="primary" title="等級資訊">
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
      </FormSection>

      {/* 隱藏的 rank 欄位，新增時會由 Server Action 自動設定，編輯時保持原值 */}
      {isEdit && tier && (
        <input type="hidden" name="rank" value={tier.rank} />
      )}

      {/* 藍色運費設定區塊 */}
      <FormSection
        variant="info"
        title="運費設定"
        description="設定此等級客戶的運費計算方式"
      >

        <div className="space-y-4">
          <Checkbox
            id="charge_shipping"
            label="收取運費"
            checked={chargeShipping}
            onChange={(e) => setChargeShipping(e.target.checked)}
          />

          {chargeShipping && (
            <div className="ml-6 space-y-4 border-l-2 border-gray-300 pl-4">
              <div>
                <Label htmlFor="shipping_fee">基本運費 (元) *</Label>
                <Input
                  id="shipping_fee"
                  name="shipping_fee"
                  type="number"
                  defaultValue={tier?.shipping_fee || 0}
                  placeholder="例: 100"
                  required={chargeShipping}
                  min="0"
                  step="1"
                  className="mt-2"
                />
                {state && 'errors' in state && state.errors?.shipping_fee && (
                  <p className="mt-2 text-sm text-red-500">{state.errors.shipping_fee[0]}</p>
                )}
                <p className="mt-1 text-xs text-gray-600">
                  設定為 0 表示不收運費
                </p>
              </div>

              <div>
                <Label htmlFor="free_shipping_threshold">滿額免運門檻 (元)</Label>
                <Input
                  id="free_shipping_threshold"
                  name="free_shipping_threshold"
                  type="number"
                  defaultValue={tier?.free_shipping_threshold || ''}
                  placeholder="例: 1000 (留空表示不提供免運)"
                  min="1"
                  step="1"
                  className="mt-2"
                />
                {state && 'errors' in state && state.errors?.free_shipping_threshold && (
                  <p className="mt-2 text-sm text-red-500">{state.errors.free_shipping_threshold[0]}</p>
                )}
                <p className="mt-1 text-xs text-gray-600">
                  留空表示不提供滿額免運優惠
                </p>
              </div>
            </div>
          )}

          {!chargeShipping && (
            <input type="hidden" name="shipping_fee" value="0" />
          )}
        </div>
      </FormSection>

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
