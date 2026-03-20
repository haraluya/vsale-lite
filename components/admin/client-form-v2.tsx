'use client'

import { useState, useTransition } from 'react'
import { updateClientV2 } from '@/lib/actions/clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/ui/loading'
import type { Tier, Client } from '@/types'
import { useRouter } from 'next/navigation'
import { useAlert } from '@/lib/contexts/dialog-context'

type ClientFormV2Props = {
  client: Client
  tiers: Tier[]
}

/**
 * 客戶編輯表單 V2 (Feature 007)
 * 支援 address 與 admin_notes 欄位
 */
export function ClientFormV2({ client, tiers }: ClientFormV2Props) {
  const router = useRouter()
  const alert = useAlert()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    displayName: client.display_name || '',
    tierId: client.tier_id || '',
    address: client.address || '',
    adminNotes: client.admin_notes || '',
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await updateClientV2({
        clientId: client.id,
        displayName: formData.displayName,
        tierId: formData.tierId,
        address: formData.address || null,
        adminNotes: formData.adminNotes || null,
      })

      if (result.success) {
        await alert({
          title: '更新成功',
          message: result.message || '客戶更新成功',
          variant: 'success'
        })
        router.push('/admin/clients')
        router.refresh()
      } else {
        setError(result.message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="phone">手機號碼</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={client.phone}
          disabled
          className="mt-2 bg-surface-secondary"
        />
        <p className="mt-2 text-xs text-muted">手機號碼無法修改</p>
      </div>

      <div>
        <Label htmlFor="tier_id">會員等級 *</Label>
        <select
          id="tier_id"
          name="tier_id"
          value={formData.tierId}
          onChange={(e) => setFormData({ ...formData, tierId: e.target.value })}
          required
          className="input-neo mt-2"
        >
          <option value="">請選擇等級</option>
          {tiers.map((tier) => (
            <option key={tier.id} value={tier.id}>
              {tier.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="display_name">顯示名稱</Label>
        <Input
          id="display_name"
          name="display_name"
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          placeholder="例: 王小明、ABC商行"
          className="mt-2"
        />
      </div>

      {/* 🆕 Feature 007: 常用地址 */}
      <div className="bg-warning-bg p-4 rounded-theme-sm border-theme">
        <Label htmlFor="address">常用地址</Label>
        <Textarea
          id="address"
          name="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="例: 台北市信義區信義路五段7號"
          rows={3}
          className="mt-2 resize-none bg-warning-bg"
        />
        <p className="mt-1 text-xs text-gray-500">客戶端可見此欄位</p>
      </div>

      {/* 🆕 Feature 007: 管理員備註 */}
      <div className="bg-warning-bg p-4 rounded-theme-sm border-theme">
        <Label htmlFor="admin_notes">管理員備註</Label>
        <Textarea
          id="admin_notes"
          name="admin_notes"
          value={formData.adminNotes}
          onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
          placeholder="僅管理員可見的內部備註"
          rows={3}
          className="mt-2 resize-none bg-warning-bg"
        />
        <p className="mt-1 text-xs text-warning">
          ⚠️ 此欄位僅管理員可見,客戶端無法查詢
        </p>
      </div>

      {error && (
        <div className="rounded-theme-sm border-theme border-error bg-error-bg p-4">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending && <LoadingSpinner className="mr-2" />}
          {isPending ? '更新中...' : '更新客戶'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          取消
        </Button>
      </div>
    </form>
  )
}
