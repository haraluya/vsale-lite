'use client'

import { useActionState, useState, useEffect } from 'react'
import { createClient, updateClient } from '@/lib/actions/clients'
import { getSetting } from '@/lib/actions/system'
import { removeWwwFromUrl } from '@/lib/utils/template-helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ErrorInline } from '@/components/ui/error'
import { LoadingSpinner } from '@/components/ui/loading'
import { FormSection } from '@/components/ui/form-section'
import { Tier, Client, ActionResult } from '@/types'
import { useRouter } from 'next/navigation'
import { Copy, Check } from 'lucide-react'
import { useAlert } from '@/lib/contexts/dialog-context'
import { useNotificationTemplate } from '@/lib/hooks/use-notification-template'

type ClientFormProps = {
  client?: Client
  tiers: Tier[]
  mode: 'create' | 'edit'
}

export function ClientForm({ client, tiers, mode }: ClientFormProps) {
  const router = useRouter()
  const alert = useAlert()
  const isEdit = mode === 'edit'
  const [copied, setCopied] = useState(false)
  const [companyName, setCompanyName] = useState('您的公司名稱')

  // 使用範本選擇 Hook
  const {
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    loading: templateLoading,
    copyToClipboard,
    previewTemplate,
  } = useNotificationTemplate()

  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string; password?: string; phone?: string; display_name?: string }> | null,
    FormData
  >(isEdit && client ? updateClient.bind(null, client.id) : createClient, null)

  // 載入公司名稱
  useEffect(() => {
    const loadSettings = async () => {
      const companyNameResult = await getSetting('company_name')
      if (companyNameResult.success && companyNameResult.data) {
        setCompanyName(companyNameResult.data)
      }
    }
    loadSettings()
  }, [])

  useEffect(() => {
    const handleSuccess = async () => {
      if (state?.success && !state.data?.password) {
        await alert({
          title: '操作成功',
          message: state.message || '客戶更新成功',
          variant: 'success'
        })
        router.push('/admin/clients')
        router.refresh()
      }
    }
    handleSuccess()
  }, [state, router, alert])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 如果剛建立成功,顯示密碼複製介面
  if (state?.success && state.data?.password) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '/'
    const loginUrl = removeWwwFromUrl(`${baseUrl}/login`)
    const phone = state.data.phone || ''
    const password = state.data.password
    const displayName = state.data.display_name || '客戶'

    // 使用選中的範本預覽
    const fullGuide = previewTemplate({
      companyName,
      clientName: displayName,
      loginUrl,
      phone,
      password,
    })

    const handleCopyGuide = async () => {
      const success = await copyToClipboard({
        companyName,
        clientName: displayName,
        loginUrl,
        phone,
        password,
      })
      if (success) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }

    return (
      <div className="space-y-6">
        <div className="rounded-none border-2 md:border-3 border-green-500 bg-green-50 p-6">
          <h3 className="text-lg font-bold text-green-700 mb-4">
            ✅ 客戶建立成功!
          </h3>
          <div className="space-y-4">
            {/* 範本選擇器 */}
            {templates.length > 0 && (
              <div>
                <Label htmlFor="template-select" className="text-sm font-medium text-gray-700 mb-2">
                  選擇通知範本
                </Label>
                <select
                  id="template-select"
                  value={selectedTemplateId || ''}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full rounded-none border-2 border-black px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  disabled={templateLoading}
                >
                  {templates.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name} {tmpl.is_default ? '(預設)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                請將以下登入資訊提供給客戶:
              </p>
              <div className="bg-white border-2 border-green-500 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">客戶名稱:</span>
                  <span className="font-bold text-lg">
                    {displayName}
                  </span>
                </div>
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
                  已複製登入資訊!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  複製登入資訊
                </>
              )}
            </Button>

            <p className="text-xs text-gray-600">
              ⚠️ 此密碼僅顯示一次,請務必記錄或立即提供給客戶
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              console.log('繼續建立客戶按鈕被點擊')
              window.location.reload()
            }}
          >
            繼續建立客戶
          </Button>
          <Button
            type="button"
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
    <form action={formAction} className="space-y-4">
      {/* 紫色基本資訊區塊 */}
      <FormSection variant="primary" title="基本資訊">
        {/* 雙欄：手機號碼 + 會員等級 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
        </div>

        {/* 單欄：顯示名稱 */}
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
      </FormSection>

      {/* 藍色地址資訊區塊 */}
      <FormSection
        variant="info"
        title="常用地址"
        description="此地址將顯示在客戶訂單頁面，方便快速填寫"
      >
        <textarea
          id="address"
          name="address"
          defaultValue={client?.address || ''}
          placeholder="例: 台北市信義區信義路五段7號"
          rows={3}
          className="input-neo resize-none w-full"
        />
        {state && 'errors' in state && state.errors?.address && (
          <p className="mt-2 text-sm text-red-500">{state.errors.address[0]}</p>
        )}
      </FormSection>

      {/* 黃色管理員備註區塊 */}
      <FormSection
        variant="warning"
        title="管理員備註"
        description="⚠️ 此欄位僅管理員可見，客戶端無法查詢"
      >
        <textarea
          id="admin_notes"
          name="admin_notes"
          defaultValue={client?.admin_notes || ''}
          placeholder="僅管理員可見的內部備註"
          rows={3}
          className="input-neo resize-none w-full"
        />
        {state && 'errors' in state && state.errors?.admin_notes && (
          <p className="mt-2 text-sm text-red-500">{state.errors.admin_notes[0]}</p>
        )}
      </FormSection>

      {/* 錯誤訊息 */}
      {state?.message && !state.success && (
        <ErrorInline message={state.message} />
      )}

      {/* 操作按鈕 */}
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
