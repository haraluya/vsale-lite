'use client'

import { useActionState, useState } from 'react'
import { createClient, updateClient } from '@/lib/actions/clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ErrorInline } from '@/components/ui/error'
import { LoadingSpinner } from '@/components/ui/loading'
import { Tier, Client, ActionResult } from '@/types'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Copy, Check } from 'lucide-react'

type ClientFormProps = {
  client?: Client
  tiers: Tier[]
  mode: 'create' | 'edit'
}

export function ClientForm({ client, tiers, mode }: ClientFormProps) {
  const router = useRouter()
  const isEdit = mode === 'edit'
  const [copied, setCopied] = useState(false)

  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string; password?: string; phone?: string }> | null,
    FormData
  >(isEdit && client ? updateClient.bind(null, client.id) : createClient, null)

  useEffect(() => {
    if (state?.success && !state.data?.password) {
      alert(state.message)
      router.push('/admin/clients')
      router.refresh()
    }
  }, [state, router])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 如果剛建立成功,顯示密碼複製介面
  if (state?.success && state.data?.password) {
    const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'
    const phone = state.data.phone || ''
    const password = state.data.password

    // 完整的登入指引文字
    const fullGuide = `【Vsale 訂貨系統 - 登入資訊】

前台網址: ${loginUrl}
登入電話: ${phone}
登入密碼: ${password}

請使用以上資訊登入系統進行下單。`

    const handleCopyGuide = () => {
      navigator.clipboard.writeText(fullGuide)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

    return (
      <div className="space-y-6">
        <div className="rounded-none border-3 border-green-500 bg-green-50 p-6">
          <h3 className="text-lg font-bold text-green-700 mb-4">
            ✅ 客戶建立成功!
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                請將以下登入資訊提供給客戶:
              </p>
              <div className="bg-white border-2 border-green-500 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">前台網址:</span>
                  <a
                    href={loginUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline font-mono"
                  >
                    {loginUrl}
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">登入電話:</span>
                  <code className="font-mono font-bold text-lg">
                    {phone}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">登入密碼:</span>
                  <code className="font-mono font-bold text-lg text-green-700">
                    {password}
                  </code>
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleCopyGuide}
              className="w-full"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  已複製完整登入指引!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  複製完整登入指引 (含網址、電話、密碼)
                </>
              )}
            </Button>

            <p className="text-xs text-gray-600">
              ⚠️ 此密碼僅顯示一次,請務必記錄或立即提供給客戶
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <Button onClick={() => window.location.href = '/admin/clients/new'}>
            繼續建立客戶
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push('/admin/clients')}
          >
            返回客戶列表 (查看客戶列表)
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <Label htmlFor="phone">手機號碼 *</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={client?.phone}
          placeholder="0912345678"
          required
          disabled={isEdit}
          className="mt-2"
        />
        {isEdit && (
          <p className="mt-2 text-xs text-gray-500">手機號碼無法修改</p>
        )}
        {state && 'errors' in state && state.errors?.phone && (
          <p className="mt-2 text-sm text-red-500">{state.errors.phone[0]}</p>
        )}
      </div>

      <div>
        <Label htmlFor="tier_id">會員等級 *</Label>
        <select
          id="tier_id"
          name="tier_id"
          defaultValue={client?.tier_id || ''}
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
        {state && 'errors' in state && state.errors?.tier_id && (
          <p className="mt-2 text-sm text-red-500">{state.errors.tier_id[0]}</p>
        )}
      </div>

      <div>
        <Label htmlFor="display_name">顯示名稱</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={client?.display_name || ''}
          placeholder="例: 王小明、ABC商行"
          className="mt-2"
        />
        {state && 'errors' in state && state.errors?.display_name && (
          <p className="mt-2 text-sm text-red-500">
            {state.errors.display_name[0]}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="notes">備註</Label>
        <textarea
          id="notes"
          name="notes"
          defaultValue={client?.notes || ''}
          placeholder="內部備註事項"
          rows={3}
          className="input-neo mt-2 resize-none"
        />
        {state && 'errors' in state && state.errors?.notes && (
          <p className="mt-2 text-sm text-red-500">{state.errors.notes[0]}</p>
        )}
      </div>

      {state?.message && !state.success && (
        <ErrorInline message={state.message} />
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={pending}>
          {pending && <LoadingSpinner className="mr-2" />}
          {pending
            ? isEdit
              ? '更新中...'
              : '建立中...'
            : isEdit
            ? '更新客戶'
            : '建立客戶'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          取消
        </Button>
      </div>
    </form>
  )
}
